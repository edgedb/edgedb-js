// tslint:disable:no-console

import {setupTests} from "./test/setupTeardown";
import e from "./dbschema/edgeql-js";

async function run() {
  const {client} = await setupTests();
  console.log(`~~~~~~~~~~~~~~~~~~~~~~~~~~~`);

  const query = e
    .insert(e.Movie, {
      title: "Harry Potter",
      rating: 5,
    })
    .unlessConflict(movie => ({
      on: movie.title,
      else: e.update(movie, () => ({
        set: {
          rating: e.op(movie.rating, "+", 1),
        },
      })),
    }));
  console.log(query.toEdgeQL());
  const result = await query.run(client);
  console.log(result);
}

run();
