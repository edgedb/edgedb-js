import {createClient} from "edgedb";
import {getMoviesStarring} from "./getMoviesStarring.edgeql";

async function run() {
  const client = createClient();
  const movies = await getMoviesStarring(client, {name: "Iron Man"});

  if (movies.length === 2) {
    console.log(`Success: --ts`);
  } else {
    throw new Error("Failure: --ts");
  }
}

run();
