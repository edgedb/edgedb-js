import {createClient} from "edgedb";
import {freeShape} from "./freeShape.edgeql.mjs";

async function run() {
  const client = await createClient();
  const movies = await freeShape(client, {data: "hi mom"});

  if (movies.data === "hi mom") {
    console.log(`Success: --esm`);
  } else {
    throw new Error("Failure: --esm");
  }
}

run();
