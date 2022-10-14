import type {CommandOptions} from "./commandutil";
import {exitWithError} from "./genutil";

import {$, adapter, Client, createClient} from "edgedb";
import {DirBuilder} from "./builders";

import type {ConnectConfig} from "edgedb/dist/conUtils";
import {generateInterfaces} from "./edgeql-js/generateInterfaces";

const {path} = adapter;

export async function runInterfacesGenerator(params: {
  root: string | null;
  options: CommandOptions;
  connectionConfig: ConnectConfig;
}) {
  const {root, options, connectionConfig} = params;

  let outFile: string;
  if (options.file) {
    outFile = path.isAbsolute(options.file)
      ? options.file
      : path.join(adapter.process.cwd(), options.file);
  } else if (root) {
    outFile = path.join(root, "dbschema/interfaces.ts");
  } else {
    throw new Error(
      `No edgedb.toml found. Initialize an EdgeDB project with\n\`edgedb project init\` or specify an output file with \`--file\``
    );
  }

  let outputDirIsInProject = false;
  let prettyOutputDir;
  if (root) {
    const relativeOutputDir = path.posix.relative(root, outFile);
    outputDirIsInProject = !relativeOutputDir.startsWith("..");
    prettyOutputDir = outputDirIsInProject
      ? `./${relativeOutputDir}`
      : outFile;
  } else {
    prettyOutputDir = outFile;
  }

  let cxn: Client;
  try {
    cxn = createClient({
      ...connectionConfig,
      concurrency: 5
    });
  } catch (e) {
    exitWithError(`Failed to connect: ${(e as Error).message}`);
  }

  const dir = new DirBuilder();

  // tslint:disable-next-line
  console.log(`Introspecting database schema...`);
  const types = await $.introspect.types(cxn);
  const generatorParams = {
    dir,
    types
  };
  console.log(`Generating interfaces...`);
  generateInterfaces(generatorParams);

  const file = dir.getPath("interfaces");
  const rendered = file.render({
    mode: "ts",
    moduleKind: "esm",
    moduleExtension: ""
  });
  console.log(`outFile`);
  console.log(outFile);

  console.log(`Writing file to ${prettyOutputDir}`);
  await adapter.fs.writeFile(outFile, rendered);

  console.log(`Generation complete! 🤘`);
}
