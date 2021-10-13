#!/usr/bin/env node

// tslint:disable no-console

import path from "path";
import fs from "fs";

import {ConnectConfig} from "src/con_utils";
import {exitWithError, generateQB} from "./generate";

const run = async () => {
  const args = process.argv.slice(2);

  const connectionConfig: ConnectConfig = {};
  const config: {target?: "ts" | "esm" | "cjs"} = {};
  while (args.length) {
    const flag = args.shift();
    switch (flag) {
      case "-I":
      case "--instance":
      case "--dsn":
        connectionConfig.dsn = args.shift();
        break;
      case "-d":
      case "--database":
        connectionConfig.database = args.shift();
        break;
      case "-H":
      case "--host":
        connectionConfig.host = args.shift();
        break;
      case "-P":
      case "--port":
        connectionConfig.port = Number(args.shift());
        break;
      case "-u":
      case "--user":
        connectionConfig.user = args.shift();
        break;
      case "--target":
        const target = args.shift();
        if (!target || !["ts", "esm", "cjs"].includes(target)) {
          exitWithError(
            `Invalid target "${target ?? ""}", expected "ts", "esm" or "cjs"`
          );
        }
        config.target = target as any;
        break;
      default:
        exitWithError(`Unknown option: ${flag}`);
    }
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

  if (!config.target) {
    const tsconfigExists = fs.existsSync(
      path.join(projectRoot, "tsconfig.json")
    );

    if (tsconfigExists) {
      config.target = "ts";
    } else {
      const packageJson = JSON.parse(
        fs.readFileSync(projectRoot, "package.json")
      );
      if (packageJson?.type === "module") {
        config.target = "esm";
      }
    }
  }

  const outputDir = path.join(projectRoot, "dbschema", "edgeql");

  await generateQB({outputDir, connectionConfig, target: config.target!});
  process.exit();
};

run();
