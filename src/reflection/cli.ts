#!/usr/bin/env node

import path from "path";
import {ConnectConfig} from "src/con_utils";
import {generateQB} from "./generate";

const run = async () => {
  const [command, ...args] = process.argv.slice(2);

  if (command !== "generate") {
    throw new Error(`Unknown command: ${command}`);
  }
  const cxn: ConnectConfig = {password: ""};
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
    } else {
      throw new Error(`Unknown option: ${flag}`);
    }
  }

  console.log(JSON.stringify(cxn, null, 2));

  const TO = path.join(__dirname, "generated/example");
  console.log(TO);
  await generateQB(TO, cxn.dsn ? cxn.dsn : cxn);
  process.exit();
};

run();
