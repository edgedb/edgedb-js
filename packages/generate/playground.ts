// tslint:disable:no-console
import {setupTests} from "./test/setupTeardown";
import e from "./dbschema/edgeql-js";

async function run() {
  const {client} = await setupTests();

  const movies = await e.select(e.Movie, movie => ({
    title: true,
    characters: {name: true},
    filter_single: e.op(movie.title, "=", "The Matrix")
  }));

  const result = await movies.run(client);
  console.log(result);
}

run();
