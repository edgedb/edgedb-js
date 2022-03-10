// tslint:disable:no-console
import type * as edgedb from "edgedb";
import {setupTests} from "./test/setupTeardown";
// import e, {$infer} from "./dbschema/edgeql-js";
// import {Movie} from "./dbschema/edgeql-js/types";
import e, * as types from "./dbschema/edgeql-js";

async function run() {
  const {client} = await setupTests();
  const query = e.params(
    {
      title: e.str,
      release_year: e.optional(e.int64),
    },
    params => {
      return e.insert(e.Movie, {
        title: params.title,
        release_year: params.release_year,
      });
    }
  );

  const result = await query.run(client, {title: "The Eternals"});
  console.log(JSON.stringify(result, null, 2));
}

run();
export {};
