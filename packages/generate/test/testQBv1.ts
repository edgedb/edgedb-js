import createClient from "../../driver/src/index.node";

import {
  shutdown,
  applyMigrations,
  generateQB,
  generateStatusFileName,
  getServerCommand,
  getWSLPath,
  startServer,
} from "../../driver/test/testUtil";

(async function main() {
  console.log("\nStarting EdgeDB test cluster...");
  const statusFile = generateStatusFileName("node");
  console.log("Node status file:", statusFile);
  const { args } = getServerCommand(getWSLPath(statusFile));

  const { proc, config } = await startServer(args, statusFile);

  console.log(`EdgeDB test cluster is up [port: ${config.port}]...`);

  const managementConn = await createClient(config).ensureConnected();

  try {
    await applyMigrations(config, {
      flags: [
        "--to-revision",
        "m135rscrsthtlntxhacevxtvytgwf2vjyqfwvnwod5jihwpzp2zgyq",
      ],
    });
    await generateQB(config);
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    console.log("Shutting down EdgeDB test cluster...");
    await shutdown(proc, managementConn);
    console.log("EdgeDB test cluster is down...");
  }
})();
