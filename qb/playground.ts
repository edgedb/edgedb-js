// tslint:disable:no-console
import e from "./generated/example";
import {setupTests, teardownTests} from "./test/setupTeardown";

async function run() {
  await teardownTests();
  await setupTests();
}
run();
export {};
