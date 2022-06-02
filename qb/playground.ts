// tslint:disable:no-console

import {setupTests} from "./test/setupTeardown";
import e from "./dbschema/edgeql-js";

async function run() {
  const {client, data} = await setupTests();
  const query = e.select(e.Movie, movie => {
    const titlelen = e.len(movie.title);
    return {
      titlelen,
      movies: e.select(e.Movie, m2 => {
        return {
          t2: titlelen,
          t1: titlelen,
          filter: e.op(movie.title, "=", m2.title),
        };
      }),
    };
  });
  console.log(query.toEdgeQL());
  const result = await query.run(client);
  console.log(result);
}

run();
export {};
