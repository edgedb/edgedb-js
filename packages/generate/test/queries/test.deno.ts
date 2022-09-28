import {createClient} from "edgedb";
import {freeShape} from "./freeShape.edgeql.ts";

async function run() {
  const client = await createClient();
  const movies = await freeShape(client, {data: "sup"});

  if (movies.data === "sup") {
    console.log(`Success: --deno`);
    Deno.exit();
  } else {
    throw new Error("Failure: --deno");
  }
}

run();
