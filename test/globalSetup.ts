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

  let useAdmin = true;
  let args = [
    "--temp-dir",
    "--testmode",
    "--echo-runtime-info",
    "--port=auto",
    "--auto-shutdown",
  ];

  if (process.platform === "win32") {
    useAdmin = false;
    args = [
      "sudo",
      "-u",
      "edgedb",
      srvcmd,
      ...args,
      "--bootstrap-command=ALTER ROLE edgedb { SET password := ''  }",
    ];
    srvcmd = "wsl";
  }

  const proc = child_process.spawn(srvcmd, args);

  proc.stdout.on("data", (data) => {
    stdoutData += data;
    const m = stdoutData.match(/\nEDGEDB_SERVER_DATA:(\{[^\n]+\})\n/);
    if (m) {
      const runtimeData = JSON.parse(m[1]);

      let host = runtimeData.runstate_dir;
      if (process.platform == "win32") {
        host = "127.0.0.1";
      }

      process.env._JEST_EDGEDB_PORT = runtimeData.port;

      // Use runtimeData.runstate_dir instead of 127.0.0.1 to force
      // testing on the UNIX socket. Deno, however, has problems with
      // that, hence the TCP address.
      process.env._JEST_EDGEDB_HOST = "127.0.0.1";
      if (ok) {
        err = null;
        ok([host, parseInt(runtimeData.port, 10)]);
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
  const con = await connect(undefined, {
    host,
    port,
    user: "edgedb",
    database: "edgedb",
    admin: useAdmin,
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
