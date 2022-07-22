// tslint:disable:no-console

import {setupTests} from "./test/setupTeardown";
import e from "./dbschema/edgeql-js";
import {LocalDateTime, Range} from "edgedb";

async function run() {
  const {client} = await setupTests();

  const query = e.str("hello");

  console.log(`~~~~~~~~~~~~~~~~~~~~~~~~~~~`);
  console.log(query.toEdgeQL());
  const result = await query.run(client);
  console.log(result);
}

run();
