import { shutdown } from "../../driver/test/testUtil";

export default async () => {
  console.log("Shutting down EdgeDB test cluster...");

  try {
    await shutdown(global.edgedbProc, global.edgedbConn);
  } finally {
    console.log("EdgeDB test cluster is down...");
  }
};
