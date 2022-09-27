// tslint:disable
import {createClient, adapter} from "edgedb";
import type {ConnectConfig} from "edgedb/dist/conUtils";
import type {CommandOptions} from "./commandutil";
import {generateQueryType} from "./queries/codecToType";
import type {QueryType} from "./queries/codecToType";
// import chokidar from "chokidar";
// import globby from "globby";
import type {Target} from "./generate";
import {Cardinality} from "edgedb/dist/ifaces";

export async function generateQueryFiles(params: {
  root: string | null;
  options: CommandOptions;
  connectionConfig: ConnectConfig;
}) {
  if (params.options.file && params.options.watch) {
    throw new Error(`Using --watch and --file mode simultaneously is not
currently supported.`);
  }

  console.log(`Detecting project root...`);

  const noRoot = !params.root;
  const root = params.root ?? adapter.process.cwd();
  if (noRoot) {
    console.warn(
      `No \`edgedb.toml\` found. Using process.cwd() instead:
   ${params.root}
`
    );
  } else {
    console.log(`Found edgedb.toml.`);
    console.log("   " + params.root);
  }
  const client = createClient({
    ...params.connectionConfig,
    concurrency: 5
  });

  // watch mode: start watcher

  // file mode: introspect all queries and generate one file
  // generate one query per file

  const matches = await getMatches(root);

  for (const path of matches) {
    const prettyPath = "./" + adapter.path.posix.relative(root, path);
    console.log(`Generating query file for ${prettyPath}`);
    const query = await adapter.readFileUtf8(path);
    const types = await generateQueryType(client, query);
    console.log(JSON.stringify(types, null, 2));
    for (const [k, v] of Object.entries(types) as any) {
      console.log(`${k}\n${v}`);
    }
    const files = await generateFiles({
      target: params.options.target!,
      path,
      types
    });
    for (const file of files) {
      console.log(`Writing ${file.path}...`);
      await adapter.fs.writeFile(
        file.path,
        `${file.imports}\n\n${file.contents}`
      );
    }
  }
  console.log("Done.");

  // if (!params.options.watch) {
  //   const matches = await getMatches(root);
  // } else {
  //   const watcher = chokidar.watch("**/*.edgeql", {
  //     cwd: root
  //   });

  //   // const method = params.options.watch ? watcher.on : watcher.once;
  //   return watcher.once("all", async (evt, path, stats) => {
  //     if (["add", "change"].includes(evt)) {
  //       const modifier = {
  //         add: "Detected:  ",
  //         change: "Modified:   ",
  //         unlink: "Deleted:   "
  //       }[evt as string];
  //       console.log(`${modifier}: ${path}`);

  //       const prettyPath = adapter.path.posix.relative(root, path);
  //       console.log(`Query ${prettyPath}`);
  //     } else if (evt === "unlink") {
  //     }
  //   });
  // }

  // find all *.edgeql files
  // for query in queries:
  //   generate output file
}

async function getMatches(root: string) {
  return adapter.walk(root, {
    match: [/\.edgeql$/],
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
}): {path: string; contents: string; imports: string}[] {
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
  console.log(`func: ${functionName}`);

  const tsImports = `import type {${["Client", ...params.types.imports].join(
    ", "
  )}} from "edgedb";`;

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
          imports: ``
        },
        {
          path: `${params.path}.d.ts`,
          contents: `export ${dtsImpl}`,
          imports: tsImports
        }
      ];

    case "deno":
      return [
        {
          path: `${params.path}.ts`,
          contents: `export ${tsImpl}`,
          imports: tsImports
        }
      ];
    case "esm":
      return [
        {
          path: `${params.path}.mjs`,
          contents: `export ${jsImpl}`,
          imports: ``
        },
        {
          path: `${params.path}.d.ts`,
          contents: `export ${dtsImpl}`,
          imports: tsImports
        }
      ];
    case "mts":
      return [
        {
          path: `${params.path}.mts`,
          contents: `export ${tsImpl}`,
          imports: tsImports
        }
      ];
    case "ts":
      return [
        {
          path: `${params.path}.ts`,
          contents: `export ${tsImpl}`,
          imports: tsImports
        }
      ];
  }
}
