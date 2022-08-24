// tslint:disable:no-console

import {setupTests} from "./test/setupTeardown";
import e from "./dbschema/edgeql-js";

async function run() {
  const {client} = await setupTests();
  console.log(`~~~~~~~~~~~~~~~~~~~~~~~~~~~`);

  const query = e.insert(e.Bag, {
    stringsMulti: ["asdf"],
    stringMultiArr: [],
    stringsArr: [],
  });
  console.log(query.toEdgeQL());
  const result = await query.run(client);
  console.log(JSON.stringify(result, null, 2));
}

run();
