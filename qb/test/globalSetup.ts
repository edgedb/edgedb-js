import {promises as fs} from "fs";
import util from "util";
import {execSync} from "child_process";

import path from "path";
// import child_process from "child_process";
import {createClient} from "../../src/pool";

import {
  generateStatusFileName,
  getServerCommand,
  getWSLPath,
  startServer,
  connectToServer,
} from "../../test/globalSetup";
import {Client} from "../../src/ifaces";
import {ConnectConfig} from "../../src/con_utils";
import {shutdown} from "../../test/globalTeardown";

async function applyMigrations(client: Client) {
  const migration = await fs.readFile(
    path.join(__dirname, "../dbschema/migrations/00001.edgeql"),
    "utf8"
  );
  const cmds = [];
  const lines = migration.split("\n").slice(3, -2);
  let curr = [];
  for (const line of lines) {
    curr.push(line);
    if (/^  \S.*;$/.test(line)) {
      cmds.push(curr.join("\n"));
      curr = [];
    }
  }
  console.log(`Applying migrations...`);
  for (const cmd of cmds) {
    try {
      await client.execute(cmd);
    } catch (err) {
      console.log(err);
    }
  }
  console.log(`Migrations applied.`);
}

async function generateQB(config: ConnectConfig) {
  console.log(`Generating query builder...`);
  const genCmd = [
    `yarn generate`,
    `--host ${config.host}`,
    `--port ${config.port}`,
    `--user ${config.user}`,
    `--database ${config.database}`,
    `--tls-security ${config.tlsSecurity}`,
    `--tls-ca-file ${config.tlsCAFile}`,

    `--force-overwrite`,
  ];

  console.log(genCmd.join(" "));
  execSync(genCmd.join(" "));
  return "done";
}

export default async () => {
  if (process.env["EDGEDB_TEST_USE_LOCAL"]) {
    console.log(`\nSkipping EdgeDB test cluster initialization.`);
    return;
  }
  // tslint:disable-next-line
  console.log("\nStarting EdgeDB test cluster...");

  // const denoStatusFile = generateStatusFileName("deno");
  // console.log("Deno status file:", denoStatusFile);
  // const denoArgs = getServerCommand(getWSLPath(denoStatusFile));
  // if (denoArgs.includes("--generate-self-signed-cert")) {
  //   denoArgs.push("--binary-endpoint-security=optional");
  // }
  // const denoPromise = startServer(denoArgs, denoStatusFile);
  // const {proc: denoProc, config: denoConfig} = await denoPromise;
  // @ts-ignore
  // global.edgedbDenoProc = denoProc;
  // process.env._JEST_EDGEDB_DENO_CONNECT_CONFIG = JSON.stringify(denoConfig);
  // @ts-ignore
  // global.edgedbDenoConn = await connectToServer(denoConfig);

  const statusFile = generateStatusFileName("node");
  console.log("Node status file:", statusFile);
  const args = getServerCommand(getWSLPath(statusFile));
  const {proc, config} = await startServer(args, statusFile);
  // @ts-ignore
  global.edgedbProc = proc;
  process.env._JEST_EDGEDB_CONNECT_CONFIG = JSON.stringify(config);

  const client = await createClient(config);
  // @ts-ignore
  global.edgedbClient = client;

  await applyMigrations(client);

  // tslint:disable-next-line
  console.log(`EdgeDB test cluster is up [port: ${config.port}]...`);
};

// the query builder must be generated
// prior to "yarn test". otherwise the generated
// TS files are not recognized. this is true even if the
// files are generated during "globalSetup".
async function prejestSetup() {
  console.log(`Pre-Jest setup...`);
  const statusFile = generateStatusFileName("node");
  const args = getServerCommand(getWSLPath(statusFile));
  const {proc, config} = await startServer(args, statusFile);
  const client = await createClient(config);
  await applyMigrations(client);
  await generateQB(config);
  await shutdown(proc, client);

  const outpath = path.join(__dirname, "../dbschema/edgeql");
}

if (require.main === module) {
  prejestSetup();
}
