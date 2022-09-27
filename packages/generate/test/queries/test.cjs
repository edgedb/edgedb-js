const {createClient} = require("edgedb");
const {getMoviesStarring} = require("./getMoviesStarring.edgeql.js");

async function run() {
  const client = createClient();
  const movies = await getMoviesStarring(client, {name: "Iron Man"});

  if (movies.length === 2) {
    console.log(`Success: --cjs`);
  } else {
    throw new Error("Failure: --cjs");
  }
}

run();
