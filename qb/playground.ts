// tslint:disable:no-console
import * as e from "@generated/index";
import {setupTests, teardownTests} from "./test/setupTeardown";

async function run() {
  await teardownTests();
  await setupTests();
  await teardownTests();
}
run();
export {};
