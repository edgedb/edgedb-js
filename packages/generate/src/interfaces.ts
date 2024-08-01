import type { CommandOptions } from "./commandutil.js";
import { headerComment } from "./genutil.js";
import { $, adapter, type Client } from "edgedb";
import { DirBuilder } from "./builders.js";

import { generateInterfaces } from "./edgeql-js/generateInterfaces.js";

const { path } = adapter;

export async function runInterfacesGenerator(params: {
  root: string | null;
  options: CommandOptions;
  client: Client;
  schemaDir: string;
}) {
  const { root, options, client, schemaDir } = params;

  let outFile: string;
  if (options.file) {
    outFile = path.isAbsolute(options.file)
      ? options.file
      : path.join(adapter.process.cwd(), options.file);
  } else if (root) {
    outFile = path.join(root, schemaDir, "interfaces.ts");
  } else {
    throw new Error(
      `No edgedb.toml found. Initialize an EdgeDB project with\n\`edgedb project init\` or specify an output file with \`--file\``,
    );
  }

  let outputDirIsInProject = false;
  let prettyOutputDir;
  if (root) {
    const relativeOutputDir = path.posix.relative(root, outFile);
    outputDirIsInProject = !relativeOutputDir.startsWith("..");
    prettyOutputDir = outputDirIsInProject ? `./${relativeOutputDir}` : outFile;
  } else {
    prettyOutputDir = outFile;
  }

  const dir = new DirBuilder();

  console.log(`Introspecting database schema...`);
  const types = await $.introspect.types(client);

  const generatorParams = {
    dir,
    types,
  };
  console.log(`Generating interfaces...`);
  generateInterfaces(generatorParams);

  const file = dir.getPath("interfaces");
  const rendered =
    headerComment +
    file.render({
      mode: "ts",
      moduleKind: "esm",
      moduleExtension: "",
    });

  console.log(`Writing interfaces file...`);
  console.log("   " + prettyOutputDir);
  await adapter.fs.writeFile(outFile, rendered);

  console.log(`Generation complete! 🤘`);
}
