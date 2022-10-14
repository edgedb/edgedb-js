// tslint:disable:no-console
import {setupTests} from "./test/setupTeardown";
import e from "./dbschema/edgeql-js";

async function run() {
  const {client} = await setupTests();
  const query = e.delete(e.Movie, () => ({
    filter_single: {id: "00000000-0000-0000-0000-000000000000"}
  }));

  console.log(query.toEdgeQL());

  const result = await query.run(client);

  console.log(result);
}

run();
