import {createClient} from "edgedb";
import {getMoviesStarring} from "./getMoviesStarring.edgeql.ts";

async function run() {
  const client = createClient();
  const movies = await getMoviesStarring(client, {name: "Iron Man"});

  if (movies.length === 2) {
    console.log(`Success: --deno`);
    Deno.exit();
  } else {
    throw new Error("Failure: --deno");
  }
}

run();
