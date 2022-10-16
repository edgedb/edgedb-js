// tslint:disable:no-console
import {setupTests} from "./test/setupTeardown";
import e from "./dbschema/edgeql-js";

import {$, Client} from "edgedb";
export async function getMovie(
  client: Client,
  params: {title: string}
): Promise<{title: string} | null> {
  return client.querySingle(
    `select Movie { title } filter .title = <str>$title;`,
    params
  );
}

async function run() {
  const {client} = await setupTests();

  const types = await $.introspect.types(client);
  for (const type of types.values()) {
    if (type.kind === "object" && type.name === "default::Bag") {
      for (const ptr of type.pointers) {
        const ptrType = types.get(ptr.target_id);
        console.log(`-----------`);
        console.log(ptr.name, ptrType.name);
        if (ptrType.kind === "array") {
          console.log(ptrType);
        }
      }
    }
  }

  const query = e.delete(e.Movie, movie => ({
    filter_single: {id: "00000000-0000-0000-0000-000000000000"},
    asdf: e.op(movie.title, "=", "1234")
  }));

  console.log(query.toEdgeQL());

  const result = await query.run(client);

  console.log(result);
}

run();
