import * as process from "process";
import * as child_process from "child_process";
import * as path from "path";
import * as os from "os";
import * as fs from "fs";
import * as readline from "readline";
import {ConnectConfig} from "../src/con_utils";
import {readFileUtf8Sync} from "../src/adapter.node";

import connect from "../src/index.node";
import {promisify} from "util";

type PromiseCallback = () => void;

const getServerInfo = async (
  filename: string
): Promise<{
  port: number;
  socket_dir: string;
  tls_cert_file?: string;
} | null> => {
  if (!fs.existsSync(filename)) {
    return null;
  }

  const input = fs.createReadStream(filename);
  const rl = readline.createInterface({input});

  let line;
  for await (line of rl) {
    if (line.startsWith("READY=")) {
      break;
    }
  }

  if (!line) {
    throw new Error("no data found in " + filename);
  }

  return JSON.parse(line.replace("READY=", ""));
};

const getWSLPath = (path: string): string => {
  return path.replace("C:", "/mnt/c").split("\\").join("/").toLowerCase();
};

export default async () => {
  // tslint:disable-next-line
  console.log("\nStarting EdgeDB test cluster...");

  let err: ((_: string) => void) | null = null;
  let stderrData: string = "";

  const done = new Promise<null>((resolve, reject) => {
    err = reject;
  });

  let srvcmd = "edgedb-server";
  if (process.env.EDGEDB_SERVER_BIN) {
    srvcmd = process.env.EDGEDB_SERVER_BIN;
  }

  const tmpid = Math.floor(Math.random() * 999999999);
  const statusFile = path.join(os.tmpdir(), `edgedb-js-status-file-${tmpid}`);
  console.log("status file:", statusFile);

  const statusFileUnix = getWSLPath(statusFile);

  let args = [srvcmd];
  if (process.platform === "win32") {
    args = ["wsl", "-u", "edgedb", ...args];
  }

  const helpCmd = [...args, "--help"];
  const help = child_process.execSync(helpCmd.join(" "));

  if (help.includes("--generate-self-signed-cert")) {
    args.push("--generate-self-signed-cert");
  }

  if (help.includes("--auto-shutdown-after")) {
    args.push("--auto-shutdown-after=0");
  } else {
    args.push("--auto-shutdown");
  }

  args = [
    ...args,
    "--temp-dir",
    "--testmode",
    "--port=auto",
    "--emit-server-status=" + statusFileUnix,
    "--bootstrap-command=ALTER ROLE edgedb { SET password := '' }",
  ];

  const proc = child_process.spawn(args[0], args.slice(1, args.length));

  if (process.env.EDGEDB_DEBUG_SERVER) {
    proc.stdout.on("data", (data) => {
      console.log(data.toString());
    });
  }

  proc.stderr.on("data", (data) => {
    // only collect until we detect the start
    if (err) {
      stderrData += data;
    }
  });

  proc.on("exit", (code, signal) => {
    if (err) {
      // only catch early exit
      console.log("--- EdgeDB output start ---");
      console.log(stderrData);
      console.log("--- EdgeDB output end ---");
      err(
        `EdgeDB exited prematurely with ` + `code ${code} or signal ${signal}`
      );
    }
  });

  let runtimeData;
  for (let i = 0; i < 250; i++) {
    runtimeData = await getServerInfo(statusFile);

    if (runtimeData == null) {
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    } else {
      break;
    }
  }

  if (runtimeData == null) {
    proc.kill();
    throw new Error("could not open server status file " + statusFile);
  } else {
    err = null;
  }

  if (runtimeData.tls_cert_file && process.platform === "win32") {
    const tmpFile = path.join(os.tmpdir(), `edbtlscert-${tmpid}.pem`);
    const cmd = `wsl -u edgedb cp ${runtimeData.tls_cert_file} ${getWSLPath(
      tmpFile
    )}`;
    child_process.execSync(cmd);
    runtimeData.tls_cert_file = tmpFile;
  }

  const config: ConnectConfig = {
    host: "127.0.0.1",
    port: runtimeData.port,
    user: "edgedb",
    database: "edgedb",
    tlsVerifyHostname: false,
  };

  if (typeof runtimeData.tls_cert_file === "string") {
    config.tlsCAFile = runtimeData.tls_cert_file;
  }

  process.env._JEST_EDGEDB_CONNECT_CONFIG = JSON.stringify(config);

  // @ts-ignore
  global.edgedbProc = proc;

  const con = await connect(undefined, config);

  try {
    await con.execute(`
      CREATE DATABASE jest;
    `);

    await con.execute(`
      CREATE SUPERUSER ROLE jest {
        SET password := "jestjest";
      };
    `);

    await con.execute(`
      CONFIGURE SYSTEM INSERT Auth {
        user := "jest",
        priority := 10,
        method := (INSERT SCRAM),
      };
    `);
  } catch (e) {
    await con.close();
    throw e;
  }

  // @ts-ignore
  global.edgedbConn = con;

  // tslint:disable-next-line
  console.log(`EdgeDB test cluster is up [port: ${config.port}]...`);
};
