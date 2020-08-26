import * as process from "process";
import * as child_process from "child_process";

import connect from "../src/index.node";

type PromiseCallback = () => void;

export default async () => {
  // tslint:disable-next-line
  console.log("\nStarting EdgeDB test cluster...");

  let ok: ((_: [string, number]) => void) | null = null;
  let err: ((_: string) => void) | null = null;
  let stdoutData: string = "";
  let stderrData: string = "";

  const done = new Promise<[string, number]>((resolve, reject) => {
    ok = resolve;
    err = reject;
  });

  let srvcmd = "edgedb-server";
  if (process.env.EDGEDB_SLOT) {
    srvcmd = `${srvcmd}-${process.env.EDGEDB_SLOT}`;
  }

  const proc = child_process.spawn(srvcmd, [
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
        err = null;
        ok([runtimeData.runstate_dir, parseInt(runtimeData.port, 10)]);
      } else {
        throw new Error("'done' promise isn't initialized");
      }
    }
  });
  proc.stderr.on("data", (data) => {
    // only collect until we detect the start
    if (err) {
      stderrData += data;
    }
  });
  proc.on("exit", (code, signal) => {
    if (err) {
      // only catch early exit
      console.log("--- EdgeDB output start ---");
      console.log(stdoutData);
      console.log(stderrData);
      console.log("--- EdgeDB output end ---");
      err(
        `EdgeDB exited prematurely with ` + `code ${code} or signal ${signal}`
      );
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
