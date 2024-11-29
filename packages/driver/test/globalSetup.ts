import * as process from "process";
import {
  connectToServer,
  generateStatusFileName,
  getServerCommand,
  getWSLPath,
  startServer,
  ConnectConfig,
} from "./testUtil";

export default async () => {
  // tslint:disable-next-line
  console.log("\nStarting EdgeDB test cluster...");

  const statusFile = generateStatusFileName("node");
  console.log("Node status file:", statusFile);

  const { args, availableFeatures } = getServerCommand(getWSLPath(statusFile));
  console.log(`Starting server...`);
  const { proc, config } = await startServer(args, statusFile);

  const { client, version } = await connectToServer(config);

  const jestConfig: ConnectConfig = {
    ...config,
    user: version.major >= 6 ? "admin" : "edgedb",
  };

  // @ts-ignore
  global.edgedbProc = proc;

  process.env._JEST_EDGEDB_CONNECT_CONFIG = JSON.stringify(jestConfig);
  process.env._JEST_EDGEDB_AVAILABLE_FEATURES =
    JSON.stringify(availableFeatures);

  // @ts-ignore
  global.edgedbConn = client;
  process.env._JEST_EDGEDB_VERSION = JSON.stringify(version);

  const availableExtensions = (
    await client.query<{
      name: string;
      version: { major: number; minor: number };
    }>(`select sys::ExtensionPackage {name, version}`)
  ).map(({ name, version }) => [name, version]);
  process.env._JEST_EDGEDB_AVAILABLE_EXTENSIONS =
    JSON.stringify(availableExtensions);

  // tslint:disable-next-line
  console.log(`EdgeDB test cluster is up [port: ${jestConfig.port}]...`);
};
