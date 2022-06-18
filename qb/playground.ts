// tslint:disable:no-console
import {setupTests} from "./test/setupTeardown";
import e, {$infer} from "./dbschema/edgeql-js/index";
import type {TypeSet} from "edgedb/dist/reflection";

async function run() {
  const {client, data} = await setupTests();
  const query = e.select(e.global.uuid_global);

  console.log(query.toEdgeQL());
  const result = await query.run(client);

  console.log(`~~~~~~~~~~~~~~~~~~~~~~~~~~~`);
  console.log(JSON.stringify(result, null, 2));
}

run();
export {};
