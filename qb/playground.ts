// tslint:disable:no-console
import type * as edgedb from "edgedb";
import {setupTests} from "./test/setupTeardown";
// import e, {$infer} from "./dbschema/edgeql-js";
// import {Movie} from "./dbschema/edgeql-js/types";
import e, * as types from "./dbschema/edgeql-js/index";

async function run() {
  const {client, data} = await setupTests();
  console.log(e.Movie["*"]);
  const query = e.select(e.Movie, movie => ({
    ...e.Movie["*"],
  }));

  console.log(query.toEdgeQL());
  const result = await query.run(client);
  console.log(result);
}

run();
export {};
