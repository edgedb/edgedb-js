// tslint:disable:no-console
import * as edgedb from "edgedb";
import {setupTests} from "./test/setupTeardown";
import e from "./dbschema/edgeql-js";

async function run() {
  const {client} = await setupTests();
  const query = e
    .select(e.Movie, movie => ({
      filter: e.op(movie.title, "=", "The Avengers"),
      title: true,
      characters: {
        name: true,
      },
    }))
    .assert_single();
  const result = await query.run(client);
  console.log(JSON.stringify(result, null, 2));
}

run();
export {};
