import createClient from "../../driver/src/index.node";

import {
  shutdown,
  applyMigrations,
  generateStatusFileName,
  getServerCommand,
  getWSLPath,
  startServer,
  type EdgeDBVersion,
  runCommand,
  configToEnv,
} from "../../driver/test/testUtil";

// @ts-expect-error
import jestConfig from "../jest.config.js";

(async function main() {
  console.log("\nStarting EdgeDB test cluster...");

  const statusFile = generateStatusFileName("node");
  console.log("Node status file:", statusFile);

  const { args } = getServerCommand(getWSLPath(statusFile));

  const { proc, config } = await startServer(args, statusFile);

  console.log(`EdgeDB test cluster is up [port: ${config.port}]...`);

  const managementConn = await createClient(config).ensureConnected();

  const version = await managementConn.queryRequiredSingle<EdgeDBVersion>(
    `select sys::get_version()`
  );

  try {
    await applyMigrations(config, {
      flags:
        version.major < 3
          ? [
              "--to-revision",
              "m1sxhoqfjqn7vtpmatzanmwydtxndf3jlf33npkblmya42fx3bcdoa",
            ]
          : undefined,
    });
    console.log(`\nRunning tests...`);
    await runCommand(
      "yarn",
      [
        "test:ts",
        ...(version.major < 3
          ? [
              `--testPathIgnorePatterns="${[
                "pgvector",
                ...jestConfig.testPathIgnorePatterns,
              ].join("|")}"`,
            ]
          : []),
      ],
      configToEnv(config)
    );
    await runCommand("yarn", ["test:non_ts"], configToEnv(config));
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    console.log("Shutting down EdgeDB test cluster...");
    await shutdown(proc, managementConn);
    console.log("EdgeDB test cluster is down...");
  }
})();
