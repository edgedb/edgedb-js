#!/usr/bin/env node

// tslint:disable no-console
import {path, fs, readFileUtf8, exists, input} from "../adapter.node";

import {
  ConnectConfig,
  parseConnectArguments,
  validTlsSecurityValues,
} from "../conUtils";
import {configFileHeader, exitWithError, generateQB} from "./generate";

const rmdir =
  Number(process.versions.node.split(".")[0]) >= 16 ? fs.rm : fs.rmdir;

interface Options {
  showHelp?: boolean;
  target?: "ts" | "esm" | "cjs";
  outputDir?: string;
  promptPassword?: boolean;
  passwordFromStdin?: boolean;
  forceOverwrite?: boolean;
  updateIgnoreFile?: boolean;
}

const run = async () => {
  const args = process.argv.slice(2);

  const connectionConfig: ConnectConfig = {};
  const options: Options = {};

  while (args.length) {
    let flag = args.shift()!;
    let val: string | null = null;
    if (flag.startsWith("--")) {
      if (flag.includes("=")) {
        const [f, ...v] = flag.split("=");
        flag = f;
        val = v.join("=");
      }
    } else if (flag.startsWith("-")) {
      val = flag.slice(2) || null;
      flag = flag.slice(0, 2);
    }

    const getVal = () => {
      if (val !== null) {
        const v = val;
        val = null;
        return v;
      }
      if (args.length === 0) {
        exitWithError(`No value provided for ${flag} option`);
      }
      return args.shift();
    };

    switch (flag) {
      case "-h":
      case "--help":
        options.showHelp = true;
        break;
      case "-I":
      case "--instance":
      case "--dsn":
        connectionConfig.dsn = getVal();
        break;
      case "--credentials-file":
        connectionConfig.credentialsFile = getVal();
        break;
      case "-H":
      case "--host":
        connectionConfig.host = getVal();
        break;
      case "-P":
      case "--port":
        connectionConfig.port = Number(getVal());
        break;
      case "-d":
      case "--database":
        connectionConfig.database = getVal();
        break;
      case "-u":
      case "--user":
        connectionConfig.user = getVal();
        break;
      case "--password":
        if (options.passwordFromStdin === true) {
          exitWithError(
            `Cannot use both --password and --password-from-stdin options`
          );
        }
        options.promptPassword = true;
        break;
      case "--password-from-stdin":
        if (options.promptPassword === true) {
          exitWithError(
            `Cannot use both --password and --password-from-stdin options`
          );
        }
        options.passwordFromStdin = true;
        break;
      case "--tls-ca-file":
        connectionConfig.tlsCAFile = getVal();
        break;
      case "--tls-security":
        const tlsSec: any = getVal();
        if (!validTlsSecurityValues.includes(tlsSec)) {
          exitWithError(
            `Invalid value for --tls-security. Must be one of: ${validTlsSecurityValues
              .map(x => `"${x}"`)
              .join(" | ")}`
          );
        }
        connectionConfig.tlsSecurity = tlsSec;
        break;
      case "--target":
        const target = getVal();
        if (!target || !["ts", "esm", "cjs"].includes(target)) {
          exitWithError(
            `Invalid target "${target ?? ""}", expected "ts", "esm" or "cjs"`
          );
        }
        options.target = target as any;
        break;
      case "--output-dir":
        options.outputDir = getVal();
        break;
      case "--force-overwrite":
        options.forceOverwrite = true;
        break;
      default:
        exitWithError(`Unknown option: ${flag}`);
    }

    if (val !== null) {
      exitWithError(`Option ${flag} does not take a value`);
    }
  }

  if (options.showHelp) {
    console.log(`edgeql-js

Introspects the schema of an EdgeDB instance and generates a TypeScript/JavaScript query builder

CONNECTION OPTIONS:
    -I, --instance <instance>
    --dsn <dsn>
    --credentials-file <path/to/credentials.json>
    -H, --host <host>
    -P, --port <port>
    -d, --database <database>
    -u, --user <user>
    --password
    --password-from-stdin
    --tls-ca-file <path/to/certificate>
    --tls-security <insecure | no_host_verification | strict | default>

OPTIONS:
    --target [ts,esm,cjs]

        ts     Generate TypeScript files
        esm    Generate JavaScript with ES Module syntax
        cjs    Generate JavaScript with CommonJS syntax

    --output-dir <output-dir>
    --force-overwrite
        If 'output-dir' already exists, will overwrite without confirmation
`);
    process.exit();
  }

  // find project root
  let projectRoot: string = "";
  let currentDir = process.cwd();
  const systemRoot = path.parse(currentDir).root;

  while (currentDir !== systemRoot) {
    if (await exists(path.join(currentDir, "package.json"))) {
      projectRoot = currentDir;
      break;
    }

    currentDir = path.join(currentDir, "..");
  }
  if (!projectRoot) {
    exitWithError(
      "Error: no package.json found. Make sure you're inside your project directory."
    );
  }

  // check for locally install edgedb
  // const edgedbPath = path.join(rootDir, "node_modules", "edgedb");
  // if (!fs.existsSync(edgedbPath)) {
  //   console.error(
  //     `Error: 'edgedb' package is not yet installed locally.
  //  Run `npm install edgedb` before generating the query builder.`
  //   );
  //   process.exit();
  // }

  if (!options.target) {
    const tsconfigExists = await exists(
      path.join(projectRoot, "tsconfig.json")
    );

    const overrideTargetMessage = `   To override this, use the --target flag.
   Run \`npx edgeql-js --help\` for details.`;

    if (tsconfigExists) {
      options.target = "ts";
      console.log(`Detected tsconfig.json, generating TypeScript files.`);
    } else {
      const packageJson = JSON.parse(
        await readFileUtf8(path.join(projectRoot, "package.json"))
      );
      if (packageJson?.type === "module") {
        options.target = "esm";
        console.log(
          `Detected "type": "module" in package.json, generating .js files with ES module syntax.`
        );
      } else {
        console.log(
          `Detected package.json. Generating .js files with CommonJS module syntax.`
        );
        options.target = "cjs";
      }
    }
    console.log(overrideTargetMessage);
  }

  const outputDir = options.outputDir
    ? path.resolve(projectRoot, options.outputDir || "")
    : path.join(projectRoot, "dbschema", "edgeql-js");

  const relativeOutputDir = path.posix.relative(projectRoot, outputDir);
  const outputDirInProject =
    !!relativeOutputDir &&
    !path.isAbsolute(relativeOutputDir) &&
    !relativeOutputDir.startsWith("..");
  const prettyOutputDir = outputDirInProject
    ? `./${relativeOutputDir}`
    : outputDir;

  console.log(
    `Generating query builder into ${
      path.isAbsolute(prettyOutputDir)
        ? `\n   ${prettyOutputDir}`
        : `${prettyOutputDir}`
    }`
  );

  if (await exists(outputDir)) {
    if (await canOverwrite(outputDir, options)) {
      await rmdir(outputDir, {recursive: true});
    }
  } else {
    // output dir doesn't exist, so assume first run
    options.updateIgnoreFile = true;
  }

  if (options.promptPassword) {
    const username = (
      await parseConnectArguments({
        ...connectionConfig,
        password: "",
      })
    ).connectionParams.user;
    connectionConfig.password = await promptForPassword(username);
  }
  if (options.passwordFromStdin) {
    connectionConfig.password = await readPasswordFromStdin();
  }

  await generateQB({outputDir, connectionConfig, target: options.target!});

  console.log(`Generation successful!`);

  if (!outputDirInProject) {
    console.log(
      `\nChecking the generated query builder into version control
is not recommended. Consider updating the .gitignore of your
project to exclude these files.`
    );
  } else if (options.updateIgnoreFile) {
    const gitIgnorePath = path.join(projectRoot, ".gitignore");

    let gitIgnoreFile: string | null = null;
    try {
      gitIgnoreFile = await readFileUtf8(gitIgnorePath);
    } catch {}

    const vcsLine = path.posix.relative(projectRoot, outputDir);

    if (
      gitIgnoreFile === null ||
      !RegExp(`^${vcsLine}$`, "m").test(gitIgnoreFile) // not already ignored
    ) {
      if (
        await promptBoolean(
          gitIgnoreFile === null
            ? `Checking the generated query builder into version control
is NOT RECOMMENDED. Would you like to create a .gitignore file to ignore
the query builder directory? `
            : `Checking the generated query builder into version control
is NOT RECOMMENDED. Would you like to update .gitignore to ignore
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

  process.exit();
};

run();

async function canOverwrite(outputDir: string, options: Options) {
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

function isTTY() {
  return process.stdin.isTTY && process.stdout.isTTY;
}

async function promptBoolean(prompt: string, defaultVal?: boolean) {
  const response = await promptEnum(
    prompt,
    ["y", "n"],
    defaultVal !== undefined ? (defaultVal ? "y" : "n") : undefined
  );
  return response === "y";
}

async function promptEnum<Val extends string, Default extends Val>(
  question: string,
  vals: Val[],
  defaultVal?: Default
): Promise<Val> {
  let response = await input(
    `${question}[${vals.join("/")}]${
      defaultVal !== undefined ? ` (leave blank for "${defaultVal}")` : ""
    }\n> `
  );
  response = response.trim().toLowerCase();

  if (vals.includes(response as any)) {
    return response as Val;
  } else if (!response && defaultVal !== undefined) {
    return defaultVal as Val;
  } else {
    exitWithError(`Unknown value: '${response}'`);
  }
}

async function promptForPassword(username: string) {
  if (!isTTY()) {
    exitWithError(
      `Cannot use --password option in non-interactive mode. ` +
        `To read password from stdin use the --password-from-stdin option.`
    );
  }

  return await input(`Password for '${username}': `, {silent: true});
}

function readPasswordFromStdin() {
  if (process.stdin.isTTY) {
    exitWithError(`Cannot read password from stdin: stdin is a TTY.`);
  }

  return new Promise<string>(resolve => {
    let data = "";
    process.stdin.on("data", chunk => (data += chunk));
    process.stdin.on("end", () => resolve(data.trimEnd()));
  });
}
