import * as process from "process";
import * as child_process from "child_process";
import * as path from "path";
import * as os from "os";
import * as fs from "fs";
import * as readline from "readline";
import {ConnectConfig} from "../src/con_utils";

import {Client, createClient} from "../src/index.node";

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

const generateTempID = (): number => {
  return Math.floor(Math.random() * 999999999);
};

const generateStatusFileName = (tag: string): string => {
  return path.join(
    os.tmpdir(),
    `edgedb-js-status-file-${tag}-${generateTempID()}`
  );
};

const getServerCommand = (statusFile: string): string[] => {
  let srvcmd = "edgedb-server";
  if (process.env.EDGEDB_SERVER_BIN) {
    srvcmd = process.env.EDGEDB_SERVER_BIN;
  }

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
    "--emit-server-status=" + statusFile,
    "--bootstrap-command=ALTER ROLE edgedb { SET password := '' }",
  ];

  return args;
};

const startServer = async (
  cmd: string[],
  statusFile: string,
  env: {[key: string]: string} = {}
): Promise<{config: ConnectConfig; proc: child_process.ChildProcess}> => {
  let err: ((_: string) => void) | null = null;
  let stderrData: string = "";
  const proc = child_process.spawn(cmd[0], cmd.slice(1, cmd.length), {
    env: {...process.env, ...env},
  });

  if (process.env.EDGEDB_DEBUG_SERVER) {
    proc.stdout.on("data", (data) => {
      process.stdout.write(data.toString());
    });
  }

  proc.stderr.on("data", (data) => {
    if (process.env.EDGEDB_DEBUG_SERVER) {
      process.stderr.write(data.toString());
    } else {
      // only collect until we detect the start
      if (err) {
        stderrData += data;
      }
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
    const tmpFile = path.join(
      os.tmpdir(),
      `edbtlscert-${generateTempID()}.pem`
    );
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
    tlsSecurity: "no_host_verification",
  };

  if (typeof runtimeData.tls_cert_file === "string") {
    config.tlsCAFile = runtimeData.tls_cert_file;
  }

  return {config, proc};
};

const connectToServer = async (config: ConnectConfig): Promise<Client> => {
  const client = createClient(config);

  try {
    await client.execute(`
      CREATE DATABASE jest;
		`);

    await client.execute(`
      CREATE SUPERUSER ROLE jest {
        SET password := "jestjest";
      };
		`);

    await client.execute(`
      CONFIGURE SYSTEM INSERT Auth {
        user := "jest",
        priority := 10,
        method := (INSERT SCRAM),
      };
    `);
  } catch (e) {
    await client.close();
    throw e;
  }

  return client;
};

export default async () => {
  // tslint:disable-next-line
  console.log("\nStarting EdgeDB test cluster...");

  const denoStatusFile = generateStatusFileName("deno");
  console.log("deno status file:", denoStatusFile);
  const denoArgs = getServerCommand(getWSLPath(denoStatusFile));
  if (denoArgs.includes("--generate-self-signed-cert")) {
    denoArgs.push("--binary-endpoint-security=optional");
  }
  const denoPromise = startServer(denoArgs, denoStatusFile);

  const statusFile = generateStatusFileName("node");
  console.log("node status file:", statusFile);

  const args = getServerCommand(getWSLPath(statusFile));
  const {proc, config} = await startServer(args, statusFile);
  // @ts-ignore
  global.edgedbProc = proc;

  const {proc: denoProc, config: denoConfig} = await denoPromise;
  // @ts-ignore
  global.edgedbDenoProc = denoProc;

  process.env._JEST_EDGEDB_CONNECT_CONFIG = JSON.stringify(config);
  process.env._JEST_EDGEDB_DENO_CONNECT_CONFIG = JSON.stringify(denoConfig);

  // @ts-ignore
  global.edgedbConn = await connectToServer(config);
  // @ts-ignore
  global.edgedbDenoConn = await connectToServer(denoConfig);

  // tslint:disable-next-line
  console.log(`EdgeDB test cluster is up [port: ${config.port}]...`);
};
