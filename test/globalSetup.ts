import * as process from "process";
import * as child_process from "child_process";

import connect from "../src/index.node";

type PromiseCallback = () => void;

export default async () => {
  // tslint:disable-next-line
  console.log("\nStarting EdgeDB test cluster...");

  let ok: ((_: [string, number]) => void) | null = null;
  let stdoutData: string = "";

  const done = new Promise<[string, number]>((resolve, _reject) => {
    ok = resolve;
  });

  const proc = child_process.spawn("edgedb-server", [
    "--temp-dir",
    "--testmode",
    "--echo-runtime-info",
    "--port=auto",
    "--auto-shutdown",
  ]);

  proc.stdout.on("data", (data) => {
    stdoutData += data;
    const m = stdoutData.match(/\nEDGEDB_SERVER_DATA:(\{[^\n]+\})\n/);
    if (m) {
      const runtimeData = JSON.parse(m[1]);
      process.env._JEST_EDGEDB_PORT = runtimeData.port;
      process.env._JEST_EDGEDB_HOST = runtimeData.runstate_dir;
      if (ok) {
        ok([runtimeData.runstate_dir, parseInt(runtimeData.port, 10)]);
      } else {
        throw new Error("'done' promise isn't initialized");
      }
    }
  });

  // @ts-ignore
  global.edgedbProc = proc;

  const [host, port] = await done;
  const con = await connect({
    host,
    port,
    user: "edgedb",
    database: "edgedb",
    admin: true,
  });

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
  console.log(
    `EdgeDB test cluster is up [port: ${process.env._JEST_EDGEDB_PORT}]...`
  );
};
