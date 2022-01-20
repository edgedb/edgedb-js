import * as child_process from "child_process";
import {Client} from "../src/index.node";

export const shutdown = async (
  proc: child_process.ChildProcess,
  client: Client
) => {
  await client.close();

  await new Promise<void>((resolve, reject) => {
    const to = setTimeout(() => {
      // tslint:disable-next-line
      console.error("!!! EdgeDB exit timeout... !!!");
      proc.kill("SIGTERM");
    }, 30_000);

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
    // @ts-ignore
    await shutdown(global.edgedbProc, global.edgedbConn);
  } finally {
    // tslint:disable-next-line
    console.log("EdgeDB test cluster is down...");
  }
};
