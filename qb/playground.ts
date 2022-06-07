// tslint:disable:no-console

import {setupTests} from "./test/setupTeardown";
import e from "./dbschema/edgeql-js";

async function run() {
  const {client, data} = await setupTests();

  const query = e.group(e.Movie, movie => {
    const title = e.len(movie.title);

    return {
      title1: title,
      title2: title,
      title3: title,
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
