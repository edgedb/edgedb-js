// tslint:disable:no-console
import {setupTests} from "./test/setupTeardown";
import e from "./dbschema/edgeql-js";
import {createClient, Duration, IsolationLevel} from "edgedb";

async function run() {
  await setupTests();

  const client = createClient();
  const query = e.datetime(new Date());

  console.log(query.toEdgeQL());
  const result = await query.run(client);
  console.log(result);
}

run();
