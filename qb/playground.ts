// tslint:disable:no-console

import {setupTests} from "./test/setupTeardown";
import e from "./dbschema/edgeql-js";
import {insert} from "dist";
// import type {objectTypeToSelectShape} from "dbschema/edgeql-js/syntax/select";

async function run() {
  const {client, data} = await setupTests();
  const query = e.group(e.Movie, movie => {
    const release_year = movie.release_year;
    return {
      release_year: true,
      title: true,
      characters: {name: true},
      by: {
        release_year,
      },
    };
  });

  console.log(`\n#############\n### QUERY ###\n#############`);
  console.log(query.toEdgeQL());
  const result = await query.run(client);

  console.log(`~~~~~~~~~~~~~~~~~~~~~~~~~~~`);
  console.log(JSON.stringify(result, null, 2));
}

run();
export {};
