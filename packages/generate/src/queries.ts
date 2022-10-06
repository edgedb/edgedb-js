// tslint:disable
import {createClient, adapter} from "edgedb";
import type {ConnectConfig} from "edgedb/dist/conUtils";
import type {CommandOptions} from "./commandutil";
import {generateQueryType} from "./codecToType";
import type {QueryType} from "./codecToType";
import type {Target} from "./generate";
import {Cardinality} from "edgedb/dist/ifaces";

// generate per-file queries
// generate queries in a single file
// generate per-file queries, then listen for changes and update
export async function generateQueryFiles(params: {
  root: string | null;
  options: CommandOptions;
  connectionConfig: ConnectConfig;
}) {
  if (params.options.file && params.options.watch) {
    throw new Error(`Using --watch and --file mode simultaneously is not
currently supported.`);
  }

  // console.log(`Detecting project root...`);

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
  const client = createClient({
    ...params.connectionConfig,
    concurrency: 5
  });

  // file mode: introspect all queries and generate one file
  // generate one query per file

  const matches = await getMatches(root);

  console.log(`Connecting to database...`);
  await client.ensureConnected();

  console.log(`Searching for .edgeql files...`);

  // generate all queries in single file
  if (params.options.file) {
    const filesByExtension: {
      [k: string]: ReturnType<typeof generateFiles>[number];
    } = {};
    for (const path of matches) {
      const prettyPath = "./" + adapter.path.posix.relative(root, path);
      console.log(`   ${prettyPath}`);
      const query = await adapter.readFileUtf8(path);
      const types = await generateQueryType(client, query);
      const files = await generateFiles({
        target: params.options.target!,
        path,
        types
      });
      for (const f of files) {
        if (!filesByExtension[f.extension]) {
          filesByExtension[f.extension] = f;
        } else {
          filesByExtension[f.extension].contents += `\n\n` + f.contents;
          filesByExtension[f.extension].imports = {
            ...filesByExtension[f.extension].imports,
            ...f.imports
          };
        }
      }
    }
    console.log(
      `Generating query file${
        Object.keys(filesByExtension).length > 1 ? "s" : ""
      }...`
    );
    for (const [extension, file] of Object.entries(filesByExtension)) {
      const filePath = adapter.path.join(
        root,
        params.options.file + extension
      );
      const prettyPath = "./" + adapter.path.posix.relative(root, filePath);
      console.log(`   ${prettyPath}`);
      await adapter.fs.writeFile(
        filePath,
        `${stringifyImports(file.imports)}\n\n${file.contents}`
      );
    }
    adapter.exit();
    return;
  }

  async function generateFilesForQuery(path: string) {
    const query = await adapter.readFileUtf8(path);
    if (!query) return;
    const types = await generateQueryType(client, query);
    const files = await generateFiles({
      target: params.options.target!,
      path,
      types
    });
    for (const f of files) {
      const prettyPath = "./" + adapter.path.posix.relative(root, f.path);
      console.log(`   ${prettyPath}`);
      await adapter.fs.writeFile(
        f.path,
        `${stringifyImports(f.imports)}\n\n${f.contents}`
      );
    }
  }

  // generate per-query files
  console.log(`Generating files for following queries:`);
  await Promise.all(matches.map(generateFilesForQuery));
  // for (const path of matches) {
  //   await generateFilesForQuery(path)
  // }

  if (!params.options.watch) {
    adapter.exit();
    return;
  }

  // find all *.edgeql files
  // for query in queries:
  //   generate output file
}

function stringifyImports(imports: {[k: string]: boolean}) {
  return `import type {${Object.keys(imports).join(", ")}} from "edgedb";`;
}

async function getMatches(root: string) {
  return adapter.walk(root, {
    match: [/[^\/]\.edgeql$/],
    skip: [/node_modules/, /dbschema\/migrations/]
  });
  // return globby.globby("**/*.edgeql", {
  //   cwd: root,
  //   followSymbolicLinks: true
  // });
}

// const targetToExtension: {[k in Target]: string} = {
//   cjs: ".js",
//   deno: ".ts",
//   esm: ".mjs",
//   mts: ".mts",
//   ts: `.ts`
// };

function generateFiles(params: {
  target: Target;
  path: string;
  types: QueryType;
}): {
  path: string;
  contents: string;
  imports: {[k: string]: boolean};
  extension: string;
}[] {
  const queryFileName = adapter.path.basename(params.path);
  // client.query; Cardinality.MANY;Cardinality.AT_LEAST_ONE;
  // client.querySingle; Cardinality.AT_MOST_ONE
  // client.queryRequiredSingle; Cardinality.ONE;
  const method =
    params.types.cardinality === Cardinality.ONE
      ? "queryRequiredSingle"
      : params.types.cardinality === Cardinality.AT_MOST_ONE
      ? "querySingle"
      : "query";
  const functionName = queryFileName.replace(".edgeql", "");
  const imports: any = {};
  for (const i of params.types.imports) {
    imports[i] = true;
  }
  const tsImports = {Client: true, ...imports};

  const tsImpl = `async function ${functionName}(client: Client, args: ${
    params.types.args
  }): Promise<${params.types.out}> {
  return client.${method}(\`${params.types.query.replace("`", "`")}\`, args)
}`;

  const jsImpl = `async function ${functionName}(client, args){
  return client.${method}(\`${params.types.query.replace("`", "`")}\`, args);
}`;

  const dtsImpl = `function ${functionName}(client: Client, params: ${params.types.args}): Promise<${params.types.out}>;`;

  switch (params.target) {
    case "cjs":
      return [
        {
          path: `${params.path}.js`,
          contents: `${jsImpl}\n\nmodule.exports.${functionName} = ${functionName};`,
          imports: {},
          extension: ".js"
        },
        {
          path: `${params.path}.d.ts`,
          contents: `export ${dtsImpl}`,
          imports: tsImports,
          extension: ".d.ts"
        }
      ];

    case "deno":
      return [
        {
          path: `${params.path}.ts`,
          contents: `export ${tsImpl}`,
          imports: tsImports,
          extension: ".ts"
        }
      ];
    case "esm":
      return [
        {
          path: `${params.path}.mjs`,
          contents: `export ${jsImpl}`,
          imports: {},
          extension: ".mjs"
        },
        {
          path: `${params.path}.d.ts`,
          contents: `export ${dtsImpl}`,
          imports: tsImports,
          extension: ".d.ts"
        }
      ];
    case "mts":
      return [
        {
          path: `${params.path}.mts`,
          contents: `export ${tsImpl}`,
          imports: tsImports,
          extension: ".mts"
        }
      ];
    case "ts":
      return [
        {
          path: `${params.path}.ts`,
          contents: `export ${tsImpl}`,
          imports: tsImports,
          extension: ".ts"
        }
      ];
  }
}
