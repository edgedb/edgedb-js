import * as process from "process";
import {
  connectToServer,
  generateStatusFileName,
  getServerCommand,
  getWSLPath,
  startServer,
} from "../../driver/test/testUtil";

export default async () => {
  // tslint:disable-next-line
  console.log("\nStarting EdgeDB test cluster...");

  const statusFile = generateStatusFileName("node");
  console.log("Node status file:", statusFile);

  const { args, availableFeatures } = getServerCommand(
    getWSLPath(statusFile),
    false
  );
  console.log(`Starting server...`);
  const { proc, config } = await startServer(args, statusFile);

  // @ts-ignore
  global.edgedbProc = proc;

  process.env._JEST_EDGEDB_CONNECT_CONFIG = JSON.stringify(config);
  process.env._JEST_EDGEDB_AVAILABLE_FEATURES =
    JSON.stringify(availableFeatures);

  const { client, version } = await connectToServer(config);

  // @ts-ignore
  global.edgedbConn = client;
  process.env._JEST_EDGEDB_VERSION = JSON.stringify(version);

  // tslint:disable-next-line
  console.log(`EdgeDB test cluster is up [port: ${config.port}]...`);
};
