#!/usr/bin/env node

// tslint:disable no-console

import path from "path";
import fs from "fs";
import readline from "readline";
import {Writable} from "stream";

import {ConnectConfig, parseConnectArguments} from "../con_utils";
import {exitWithError, generateQB} from "./generate";

const run = async () => {
  const args = process.argv.slice(2);

  const connectionConfig: ConnectConfig = {};
  const options: {
    showHelp?: boolean;
    target?: "ts" | "esm" | "cjs";
    outputDir?: string;
    promptPassword?: boolean;
    passwordFromStdin?: boolean;
  } = {};

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
      // case '--credentials-file':
      //   connectionConfig.credentialsFile = getVal();
      //   break;
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
      case "--tls-verify-hostname":
        connectionConfig.tlsVerifyHostname = true;
        break;
      case "--no-tls-verify-hostname":
        connectionConfig.tlsVerifyHostname = false;
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
      default:
        exitWithError(`Unknown option: ${flag}`);
    }

    if (val !== null) {
      exitWithError(`Option ${flag} does not take a value`);
    }
  }

  if (options.showHelp) {
    console.log(`edgedb-generate

Generates a querybuilder

CONNECTION OPTIONS:
    -I, --instance <instance>
    --dsn <dsn>
    --credentials-file <credentials file>
    -H, --host <host>
    -P, --port <port>
    -d, --database <database>
    -u, --user <user>
    --password
    --password-from-stdin
    --tls-ca-file <tls ca file>
    --tls-verify-hostname
    --no-tls-verify-hostname

OPTIONS:
    --target <target>
        Valid targets: 'ts', 'esm', 'cjs'
    --output-dir <output-dir>
`);
    process.exit();
  }

  // find project root
  let projectRoot: string = "";
  let currentDir = process.cwd();
  const systemRoot = path.parse(currentDir).root;

  while (currentDir !== systemRoot) {
    if (fs.existsSync(path.join(currentDir, "package.json"))) {
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
  //     "Error: 'edgedb' package is not yet installed locally. Run `npm install edgedb` before generating the query builder."
  //   );
  //   process.exit();
  // }

  if (!options.target) {
    const tsconfigExists = fs.existsSync(
      path.join(projectRoot, "tsconfig.json")
    );

    if (tsconfigExists) {
      options.target = "ts";
      console.log(`tsconfig.json detected, generating for 'ts' target`);
    } else {
      const packageJson = JSON.parse(
        fs.readFileSync(projectRoot, "package.json")
      );
      if (packageJson?.type === "module") {
        options.target = "esm";
        console.log(
          `type: "module" in package.json, generating for 'esm' target`
        );
      }
    }
  }

  if (options.promptPassword) {
    const username = parseConnectArguments({
      ...connectionConfig,
      password: "",
    }).user;
    connectionConfig.password = await promptForPassword(username);
  }
  if (options.passwordFromStdin) {
    connectionConfig.password = await readPasswordFromStdin();
  }

  const outputDir =
    options.outputDir ?? path.join(projectRoot, "dbschema", "edgeql");

  await generateQB({outputDir, connectionConfig, target: options.target!});
  process.exit();
};

run();

function isTTY() {
  return process.stdin.isTTY && process.stdout.isTTY;
}

function promptForPassword(username: string) {
  if (!isTTY()) {
    exitWithError(
      `Cannot use --password option in non-interactive mode. ` +
        `To read password from stdin use the --password-from-stdin option.`
    );
  }

  return new Promise<string>(resolve => {
    let silent = false;

    const silentStdout = new Writable({
      write: function (chunk, encoding, callback) {
        if (!silent) process.stdout.write(chunk, encoding);
        callback();
      },
    });

    var rl = readline.createInterface({
      input: process.stdin,
      output: silentStdout,
      terminal: true,
    });

    rl.question(`Password for '${username}': `, function (password) {
      rl.close();
      resolve(password);
    });

    silent = true;
  });
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
