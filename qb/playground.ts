// tslint:disable:no-console
import e from "./generated/example";
import {setupTests, teardownTests} from "./test/setupTeardown";

async function run() {
  await teardownTests();
  await setupTests();

  // const query = e.select({
  //   asdf: e.select(e.Hero, {
  //     id: true,
  //     name: true,
  //     friends: e.select(e.Hero),
  //   }),
  // });
  // console.log(query.toEdgeQL());
}
run();
export {};
