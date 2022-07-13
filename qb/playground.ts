// tslint:disable:no-console
import {setupTests} from "./test/setupTeardown";
import e from "./dbschema/edgeql-js";
import {LocalDate} from "edgedb";

async function run() {
  const {client, data} = await setupTests();
  const query = e.range(0, 8);

  console.log(query.toEdgeQL());
  const result = await query.run(client);
  console.log(result.lower);
  console.log(result.upper);
  console.log(result.isEmpty);
  console.log(result.incLower);
  console.log(result.incUpper);

  console.log(`~~~~~~~~~~~~~~~~~~~~~~~~~~~`);
  console.log(JSON.stringify(result, null, 2));
}

run();
export {};

interface App {
  [k: string]: unknown;
}
interface App {
  test: string;
}

const arg: App = {
  test: "asdf",
};
function test(arg: App) {
  arg.test;
}
const arg2: {} = "asdf";
