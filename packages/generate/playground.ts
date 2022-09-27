// tslint:disable:no-console
import {setupTests} from "./test/setupTeardown";
// import e from "./dbschema/edgeql-js";
import {createClient, adapter} from "edgedb";

async function run() {
  const test = await adapter.walk(".", {match: [/\.edgeql$/]});
  console.log(test);
  //   await setupTests();

  //   const client = createClient();
  //   const query = e.datetime(new Date());

  //   console.log(query.toEdgeQL());
  //   const result = await query.run(client);
  //   console.log(result);
}

run();
