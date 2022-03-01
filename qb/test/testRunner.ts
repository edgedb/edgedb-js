import {spawn} from "child_process";
import path from "path";

import createClient from "../../src/index.node";
import type {ConnectConfig} from "../../src/conUtils";
import {
  generateStatusFileName,
  getServerCommand,
  getWSLPath,
  startServer,
} from "../../test/globalSetup";
import {shutdown} from "../../test/globalTeardown";

(async function main() {
  console.log("\nStarting EdgeDB test cluster...");

  const statusFile = generateStatusFileName("node");
  console.log("Node status file:", statusFile);

  const args = getServerCommand(getWSLPath(statusFile));

  const {proc, config} = await startServer(args, statusFile);

  console.log(`EdgeDB test cluster is up [port: ${config.port}]...`);

  const managementConn = await createClient(config).ensureConnected();

  try {
    await applyMigrations(config);

    await generateQB(config);

    await runTests(config);
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    console.log("Shutting down EdgeDB test cluster...");
    await shutdown(proc, managementConn);
    console.log("EdgeDB test cluster is down...");
  }
})();

async function applyMigrations(config: ConnectConfig) {
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
      "--schema-dir",
      getWSLPath(path.join(process.cwd(), "dbschema")),
    ]);
  } else {
    await runCommand("edgedb", ["migrate"], configToEnv(config));
  }
}

async function generateQB(config: ConnectConfig) {
  console.log(`\nGenerating query builder...`);

  await runCommand(
    "yarn",
    ["edgeql-js", "--force-overwrite"],
    configToEnv(config)
  );
}

async function runTests(config: ConnectConfig) {
  console.log(`\nRunning tests...`);

  await runCommand("yarn", ["test"], configToEnv(config));
}

async function runCommand(
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

function configToEnv(config: ConnectConfig): {
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
