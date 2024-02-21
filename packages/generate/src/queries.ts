import { $, adapter, type Client } from "edgedb";
import { Cardinality } from "edgedb/dist/ifaces";
import { type CommandOptions } from "./commandutil";
import { headerComment } from "./genutil";
import { type Target, camelify } from "./genutil";

function formatError(path: string, err: any){
  const message = `Error in file '${path}': ${err.toString()}`
  return `\x1b[31m${message}\x1b[0m`;
}

// generate per-file queries
// generate queries in a single file
// generate per-file queries, then listen for changes and update
export async function generateQueryFiles(params: {
  root: string | null;
  options: CommandOptions;
  client: Client;
  schemaDir: string;
}) {
  const t0 = performance.now()
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
`
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

  const errs:string[] = [];
  function printSummary(){
    const passedCount = matches.length - errs.length
    const summary = `\n\x1b[${errs.length > 0 ? '1;31m' : '1;32m'}${passedCount}/${matches.length} queries passed${errs.length ? ', '+errs.length+' failed'  : '!'}`
    console.log(summary + '\n')
    for (const err of errs) {
        console.log('\x1b[22m' + err)
    }
    if(errs.length > 1) console.log(summary)
    const t1Pretty = ((performance.now()-t0)/1000).toFixed(2)
    console.log(`\x1b[1;33mCompleted in: ${t1Pretty}s\x1b[0m\n`)
  }

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
              filesByExtension[f.extension].imports = {
                ...filesByExtension[f.extension].imports,
                ...f.imports,
              };
            }
          }
        } catch (err) {
          wasError = true;
          errs.push(formatError(prettyPath, err));
        }
      })
    );
    if (!wasError) {
      console.log(
        `Generating query file${
          Object.keys(filesByExtension).length > 1 ? "s" : ""
        }...`
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
            `${stringifyImports(file.imports)}\n\n${file.contents}`
        );
      }
    }
    printSummary();
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
          headerComment + `${stringifyImports(f.imports)}\n\n${f.contents}`
        );
      }
    } catch (err) {
      errs.push(
        formatErrors(
          './' + adapter.path.posix.relative(root, path),
          err
        )
      );
    }
  }

  // generate per-query files
  console.log(`Generating files for following queries:`);
  await Promise.all(matches.map(generateFilesForQuery));

  // find all *.edgeql files
  // for query in queries:
  //   generate output file

  printSummary();
}

export function stringifyImports(imports: { [k: string]: boolean }) {
  if (Object.keys(imports).length === 0) return "";
  return `import type {${Object.keys(imports).join(", ")}} from "edgedb";`;
}

async function getMatches(root: string, schemaDir: string) {
  return adapter.walk(root, {
    match: [/[^\/]\.edgeql$/],
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
  types: QueryType;
}): {
  path: string;
  contents: string;
  imports: { [k: string]: boolean };
  extension: string;
}[] {
  const queryFileName = adapter.path.basename(params.path);
  const baseFileName = queryFileName.replace(/\.edgeql$/, "");
  const outputDirname = adapter.path.dirname(params.path);
  const outputBaseFileName = adapter.path.join(
    outputDirname,
    `${baseFileName}.query`
  );

  const method =
    params.types.cardinality === Cardinality.ONE
      ? "queryRequiredSingle"
      : params.types.cardinality === Cardinality.AT_MOST_ONE
      ? "querySingle"
      : "query";
  const functionName = camelify(baseFileName);
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
${params.types.query.trim().replace(/`/g, "\\`")}\`${hasArgs ? `, args` : ""});
`;
  const imports: any = {};
  for (const i of params.types.imports) {
    imports[i] = true;
  }
  const tsImports = { Executor: true, ...imports };

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
          imports: {},
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
          imports: {},
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
