import {adapter} from "edgedb";
import {configFileHeader, exitWithError, generateQB} from "./generate";
import {isTTY, CommandOptions, promptBoolean} from "./commandutil";
import type {ConnectConfig} from "edgedb/dist/conUtils";

const {path, fs, readFileUtf8, exists} = adapter;

export async function generateQueryBuilder(params: {
  root: string | null;
  options: CommandOptions;
  connectionConfig: ConnectConfig;
}) {
  const {root, options, connectionConfig} = params;

  let outputDir: string;
  if (options.out) {
    outputDir = path.isAbsolute(options.out)
      ? options.out
      : path.join(adapter.process.cwd(), options.out);
  } else if (root) {
    outputDir = path.join(root, "dbschema", "edgeql-js");
  } else {
    throw new Error(
      `No edgedb.toml found. Initialize an EdgeDB project with\n\`edgedb project init\` or specify an output directory with \`--output-dir\``
    );
  }

  let outputDirIsInProject = false;
  let prettyOutputDir;
  if (root) {
    const relativeOutputDir = path.posix.relative(root, outputDir);
    outputDirIsInProject =
      // !!relativeOutputDir &&
      // !path.isAbsolute(options.outputDir) &&
      !relativeOutputDir.startsWith("..");
    prettyOutputDir = outputDirIsInProject
      ? `./${relativeOutputDir}`
      : outputDir;
  } else {
    prettyOutputDir = outputDir;
  }

  if (await exists(outputDir)) {
    if (await canOverwrite(outputDir, options)) {
      // await rmdir(outputDir, {recursive: true});
    }
  } else {
    // output dir doesn't exist, so assume first run
    options.updateIgnoreFile = true;
  }

  await generateQB({outputDir, connectionConfig, target: options.target!});

  console.log(`Writing files to ${prettyOutputDir}`);
  console.log(`Generation complete! 🤘`);

  if (!outputDirIsInProject || !root) {
    console.log(
      `\nChecking the generated files into version control is
not recommended. Consider updating the .gitignore of your
project to exclude these files.`
    );
  } else if (options.updateIgnoreFile) {
    const gitIgnorePath = path.join(root, ".gitignore");

    let gitIgnoreFile: string | null = null;
    try {
      gitIgnoreFile = await readFileUtf8(gitIgnorePath);
    } catch {}

    const vcsLine = path.posix.relative(root, outputDir);

    if (
      gitIgnoreFile === null ||
      !RegExp(`^${vcsLine}$`, "m").test(gitIgnoreFile) // not already ignored
    ) {
      if (
        await promptBoolean(
          gitIgnoreFile === null
            ? `Checking the generated query builder into version control
is not recommended. Would you like to create a .gitignore file to ignore
the query builder directory? `
            : `Checking the generated query builder into version control
is not recommended. Would you like to update .gitignore to ignore
the query builder directory? The following line will be added:

   ${vcsLine}\n\n`,
          true
        )
      ) {
        await fs.appendFile(
          gitIgnorePath,
          `${gitIgnoreFile === null ? "" : "\n"}${vcsLine}\n`
        );
      }
    }
  }
}

async function canOverwrite(outputDir: string, options: CommandOptions) {
  if (options.forceOverwrite) {
    return true;
  }

  let config: any = null;
  try {
    const configFile = await readFileUtf8(path.join(outputDir, "config.json"));
    if (configFile.startsWith(configFileHeader)) {
      config = JSON.parse(configFile.slice(configFileHeader.length));

      if (config.target === options.target) {
        return true;
      }
    }
  } catch {}

  const error = config
    ? `A query builder with a different config already exists in that location.`
    : `Output directory '${outputDir}' already exists.`;

  if (
    isTTY() &&
    (await promptBoolean(`${error}\nDo you want to overwrite? `, true))
  ) {
    return true;
  }

  return exitWithError(`Error: ${error}`);
}
