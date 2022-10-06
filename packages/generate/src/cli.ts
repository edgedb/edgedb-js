#!/usr/bin/env node

// tslint:disable no-console
import {adapter} from "edgedb";

import {
  ConnectConfig,
  parseConnectArguments,
  validTlsSecurityValues
} from "edgedb/dist/conUtils";
import {
  CommandOptions,
  promptForPassword,
  readPasswordFromStdin
} from "./commandutil";
import {generateQueryBuilder} from "./edgeql-js";
import {exitWithError} from "./generate";
import {generateQueryFiles} from "./queries";

const {path, readFileUtf8, exists} = adapter;

enum Generator {
  QueryBuilder = "edgeql-js",
  Queries = "queries"
}

const run = async () => {
  const args = adapter.process.argv.slice(2);
  const generator: Generator = args.shift() as any;

  if (!generator || generator[0] === "-") {
    throw new Error(
      `Specify a generator: \`npx @edgedb/generate [generator]\``
    );
  }
  if (!Object.values(Generator).includes(generator)) {
    throw new Error(`Invalid generator: "${generator}"`);
  }

  const connectionConfig: ConnectConfig = {};
  const options: CommandOptions = {};

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
        if (!target || !["ts", "esm", "cjs", "mts", "deno"].includes(target)) {
          exitWithError(
            `Invalid target "${
              target ?? ""
            }", expected "deno", "mts", "ts", "esm" or "cjs"`
          );
        }
        options.target = target as any;
        break;
      case "--out":
      case "--output-dir":
        options.out = getVal();
        break;
      case "--file":
        if (generator !== Generator.Queries) {
          exitWithError(`Unknown option: ${flag}`);
        }
        if (args.length > 0 && args[0][0] !== "-") {
          options.file = getVal();
        } else {
          options.file = "dbschema/queries";
        }

        break;
      case "--watch":
        if (generator !== Generator.Queries) {
          exitWithError(
            `Watch mode is not supported for generator "${generator}"`
          );
        }
        options.watch = true;
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
    console.log(`@edgedb/generate

Official EdgeDB code generators for TypeScript/JavaScript

USAGE
    npx @edgedb/generate [COMMAND] [OPTIONS]

COMMANDS:
    edgeql-js       Generate query builder
    queries         Generate typed functions from .edgeql files

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
    --target [ts,mts,esm,cjs,deno]

        ts     Generate TypeScript files (.ts)
        mts    Generate TypeScript files (.mts) with ESM imports
        esm    Generate JavaScript with ESM syntax
        cjs    Generate JavaScript with CommonJS syntax
        deno   Generate TypeScript files (.ts) with Deno-style (*.ts) imports

    --out <path>
    --force-overwrite
        Overwrite <path> contents without confirmation
`);
    adapter.process.exit();
  }

  // }

  // check for locally install edgedb
  // const edgedbPath = path.join(rootDir, "node_modules", "edgedb");
  // if (!fs.existsSync(edgedbPath)) {
  //   console.error(
  //     `Error: 'edgedb' package is not yet installed locally.
  //  Run `npm install edgedb` before generating the query builder.`
  //   );
  //   adapter.process.exit();
  // }
  let projectRoot: string | null = null;

  // cannot find projectRoot with package.json in deno.
  // case 1. use deno.json
  // case 2. use edgedb.toml for finding projectRoot
  // if (options.target === "deno") {
  //   // projectRoot = currentDir;
  //   const {getRoot} = await import(
  //     "https://deno.land/x/find_root@v0.2.1/mod.ts"
  //   );
  //   const hasDenoJson = await getRoot("deno.json", currentDir);
  //   if (hasDenoJson.isErr()) {
  //     exitWithError(
  //       "Error: no deno.json found. Make sure you're inside your
  // project directory."
  //     );
  //   }
  //   currentDir = hasDenoJson.value.inDir;
  // } else {
  switch (generator) {
    case Generator.QueryBuilder:
      console.log(`Generating query builder...`);
      break;
    case Generator.Queries:
      console.log(`Generating functions from .edgeql files...`);
      break;
  }

  let currentDir = adapter.process.cwd();
  const systemRoot = path.parse(currentDir).root;
  while (currentDir !== systemRoot) {
    if (await exists(path.join(currentDir, "edgedb.toml"))) {
      projectRoot = currentDir;
      break;
    }
    currentDir = path.join(currentDir, "..");
  }

  if (!options.target) {
    if (!projectRoot) {
      throw new Error(
        `Failed to detect project root.
Run this command inside an EdgeDB project directory or specify the desired target language with \`--target\``
      );
    }

    const tsConfigPath = path.join(projectRoot, "tsconfig.json");
    const tsConfigExists = await exists(tsConfigPath);
    const denoConfigPath = path.join(projectRoot, "deno.json");
    const denoJsonExists = await exists(denoConfigPath);

    let packageJson: {type: string} | null = null;
    const pkgJsonPath = path.join(projectRoot, "package.json");
    if (await exists(pkgJsonPath)) {
      packageJson = JSON.parse(await readFileUtf8(pkgJsonPath));
    }

    // doesn't work with `extends`
    // switch to more robust solution after splitting
    // @edgedb/generate into separate package

    if (denoJsonExists) {
      options.target = "deno";
      console.log(
        `Detected deno.json, generating TypeScript files with Deno-style imports.`
      );
    } else if (tsConfigExists) {
      const tsConfig = tsConfigExists
        ? (await readFileUtf8(tsConfigPath)).toLowerCase()
        : "{}";

      const supportsESM: boolean =
        tsConfig.includes(`"module": "nodenext"`) ||
        tsConfig.includes(`"module": "node12"`);
      if (supportsESM && packageJson?.type === "module") {
        options.target = "mts";
        console.log(
          `Detected tsconfig.json with ES module support, generating .mts files with ESM imports.`
        );
      } else {
        options.target = "ts";
        console.log(`Detected tsconfig.json, generating TypeScript files.`);
      }
    } else {
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
    const overrideTargetMessage = `   To override this, use the --target flag.
   Run \`npx @edgedb/generate --help\` for full options.`;
    console.log(overrideTargetMessage);
  }

  if (options.promptPassword) {
    const username = (
      await parseConnectArguments({
        ...connectionConfig,
        password: ""
      })
    ).connectionParams.user;
    connectionConfig.password = await promptForPassword(username);
  }
  if (options.passwordFromStdin) {
    connectionConfig.password = await readPasswordFromStdin();
  }

  switch (generator) {
    case Generator.QueryBuilder:
      await generateQueryBuilder({
        options,
        connectionConfig,
        root: projectRoot
      });
      adapter.process.exit();
      break;
    case Generator.Queries:
      await generateQueryFiles({
        options,
        connectionConfig,
        root: projectRoot
      });
      break;
  }
};

run();
