// tslint:disable:no-console

import {setupTests} from "./test/setupTeardown";
import e from "./dbschema/edgeql-js";

async function run() {
  const {client} = await setupTests();
  console.log(`~~~~~~~~~~~~~~~~~~~~~~~~~~~`);
  await client.query(
    `
  with languages := <json>$languages
  select json_array_unpack(languages)
`,
    {languages: [{title: "test"}]}
  );

  // const query = e.for(e.Bag, bag => {});
  const query = e.select(e.Movie, () => ({
    title: true,
  }));
  console.log(query.toEdgeQL());
  const result = await query.run(client);
  console.log(JSON.stringify(result, null, 2));
}

run();
