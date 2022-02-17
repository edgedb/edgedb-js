// tslint:disable:no-console
import * as edgedb from "edgedb";
import {setupTests} from "./test/setupTeardown";
import e from "./dbschema/edgeql-js";

async function run() {
  const {client} = await setupTests();

  const query = e.select(e.Movie, movie => {
    return {
      title: true,
      genre: true,
      filter: e.op(movie.genre, "=", e.Genre.Action),
    };
  });
  console.log(query.toEdgeQL());
  console.log(JSON.stringify(await query.run(client), null, 2));
}

run();
export {};
