// tslint:disable:no-console

import {setupTests} from "./test/setupTeardown";
import e from "./dbschema/edgeql-js";

async function run() {
  const {client, data} = await setupTests();

  const query = e.group(e.Movie, movie => {
    const title = movie.title;
    const len = e.len(movie.title);
    const ccc = e.op(len, "+", 4);

    return {
      ccc,
      ccc2: ccc,
      len,
      len2: len,
    };
  });
  // const query = e.select({
  //   grp,
  //   grp2: grp,
  // });
  console.log(`\n#############\n### QUERY ###\n#############`);
  console.log(query.toEdgeQL());
  const result = await query.run(client);

  console.log(`~~~~~~~~~~~~~~~~~~~~~~~~~~~`);
  console.log(JSON.stringify(result, null, 2));
}

run();
export {};
