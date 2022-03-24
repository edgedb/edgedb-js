// tslint:disable:no-console
import type * as edgedb from "edgedb";
import {setupTests} from "./test/setupTeardown";
// import e, {$infer} from "./dbschema/edgeql-js";
// import {Movie} from "./dbschema/edgeql-js/types";
import e, * as types from "./dbschema/edgeql-js/index";

async function run() {
  const {client} = await setupTests();
  const query = e.set(
    e.tuple({a: 1, b: "asdf", c: e.int16(214)}),
    e.tuple({a: 3, b: "asdf", c: e.int64(5)})
  );

  console.log(query.toEdgeQL());
  const result = await query.run(client);
  console.log(result);

  // e.literal(e.tuple({a: e.int16}), )
}

run();
export {};
