import { shutdown } from "../../driver/test/testUtil";

export default async () => {
  // tslint:disable-next-line
  console.log("Shutting down Gel test cluster...");

  try {
    // @ts-ignore
    await shutdown(global.edgedbProc, global.edgedbConn);
  } finally {
    // tslint:disable-next-line
    console.log("Gel test cluster is down...");
  }
};
