import { shutdown } from "../../driver/test/testUtil";

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
