// tslint:disable:no-console

import {setupTests} from "./test/setupTeardown";
import e from "./dbschema/edgeql-js";

async function run() {
  const {client} = await setupTests();
  console.log(`~~~~~~~~~~~~~~~~~~~~~~~~~~~`);

  // const query = e.for(e.Bag, bag => {});
  const query = e.select(e.Movie, movie => ({
    id: true,
    title: true,
    filter: e.op(movie.genre, "=", e.Genre.Action),
  }));
  console.log(query.toEdgeQL());
  const result = await query.run(client);
  console.log(JSON.stringify(result, null, 2));
}

run();
