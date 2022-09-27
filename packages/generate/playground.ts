// tslint:disable:no-console
import {setupTests} from "./test/setupTeardown";
import {getMoviesStarring} from "./test/queries/getMoviesStarring.edgeql";

async function run() {
  const {client} = await setupTests();

  const movies = await getMoviesStarring(client, {name: "Robert Downey Jr."});
  console.log(JSON.stringify(movies, null, 2));

  //   await setupTests();

  //   const client = createClient();
  //   const query = e.datetime(new Date());

  //   console.log(query.toEdgeQL());
  //   const result = await query.run(client);
  //   console.log(result);
}

run();
