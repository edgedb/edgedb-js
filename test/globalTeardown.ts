import * as child_process from "child_process";
import {Connection} from "../src/ifaces";

const shutdown = async (
  proc: child_process.ChildProcess,
  conn: Connection
) => {
  await conn.close();

  await new Promise<void>((resolve, reject) => {
    const to = setTimeout(() => {
      // tslint:disable-next-line
      console.error("!!! EdgeDB exit timeout... !!!");
      proc.kill("SIGTERM");
    }, 20_000);

    proc.on("exit", (code: number, signal: string) => {
      clearTimeout(to);
      if (signal === "SIGTERM") {
        reject(new Error("edgedb did not shutdown gracefully"));
      } else {
        resolve();
      }
    });

    proc.on("error", (error: Error) => {
      clearTimeout(to);
      reject(error);
    });
  });
};

export default async () => {
  // tslint:disable-next-line
  console.log("Shutting down EdgeDB test cluster...");

  try {
    await Promise.all([
      // @ts-ignore
      shutdown(global.edgedbProc, global.edgedbConn),
      // @ts-ignore
      shutdown(global.edgedbDenoProc, global.edgedbDenoConn),
    ]);
  } finally {
    // tslint:disable-next-line
    console.log("EdgeDB test cluster is down...");
  }
};
