import * as process from "node:process";
import { spawn } from "node:child_process";
import {
  connectToServer,
  generateStatusFileName,
  getServerCommand,
  getWSLPath,
  startServer,
  ConnectConfig,
} from "./testUtil";
import globalTeardown from "./globalTeardown";

(async () => {
  // export default async () => {
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
  globalThis.edgedbProc = proc;
  process.env._JEST_EDGEDB_CONNECT_CONFIG = JSON.stringify(jestConfig);
  process.env._JEST_EDGEDB_AVAILABLE_FEATURES =
    JSON.stringify(availableFeatures);

  // @ts-ignore
  globalThis.edgedbConn = client;
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

  // Run Node tests
  console.log("Running Node tests...");
  const nodeTest = spawn("npx", ["jest", "--detectOpenHandles"], {
    stdio: "inherit",
    env: {
      ...process.env,
      NODE_OPTIONS: "--experimental-global-webcrypto --experimental-vm-modules",
    },
  });

  await new Promise((resolve, reject) => {
    nodeTest.on("close", (code) => {
      if (code === 0) {
        console.log("Node tests completed successfully.");
        resolve(null);
      } else {
        reject(new Error(`Node tests failed with exit code ${code}`));
      }
    });
  });

  // Run Deno tests
  console.log("Running Deno tests...");
  const denoTest = spawn(
    "deno",
    [
      "test",
      "--allow-all",
      "--unstable-sloppy-imports",
      "--unstable-detect-cjs",
      "test/client.test.ts",
      "test/credentials.test.ts",
    ],
    {
      stdio: "inherit",
      env: {
        ...process.env,
      },
    },
  );

  await new Promise((resolve, reject) => {
    denoTest.on("close", (code) => {
      if (code === 0) {
        console.log("Deno tests completed successfully.");
        resolve(null);
      } else {
        reject(new Error(`Deno tests failed with exit code ${code}`));
      }
    });
  });

  await globalTeardown();
})();
