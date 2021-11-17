import {shutdown} from "../../test/globalTeardown";

export default async () => {
  if (process.env["EDGEDB_TEST_USE_LOCAL"]) {
    return;
  }
  // tslint:disable-next-line
  console.log("Shutting down EdgeDB test cluster...");

  try {
    await Promise.all([
      shutdown((global as any).edgedbProc, (global as any).edgedbClient),
      // shutdown(gbs.edgedbDenoProc, gbs.edgedbDenoConn),
    ]);
  } finally {
    // tslint:disable-next-line
    console.log("EdgeDB test cluster is down...");
  }
};
