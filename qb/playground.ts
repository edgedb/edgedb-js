// tslint:disable:no-console

import {setupTests, tc} from "./test/setupTeardown";
import * as edgedb from "edgedb";
import e from "./dbschema/edgeql-js";

async function run() {
  const {client} = await setupTests();

  const query = e.str("Hello world");
  const result = await query.run(client);
  console.log(query.toEdgeQL());
  // const result = await query.run(client);

  console.log(`~~~~~~~~~~~~~~~~~~~~~~~~~~~`);
  console.log(JSON.stringify(result, null, 2));
}

run();
