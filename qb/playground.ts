// tslint:disable:no-console
import {setupTests} from "./test/setupTeardown";
import e from "./dbschema/edgeql-js";
import {LocalDate, Range} from "edgedb";

async function run() {
  const {client, data} = await setupTests();
  const query = e.range(Range.empty());

  console.log(query.toEdgeQL());
  const result = await query.run(client);
  console.log(result.lower);
  console.log(result.upper);
  console.log(result.isEmpty);
  console.log(result.incLower);
  console.log(result.incUpper);

  e.range(e.cast(e.int64, e.set()), e.cast(e.int64, e.set()));
  console.log(
    e.range(new LocalDate(1970, 1, 1), new LocalDate(2022, 1, 1)).toEdgeQL()
  );

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
