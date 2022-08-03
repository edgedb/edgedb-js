// tslint:disable:no-console

import {setupTests} from "./test/setupTeardown";
import e from "./dbschema/edgeql-js";

async function run() {
  const {client} = await setupTests();
  console.log(`~~~~~~~~~~~~~~~~~~~~~~~~~~~`);

  const query = e.params({genre: e.Genre}, $ =>
    e.insert(e.Movie, {
      title: "asdf",
      genre: $.genre,
    })
  );
  console.log(query.toEdgeQL());
  const result = await query.run(client, {genre: "Action"});
  console.log(result);
}

run();
