export default async () => {
  // @ts-ignore
  const proc = global.edgedbProc;
  // @ts-ignore
  const conn = global.edgedbConn;
  // tslint:disable-next-line
  console.log("Shutting down EdgeDB test cluster...");

  await conn.close();

  try {
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
  } finally {
    // tslint:disable-next-line
    console.log("EdgeDB test cluster is down...");
  }
};
