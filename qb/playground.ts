// tslint:disable:no-console

import {setupTests} from "./test/setupTeardown";
// import e, {$infer} from "./dbschema/edgeql-js";
// import {Movie} from "./dbschema/edgeql-js/types";
import e from "./dbschema/edgeql-js/index";

async function run() {
  const {client, data} = await setupTests();
  const query = e.cast(e.json, "asdf");
  console.log(query.toEdgeQL());

  const result = await query.run(client);
  console.log(result);
}

run();
export {};
