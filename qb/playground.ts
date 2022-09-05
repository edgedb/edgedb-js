// tslint:disable:no-console

import {setupTests} from "./test/setupTeardown";
import e from "./dbschema/edgeql-js";

async function run() {
  const {client} = await setupTests();
  console.log(`~~~~~~~~~~~~~~~~~~~~~~~~~~~`);

  // const query = e.for(e.Bag, bag => {});

  const query = e.select(e.Movie.characters, c => {
    console.log(c["@character_name"].__cardinality__);
    return {
      name: true,
      // ["@character_name"]: true,
    };
  });
  console.log(query.toEdgeQL());
  const result = await query.run(client);
  console.log(JSON.stringify(result, null, 2));
}

run();
