// tslint:disable:no-console
import {setupTests} from "./test/setupTeardown";
import e from "./dbschema/edgeql-js";
import {createClient} from "edgedb";

async function run() {
  await setupTests();

  const client = createClient();

  const query = e.set(...[]);

  console.log(query.toEdgeQL());
  const result = await query.run(client);
  console.log(result);
}

run();
