// tslint:disable:no-console
import type * as edgedb from "edgedb";
import {setupTests} from "./test/setupTeardown";
// import e, {$infer} from "./dbschema/edgeql-js";
// import {Movie} from "./dbschema/edgeql-js/types";
import e, * as types from "./dbschema/edgeql-js";

async function run() {
  const {client} = await setupTests();
  const query = e
    .insert(e.Movie, {
      title: "The Avengers",
      rating: 11,
    })
    .unlessConflict(movie => ({
      on: e.tuple([movie.title, movie.profile, movie.id]),
      else: e.update(movie, () => ({
        set: {
          rating: 11,
        },
      })),
    }));
  console.log(query.toEdgeQL());
  const result = await query.run(client);
  console.log(result);
}

run();
export {};
