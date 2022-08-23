import {spawn} from "child_process";
import * as process from "process";
import * as child_process from "child_process";
import * as path from "path";
import * as os from "os";
import * as fs from "fs";
import * as readline from "readline";
import type {ConnectConfig} from "../src/conUtils";

import {Client, createClient} from "../src/index.node";
import type {EdgeDBVersion} from "./testbase";

export const getServerInfo = async (
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

export const getWSLPath = (wslPath: string): string => {
  return wslPath
    .replace(/^([a-z]):/i, "/mnt/$1")
    .split("\\")
    .join("/")
    .toLowerCase();
};

const generateTempID = (): number => {
  return Math.floor(Math.random() * 999999999);
};

export const generateStatusFileName = (tag: string): string => {
  return path.join(
    os.tmpdir(),
    `edgedb-js-status-file-${tag}-${generateTempID()}`
  );
};

export const getServerCommand = (
  statusFile: string
): {args: string[]; availableFeatures: string[]} => {
  const availableFeatures: string[] = [];
  let srvcmd = `edgedb-server`;
  if (process.env.EDGEDB_SERVER_BIN) {
    srvcmd = process.env.EDGEDB_SERVER_BIN;
  }

  let args = [srvcmd];
  if (process.platform === "win32") {
    args = ["wsl", "-u", "edgedb", ...args];
  }

  const helpCmd = [...args, "--help"];
  const help = child_process.execSync(helpCmd.join(" "));

  if (help.includes("--tls-cert-mode")) {
    args.push("--tls-cert-mode=generate_self_signed");
  } else if (help.includes("--generate-self-signed-cert")) {
    args.push("--generate-self-signed-cert");
  }

  if (help.includes("--auto-shutdown-after")) {
    args.push("--auto-shutdown-after=0");
  } else {
    args.push("--auto-shutdown");
  }

  if (help.includes("--admin-ui")) {
    args.push("--http-endpoint-security=optional");
    args.push("--jws-key-file", path.join(__dirname, "keys", "public.pem"));
    args.push("--jwe-key-file", path.join(__dirname, "keys", "private.pem"));

    availableFeatures.push("binary-over-http");
  }

  args = [
    ...args,
    "--bind-address=127.0.0.1",
    "--bind-address=::1", // deno on some platforms resolves localhost to ::1
    "--temp-dir",
    "--testmode",
    "--port=auto",
    "--emit-server-status=" + statusFile,
    "--security=strict",
    "--bootstrap-command=ALTER ROLE edgedb { SET password := 'edgedbtest' }",
  ];

  return {args, availableFeatures};
};

export const startServer = async (
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
    proc.stdout.on("data", data => {
      console.log(data);
      process.stdout.write(data.toString());
    });
  }

  proc.stderr.on("data", data => {
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
  for (let i = 0; i < 1000; i++) {
    runtimeData = await getServerInfo(statusFile);

    if (runtimeData == null) {
      await new Promise(resolve => setTimeout(resolve, 1_000));
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
    host: "localhost",
    port: runtimeData.port,
    user: "edgedb",
    password: "edgedbtest",
    database: "edgedb",
    tlsSecurity: "no_host_verification",
  };

  if (typeof runtimeData.tls_cert_file === "string") {
    config.tlsCAFile = runtimeData.tls_cert_file;
  }

  return {config, proc};
};

export const connectToServer = async (
  config: ConnectConfig
): Promise<{client: Client; version: EdgeDBVersion}> => {
  const client = createClient(config);

  let version: EdgeDBVersion;
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
      CONFIGURE INSTANCE INSERT Auth {
        user := "jest",
        priority := 10,
        method := (INSERT SCRAM),
      };
    `);

    version = await client.queryRequiredSingle(`select sys::get_version()`);
  } catch (e) {
    await client.close();
    throw e;
  }

  return {client, version};
};

export const shutdown = async (
  proc: child_process.ChildProcess,
  client: Client
) => {
  await client.close();

  await new Promise<void>((resolve, reject) => {
    const to = setTimeout(() => {
      // tslint:disable-next-line
      console.error("!!! EdgeDB exit timeout... !!!");
      proc.kill("SIGTERM");
    }, 30_000);

    proc.on("exit", (code: number, signal: string) => {
      clearTimeout(to);
      if (signal === "SIGTERM") {
        reject(new Error("edgedb did not shutdown gracefully"));
      } else {
        resolve();
      }
    });

    proc.on("error", (error: Error) => {
      clearTimeout(to);
      reject(error);
    });
  });
};

export async function applyMigrations(
  config: ConnectConfig,
  params?: {flags?: string[]}
) {
  console.log("\nApplying migrations...");

  if (process.platform === "win32") {
    await runCommand("wsl", [
      "-u",
      "edgedb",
      "env",
      ...Object.entries(configToEnv(config)).map(
        ([key, val]) => `${key}=${val}`
      ),
      "edgedb",
      "migrate",
      ...(params?.flags || []),
      "--schema-dir",
      getWSLPath(path.join(process.cwd(), "dbschema")),
    ]);
  } else {
    await runCommand(
      "edgedb",
      ["migrate", ...(params?.flags || [])],
      configToEnv(config)
    );
  }
}

export async function generateQB(config: ConnectConfig) {
  console.log(`\nGenerating query builder...`);

  await runCommand(
    "yarn",
    ["edgeql-js", "--force-overwrite"],
    configToEnv(config)
  );
}

export async function runTests(config: ConnectConfig) {
  console.log(`\nRunning tests...`);
  await runCommand("yarn", ["test:deno"], configToEnv(config));
  await runCommand("yarn", ["test:cjs"], configToEnv(config));
  await runCommand("yarn", ["test:esm"], configToEnv(config));
  await runCommand("yarn", ["test:mts"], configToEnv(config));
  await runCommand("yarn", ["test"], configToEnv(config));
}

export async function runCommand(
  command: string,
  args: string[] = [],
  env?: {[key: string]: string | undefined}
): Promise<void> {
  const proc = spawn(command, args, {
    stdio: ["pipe", "inherit", "inherit"],
    shell: true,
    env: {
      ...process.env,
      ...env,
    },
  });

  return new Promise<void>((resolve, reject) => {
    proc.once("exit", code => {
      if (code === 0) {
        resolve();
      } else {
        reject(
          `Command '${command} ${args.join(" ")}' exited with code: ${code}`
        );
      }
    });
    proc.once("error", err => {
      proc.removeAllListeners("exit");
      reject(err);
    });
  });
}

export function configToEnv(config: ConnectConfig): {
  [key: string]: string | undefined;
} {
  return {
    EDGEDB_HOST: config.host,
    EDGEDB_PORT: config.port?.toString(),
    EDGEDB_DATABASE: config.database,
    EDGEDB_USER: config.user,
    EDGEDB_PASSWORD: config.password,
    // EDGEDB_TLS_CA_FILE: config.tlsCAFile,
    // EDGEDB_CLIENT_TLS_SECURITY: config.tlsSecurity,
    EDGEDB_CLIENT_SECURITY: "insecure_dev_mode",
  };
}
