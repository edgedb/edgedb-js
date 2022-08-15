// tslint:disable:no-console

import {setupTests} from "./test/setupTeardown";
import e from "./dbschema/edgeql-js";
import type {objectTypeToSelectShape} from "dbschema/edgeql-js/syntax/select";

async function run() {
  const {client} = await setupTests();
  console.log(`~~~~~~~~~~~~~~~~~~~~~~~~~~~`);

  type MovieSelect = objectTypeToSelectShape<typeof e["Movie"]["__element__"]>;
  const query = e.select(e.Movie, () => ({
    id: true,
    title: true,
    // whatever: e.str("asdf"),
    // asdfasdfasdf: e.int64(1234),
    characters: {
      name: true,
      "<characters[is Movie]": {
        title: true,
        // characters: {
        //   name: true,
        //   "<characters[is Movie]": {
        //     title: true,
        //     // characters: {name: true},
        //   },
        // },
      },
    },
  }));

  console.log(query.toEdgeQL());
  const result = await query.run(client);
  console.log(result);
}

run();
