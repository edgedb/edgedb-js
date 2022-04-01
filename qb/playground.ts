// tslint:disable:no-console
import type * as edgedb from "edgedb";
import {setupTests} from "./test/setupTeardown";
// import e, {$infer} from "./dbschema/edgeql-js";
// import {Movie} from "./dbschema/edgeql-js/types";
import e, * as types from "./dbschema/edgeql-js/index";

async function run() {
  const {client} = await setupTests();
  const query = e.op(e.Bag.seqField, "=", 1234);
  console.log(query.toEdgeQL());
  const result = await query.run(client);
  console.log(result);
}

run();
export {};
