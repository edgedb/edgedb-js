// tslint:disable:no-console
import type * as edgedb from "edgedb";
import {setupTests} from "./test/setupTeardown";
// import e, {$infer} from "./dbschema/edgeql-js";
// import {Movie} from "./dbschema/edgeql-js/types";
import e, * as types from "./dbschema/edgeql-js";

async function run() {
  const {client} = await setupTests();
  const query = e.params({raw_data: e.json}, params =>
    e.for(e.json_array_unpack(params.raw_data), item => {
      return e.select({
        title: e.cast(e.str, item.title),
        github_scopes: e.cast(e.array(e.str), item.github_scopes),
      });
    })
  );
  console.log(query.toEdgeQL());
  const result = await query.run(client, {
    raw_data: JSON.stringify([{title: "The Marvels", github_scopes: null}]),
  });
  console.log(result);
}

run();
export {};
