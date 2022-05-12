// tslint:disable:no-console
import {setupTests} from "./test/setupTeardown";
import e from "./dbschema/edgeql-js";

async function run() {
  const {client, data} = await setupTests();
  const query = e.insert(e.Bag, {
    stringsMulti: ["asdf"],
    jsonField: undefined,
    int16Field: undefined,
  });
  console.log(query.toEdgeQL());
  const result = await query.run(client);

  console.log(`~~~~~~~~~~~~~~~~~~~~~~~~~~~`);
  console.log(JSON.stringify(result, null, 2));
}

run();
export {};
