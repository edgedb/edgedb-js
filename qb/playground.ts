// tslint:disable:no-console

import {setupTests} from "./test/setupTeardown";
import e from "./dbschema/edgeql-js";
import type {PathParent} from "../src/reflection";

async function run() {
  const {client} = await setupTests();
  console.log(`~~~~~~~~~~~~~~~~~~~~~~~~~~~`);

  const query = e.select(e.Person, person => ({
    movies: e.select(person["<characters[is Movie]"], m => ({
      title: true,
      "@character_name": true,
    })),
  }));
  console.log(query.toEdgeQL());
  const result = await query.run(client);
  console.log(JSON.stringify(result, null, 2));
}

run();
