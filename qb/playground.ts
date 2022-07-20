// tslint:disable:no-console

import {setupTests, tc} from "./test/setupTeardown";
import * as edgedb from "edgedb";
import e from "./dbschema/edgeql-js";

async function run() {
  const {client} = await setupTests();

  console.log(
    await client.query(
      `
  select <str>$val;
  select <int64>$num;
`,
      {val: "asdf", num: 1234}
    )
  );
  const query = e.str("Hello world");
  const result = await query.run(client);
  console.log(query.toEdgeQL());
  // const result = await query.run(client);

  console.log(`~~~~~~~~~~~~~~~~~~~~~~~~~~~`);
  console.log(JSON.stringify(result, null, 2));
}

run();
