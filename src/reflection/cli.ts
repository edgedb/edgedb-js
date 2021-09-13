#!/usr/bin/env node

// tslint:disable no-console

import path from "path";
import {fs} from "../adapter.node";

import {ConnectConfig} from "src/con_utils";
import {generateQB} from "./generate";

const run = async () => {
  const [command, ...args] = process.argv.slice(2);

  if (command !== "generate") {
    throw new Error(`Unknown command: ${command}`);
  }
  const cxn: ConnectConfig & {name?: string} = {};
  while (args.length) {
    const flag = args.shift();
    const value = args.shift();
    if (flag === "-I" || flag === "--instance" || flag === "--dsn") {
      cxn.dsn = value;
    } else if (flag === "--database" || flag === "-d") {
      cxn.database = value;
    } else if (flag === "--dsn") {
      cxn.dsn = value;
    } else if (flag === "--host" || flag === "-h") {
      cxn.host = value;
    } else if (flag === "--port" || flag === "-P") {
      cxn.port = Number(value);
    } else if (flag === "--username" || flag === "-u") {
      cxn.user = value;
    } else if (flag === "--password" || flag === "-p") {
      cxn.password = value;
    } else if (flag === "--name") {
      cxn.password = value;
    } else {
      throw new Error(`Unknown option: ${flag}`);
    }
  }

  // find project root
  let rootDir: string = "";
  let currentDir = process.cwd();
  while (!rootDir) {
    const contents = fs.readdirSync(currentDir);
    if (contents.includes(`node_modules`)) {
      rootDir = currentDir;
      break;
    }

    if (currentDir === `/`) {
      console.error(
        "Error: no package.json found. Make sure you're inside your project directory."
      );
      process.exit();
    }

    currentDir = path.join(currentDir, "..");
  }

  // check for locally install edgedb
  const edgedbPath = path.join(rootDir, "node_modules", "edgedb");
  if (!fs.existsSync(edgedbPath)) {
    console.error(
      "Error: `edgedb` package is not yet installed locally. Run `npm install edgedb` before generating the query builder."
    );
    process.exit();
  }

  // generate code into temporary directory
  const tmpOutputDir = path.join(
    rootDir,
    "node_modules",
    ".edgedb",
    cxn.name || "EdgeDBQueryBuilder"
  );
  console.log(tmpOutputDir);

  await generateQB(
    tmpOutputDir,
    cxn.dsn ? cxn.dsn : Object.keys(cxn).length ? cxn : undefined
  );
  process.exit();
};

run();
