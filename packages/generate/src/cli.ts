#!/usr/bin/env node

import { adapter, type Client, createClient, createHttpClient } from "edgedb";
import * as TOML from "@iarna/toml";

import {
  type ConnectConfig,
  validTlsSecurityValues,
  isValidTlsSecurityValue,
} from "edgedb/dist/conUtils";
import { parseConnectArguments } from "edgedb/dist/conUtils.server";
import {
  type CommandOptions,
  promptForPassword,
  readPasswordFromStdin,
} from "./commandutil";
import { generateQueryBuilder } from "./edgeql-js";
import { runInterfacesGenerator } from "./interfaces";
import { type Target, exitWithError } from "./genutil";
import { generateQueryFiles } from "./queries";

const { path, readFileUtf8, exists } = adapter;

enum Generator {
  QueryBuilder = "edgeql-js",
  Queries = "queries",
  Interfaces = "interfaces",
}

const availableGeneratorsHelp = `
Available generators:
 - edgeql-js (query builder)
 - queries (query files)
 - interfaces`;

const run = async () => {
  const args = adapter.process.argv.slice(2);
  const generator: Generator = args.shift() as any;

  const connectionConfig: ConnectConfig = {};
  const options: CommandOptions = {};

  if ((generator as any) === "-h" || (generator as any) === "--help") {
    printHelp();
    adapter.process.exit();
  }
  if (!generator || generator[0] === "-") {
    console.error(
      `Error: No generator specified.\n  \`npx @edgedb/generate <generator>\`${availableGeneratorsHelp}`,
    );
    adapter.exit();
  }
  if (!Object.values(Generator).includes(generator)) {
    console.error(
      `Error: Invalid generator "${generator}".${availableGeneratorsHelp}`,
    );
    adapter.exit();
  }

  switch (generator) {
    case Generator.QueryBuilder:
      break;
    case Generator.Queries:
      break;
    case Generator.Interfaces:
      options.target = "ts";
      break;
  }

  let projectRoot: string | null = null;
  let currentDir = adapter.process.cwd();
  let schemaDir = "dbschema";
  const systemRoot = path.parse(currentDir).root;
  while (currentDir !== systemRoot) {
    if (await exists(path.join(currentDir, "edgedb.toml"))) {
      projectRoot = currentDir;
      const config: {
        project?: { "schema-dir"?: string };
      } = TOML.parse(await readFileUtf8(currentDir, "edgedb.toml"));

      const maybeProjectTable = config.project;
      const maybeSchemaDir =
        maybeProjectTable && maybeProjectTable["schema-dir"];
      if (typeof maybeSchemaDir === "string") {
        schemaDir = maybeSchemaDir;
      }
      break;
    }
    currentDir = path.join(currentDir, "..");
  }

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
        console.error(`Error: No value provided for ${flag} option`);
        adapter.exit();
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
            `Cannot use both --password and --password-from-stdin options`,
          );
        }
        options.promptPassword = true;
        break;
      case "--password-from-stdin":
        if (options.promptPassword === true) {
          exitWithError(
            `Cannot use both --password and --password-from-stdin options`,
          );
        }
        options.passwordFromStdin = true;
        break;
      case "--tls-ca-file":
        connectionConfig.tlsCAFile = getVal();
        break;
      case "--tls-security": {
        const tlsSec = getVal();
        if (!isValidTlsSecurityValue(tlsSec)) {
          exitWithError(
            `Invalid value for --tls-security. Must be one of: ${validTlsSecurityValues
              .map((x) => `"${x}"`)
              .join(" | ")}`,
          );
        }
        connectionConfig.tlsSecurity = tlsSec;
        break;
      }
      case "--use-http-client":
        options.useHttpClient = true;
        break;
      case "--target": {
        if (generator === Generator.Interfaces) {
          exitWithError(
            `--target is not supported for generator "${generator}"`,
          );
        }
        const target = getVal();
        if (!target || !["ts", "esm", "cjs", "mts", "deno"].includes(target)) {
          exitWithError(
            `Invalid target "${
              target ?? ""
            }", expected "deno", "mts", "ts", "esm" or "cjs"`,
          );
        }
        options.target = target as Target;
        break;
      }
      case "--out":
      case "--output-dir":
        if (
          generator === Generator.Interfaces ||
          generator === Generator.Queries
        ) {
          exitWithError(
            `--output-dir is not supported for generator "${generator}"` +
              `, consider using the --file option instead`,
          );
        }
        options.out = getVal();
        break;
      case "--file":
        if (generator === Generator.Interfaces) {
          options.file = getVal();
        } else if (generator === Generator.Queries) {
          if (args.length > 0 && args[0][0] !== "-") {
            options.file = getVal();
          } else {
            options.file = adapter.path.join(schemaDir, "queries");
          }
        } else {
          exitWithError(
            `Flag --file not supported for generator "${generator}"` +
              `, consider using the --output-dir option instead`,
          );
        }

        break;
      case "--watch":
        options.watch = true;
        exitWithError(
          `Watch mode is not supported for generator "${generator}"`,
        );
        break;
      case "--force-overwrite":
        options.forceOverwrite = true;
        break;
      case "--no-update-ignore-file":
        options.updateIgnoreFile = false;
        break;
      default:
        exitWithError(`Unknown option: ${flag}`);
    }

    if (val !== null) {
      exitWithError(`Option ${flag} does not take a value`);
    }
  }

  if (options.showHelp) {
    printHelp();
    adapter.process.exit();
  }

  switch (generator) {
    case Generator.QueryBuilder:
      console.log(`Generating query builder...`);
      break;
    case Generator.Queries:
      console.log(`Generating functions from .edgeql files...`);
      break;
    case Generator.Interfaces:
      console.log(`Generating TS interfaces from schema...`);
      break;
  }

  if (!options.target) {
    if (!projectRoot) {
      throw new Error(
        `Failed to detect project root.
Run this command inside an EdgeDB project directory or specify the desired target language with \`--target\``,
      );
    }

    const tsConfigPath = path.join(projectRoot, "tsconfig.json");
    const tsConfigExists = await exists(tsConfigPath);
    const denoConfigPath = path.join(projectRoot, "deno.json");
    const denoJsonExists = await exists(denoConfigPath);

    let packageJson: { type: string } | null = null;
    const pkgJsonPath = path.join(projectRoot, "package.json");
    if (await exists(pkgJsonPath)) {
      packageJson = JSON.parse(await readFileUtf8(pkgJsonPath));
    }

    // doesn't work with `extends`
    // switch to more robust solution after splitting
    // @edgedb/generate into separate package
    // @ts-ignore
    const isDenoRuntime = typeof Deno !== "undefined";

    if (isDenoRuntime || denoJsonExists) {
      options.target = "deno";
      console.log(
        `Detected ${
          isDenoRuntime ? "Deno runtime" : "deno.json"
        }, generating TypeScript files with Deno-style imports.`,
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
          `Detected tsconfig.json with ES module support, generating .mts files with ESM imports.`,
        );
      } else {
        options.target = "ts";
        console.log(`Detected tsconfig.json, generating TypeScript files.`);
      }
    } else {
      if (packageJson?.type === "module") {
        options.target = "esm";
        console.log(
          `Detected "type": "module" in package.json, generating .js files with ES module syntax.`,
        );
      } else {
        console.log(
          `Detected package.json. Generating .js files with CommonJS module syntax.`,
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
        password: "",
      })
    ).connectionParams.user;
    connectionConfig.password = await promptForPassword(username);
  }
  if (options.passwordFromStdin) {
    connectionConfig.password = await readPasswordFromStdin();
  }

  let client: Client;
  try {
    const cxnCreatorFn = options.useHttpClient
      ? createHttpClient
      : createClient;
    client = cxnCreatorFn({
      ...connectionConfig,
      concurrency: 5,
    });
  } catch (e) {
    exitWithError(`Failed to connect: ${(e as Error).message}`);
  }

  try {
    switch (generator) {
      case Generator.QueryBuilder:
        await generateQueryBuilder({
          options,
          client,
          root: projectRoot,
          schemaDir,
        });
        break;
      case Generator.Queries:
        await generateQueryFiles({
          options,
          client,
          root: projectRoot,
          schemaDir,
        });
        break;
      case Generator.Interfaces:
        await runInterfacesGenerator({
          options,
          client,
          root: projectRoot,
          schemaDir,
        });
        break;
    }
  } catch (e) {
    exitWithError((e as Error).message);
  } finally {
    await client.close();
  }
  adapter.process.exit();
};

function printHelp() {
  console.log(`@edgedb/generate

Official EdgeDB code generators for TypeScript/JavaScript

USAGE
    npx @edgedb/generate [COMMAND] [OPTIONS]

COMMANDS:
    queries         Generate typed functions from .edgeql files
    edgeql-js       Generate query builder
    interfaces      Generate TS interfaces for schema types


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

    --out, --output-dir <path>
        Change the output directory the querybuilder files are generated into
        (Only valid for 'edgeql-js' generator)
    --file <path>
        Change the output filepath of the 'queries' and 'interfaces' generators
        When used with the 'queries' generator, also changes output to single-file mode
    --force-overwrite
        Overwrite <path> contents without confirmation
    --no-update-ignore-file
        Do not prompt to update gitignore with generated code
`);
}
run();
