import {createClient} from "edgedb";
import {getMoviesStarring} from "./getMoviesStarring.edgeql.mjs";

async function run() {
  const client = createClient();
  const movies = await getMoviesStarring(client, {name: "Iron Man"});

  if (movies.length === 2) {
    console.log(`Success: --mts`);
  } else {
    throw new Error("Failure: --mts");
  }
}

run();
