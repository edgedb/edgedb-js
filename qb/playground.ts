// tslint:disable:no-console

import {setupTests} from "./test/setupTeardown";
import e from "./dbschema/edgeql-js";

async function run() {
  const {client} = await setupTests();
  console.log(`~~~~~~~~~~~~~~~~~~~~~~~~~~~`);

  const query = e.select(e.Movie, () => ({
    id: true,
    title: true,
  }));

  console.log(query.toEdgeQL());
  const result = await query.run(client);
  console.log(result);
}

run();
