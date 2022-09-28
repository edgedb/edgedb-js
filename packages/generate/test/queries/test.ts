import {getMoviesStarring} from "./getMoviesStarring.edgeql";
import {setupTests} from "../setupTeardown";
async function run() {
  const {client} = await setupTests();
  const movies = await getMoviesStarring(client, {name: "Iron Man"});

  if (movies.length === 2) {
    console.log(`Success: --ts`);
  } else {
    throw new Error("Failure: --ts");
  }
}

run();
