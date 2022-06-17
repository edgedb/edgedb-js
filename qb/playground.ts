// tslint:disable:no-console

import {setupTests} from "./test/setupTeardown";
import e from "./dbschema/edgeql-js";
import {insert} from "dist";
// import type {objectTypeToSelectShape} from "dbschema/edgeql-js/syntax/select";

async function run() {
  const {client, data} = await setupTests();
  const query = e.select(e.Person.is(e.Hero), person => ({
    id: true,
    computable: e.int64(35),
    all_heroes: e.select(e.Hero, () => ({__type__: {name: true}})),
    order_by: person.name,
    limit: 1,
  }));

  console.log(`\n#############\n### QUERY ###\n#############`);
  console.log(query.toEdgeQL());
  const result = await query.run(client);

  console.log(`~~~~~~~~~~~~~~~~~~~~~~~~~~~`);
  console.log(JSON.stringify(result, null, 2));
}

run();
export {};
