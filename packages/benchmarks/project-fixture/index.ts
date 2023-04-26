import { createClient } from "edgedb";
import * as e from "./dbschema/edgeql-js";

async function run() {
  const client = createClient();
  await e.select(e.Person, {}).run(client);
}

run();
