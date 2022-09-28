const {createClient} = require("edgedb");
const {freeShape} = require("./freeShape.edgeql.js");

async function run() {
  const client = await createClient();
  const movies = await freeShape(client, {data: "hello world"});

  if (movies.data === "hello world") {
    console.log(`Success: --target cjs`);
  } else {
    throw new Error("Failure: --cjs");
  }
}

run();
