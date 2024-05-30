import { $, adapter, type Client, type Executor } from "edgedb";
import { type CommandOptions } from "./commandutil";
import { headerComment } from "./genutil";
import type { Target } from "./genutil";

// generate per-file queries
// generate queries in a single file
// generate per-file queries, then listen for changes and update
export async function generateQueryFiles(params: {
  root: string | null;
  options: CommandOptions;
  client: Client;
  schemaDir: string;
}) {
  if (params.options.file && params.options.watch) {
    throw new Error(`Using --watch and --file mode simultaneously is not
currently supported.`);
  }

  const noRoot = !params.root;
  const root = params.root ?? adapter.process.cwd();
  if (noRoot) {
    console.warn(
      `No \`edgedb.toml\` found, using process.cwd() as root directory:
   ${params.root}
`,
    );
  } else {
    console.log(`Detected project root via edgedb.toml:`);
    console.log("   " + params.root);
  }

  const { client } = params;

  // file mode: introspect all queries and generate one file
  // generate one query per file

  console.log(`Detected schema directory: ${params.schemaDir}`);
  const matches = await getMatches(root, params.schemaDir);
  if (matches.length === 0) {
    console.log(`No .edgeql files found outside of ${params.schemaDir}`);
    return;
  }

  console.log(`Connecting to database...`);
  await client.ensureConnected();

  console.log(`Analyzing .edgeql files...`);

  // generate all queries in single file
  if (params.options.file) {
    const filesByExtension: {
      [k: string]: ReturnType<typeof generateFiles>[number];
    } = {};
    let wasError = false;
    await Promise.all(
      matches.map(async (path) => {
        const prettyPath = "./" + adapter.path.posix.relative(root, path);

        try {
          const query = await adapter.readFileUtf8(path);
          const types = await $.analyzeQuery(client, query);
          console.log(`   ${prettyPath}`);
          const files = generateFiles({
            target: params.options.target!,
            path,
            types,
          });
          for (const f of files) {
            if (!filesByExtension[f.extension]) {
              filesByExtension[f.extension] = f;
            } else {
              filesByExtension[f.extension].contents += `\n\n` + f.contents;
              filesByExtension[f.extension].imports = filesByExtension[
                f.extension
              ].imports.merge(f.imports);
            }
          }
        } catch (err) {
          wasError = true;
          console.log(
            `Error in file '${prettyPath}': ${(err as Error).toString()}`,
          );
        }
      }),
    );
    if (!wasError) {
      console.log(
        `Generating query file${
          Object.keys(filesByExtension).length > 1 ? "s" : ""
        }...`,
      );
      for (const [extension, file] of Object.entries(filesByExtension)) {
        const filePath =
          (adapter.path.isAbsolute(params.options.file)
            ? params.options.file
            : adapter.path.join(adapter.process.cwd(), params.options.file)) +
          extension;
        const prettyPath = adapter.path.isAbsolute(params.options.file)
          ? filePath
          : `./${adapter.path.posix.relative(root, filePath)}`;
        console.log(`   ${prettyPath}`);
        await adapter.fs.writeFile(
          filePath,
          headerComment +
            `${stringifyImports(file.imports)}\n\n${file.contents}`,
        );
      }
    }
    return;
  }

  async function generateFilesForQuery(path: string) {
    try {
      const query = await adapter.readFileUtf8(path);
      if (!query) return;
      const types = await $.analyzeQuery(client, query);
      const files = generateFiles({
        target: params.options.target!,
        path,
        types,
      });
      for (const f of files) {
        const prettyPath = "./" + adapter.path.posix.relative(root, f.path);
        console.log(`   ${prettyPath}`);
        await adapter.fs.writeFile(
          f.path,
          headerComment + `${stringifyImports(f.imports)}\n\n${f.contents}`,
        );
      }
    } catch (err) {
      console.log(
        `Error in file './${adapter.path.posix.relative(root, path)}': ${(
          err as any
        ).toString()}`,
      );
    }
  }

  // generate per-query files
  console.log(`Generating files for following queries:`);
  await Promise.all(matches.map(generateFilesForQuery));

  // find all *.edgeql files
  // for query in queries:
  //   generate output file
}

export function stringifyImports(imports: ImportMap) {
  return [...imports]
    .map(
      ([module, specifiers]) =>
        `import type {${[...specifiers].join(", ")}} from "${module}";`,
    )
    .join("\n");
}

async function getMatches(root: string, schemaDir: string) {
  return adapter.walk(root, {
    match: [/[^/]\.edgeql$/],
    skip: [
      /node_modules/,
      RegExp(`${schemaDir}\\${adapter.path.sep}migrations`),
      RegExp(`${schemaDir}\\${adapter.path.sep}fixups`),
    ],
  });
}

// const targetToExtension: {[k in Target]: string} = {
//   cjs: ".js",
//   deno: ".ts",
//   esm: ".mjs",
//   mts: ".mts",
//   ts: `.ts`
// };

type QueryType = Awaited<ReturnType<(typeof $)["analyzeQuery"]>>;

export function generateFiles(params: {
  target: Target;
  path: string;
  types: Omit<QueryType, "imports" | "importMap"> &
    Partial<Pick<QueryType, "imports" | "importMap">>;
}): {
  path: string;
  contents: string;
  imports: ImportMap;
  extension: string;
}[] {
  const queryFileName = adapter.path.basename(params.path);
  const baseFileName = queryFileName.replace(/\.edgeql$/, "");
  const outputDirname = adapter.path.dirname(params.path);
  const outputBaseFileName = adapter.path.join(
    outputDirname,
    `${baseFileName}.query`,
  );

  const method = cardinalityToExecutorMethod[params.types.cardinality];
  if (!method) {
    const validCardinalities = Object.values($.Cardinality);
    throw new Error(
      `Invalid cardinality: ${
        params.types.cardinality
      }. Expected one of ${validCardinalities.join(", ")}.`,
    );
  }
  const functionName = baseFileName
    .replace(/-[A-Za-z]/g, (m) => m[1].toUpperCase())
    .replace(/^[^A-Za-z_]|\W/g, "_");
  const interfaceName =
    functionName.charAt(0).toUpperCase() + functionName.slice(1);
  const argsInterfaceName = `${interfaceName}Args`;
  const returnsInterfaceName = `${interfaceName}Returns`;
  const hasArgs = params.types.args && params.types.args !== "null";
  const queryDefs = `\
${hasArgs ? `export type ${argsInterfaceName} = ${params.types.args};\n` : ""}
export type ${returnsInterfaceName} = ${params.types.result};\
`;
  const functionBody = `\
${params.types.query.trim().replace(/\\/g, "\\\\").replace(/`/g, "\\`")}\`${
    hasArgs ? `, args` : ""
  });
`;

  const tsImports =
    params.types.importMap ??
    new ImportMap(
      params.types.imports ? [["edgedb", params.types.imports]] : [],
    );
  tsImports.add("edgedb", "Executor");

  const tsImpl = `${queryDefs}

export function ${functionName}(client: Executor${
    hasArgs ? `, args: ${argsInterfaceName}` : ""
  }): Promise<${returnsInterfaceName}> {
  return client.${method}(\`\\
${functionBody}
}
`;

  const denoImpl = `
${tsImpl}`;

  const jsImpl = `async function ${functionName}(client${
    hasArgs ? `, args` : ""
  }) {
  return client.${method}(\`\\
${functionBody}
}`;

  const dtsImpl = `${queryDefs}

export function ${functionName}(client: Executor${
    hasArgs ? `, args: ${argsInterfaceName}` : ""
  }): Promise<${returnsInterfaceName}>;`;

  switch (params.target) {
    case "cjs":
      return [
        {
          path: `${outputBaseFileName}.js`,
          contents: `${jsImpl}\n\nmodule.exports.${functionName} = ${functionName};`,
          imports: new ImportMap(),
          extension: ".js",
        },
        {
          path: `${outputBaseFileName}.d.ts`,
          contents: dtsImpl,
          imports: tsImports,
          extension: ".d.ts",
        },
      ];

    case "deno":
      return [
        {
          path: `${outputBaseFileName}.ts`,
          contents: denoImpl,
          imports: tsImports,
          extension: ".ts",
        },
      ];
    case "esm":
      return [
        {
          path: `${outputBaseFileName}.mjs`,
          contents: `export ${jsImpl}`,
          imports: new ImportMap(),
          extension: ".mjs",
        },
        {
          path: `${outputBaseFileName}.d.ts`,
          contents: dtsImpl,
          imports: tsImports,
          extension: ".d.ts",
        },
      ];
    case "mts":
      return [
        {
          path: `${outputBaseFileName}.mts`,
          contents: tsImpl,
          imports: tsImports,
          extension: ".mts",
        },
      ];
    case "ts":
      return [
        {
          path: `${outputBaseFileName}.ts`,
          contents: tsImpl,
          imports: tsImports,
          extension: ".ts",
        },
      ];
  }
}

export const cardinalityToExecutorMethod = {
  One: "queryRequiredSingle",
  AtMostOne: "querySingle",
  Many: "query",
  AtLeastOne: "query",
  Empty: "query",
} satisfies Record<`${$.Cardinality}`, keyof Executor>;

export class ImportMap extends Map<string, Set<string>> {
  add(module: string, specifier: string) {
    if (!this.has(module)) {
      this.set(module, new Set());
    }
    this.get(module)!.add(specifier);
    return this;
  }

  merge(map: ImportMap) {
    const out = new ImportMap();
    for (const [mod, specifiers] of [...this, ...map]) {
      for (const specifier of specifiers) {
        out.add(mod, specifier);
      }
    }
    return out;
  }
}
