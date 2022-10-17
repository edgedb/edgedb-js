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

// enum Genre {
//   Action = "Action"
// }
async function run() {
  const {client} = await setupTests();

  const query = e.cast(e.Genre, e.str("Horror"));

  console.log(query.toEdgeQL());

  const result = await query.run(client);

  console.log(result);
}

run();
