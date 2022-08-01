// tslint:disable:no-console

import {setupTests} from "./test/setupTeardown";
import e from "./dbschema/edgeql-js";

async function run() {
  const {client} = await setupTests();
  console.log(`~~~~~~~~~~~~~~~~~~~~~~~~~~~`);

  const insertHero = e.insert(e.Hero, {
    id: "00000000-0000-0000-0000-000000000000",
    name: "asdf",
  });
  console.log(insertHero.toEdgeQL());
  await insertHero.run(client);

  const query = e.delete(e.Hero, hero => ({
    filter: e.op(hero.id, "=", e.uuid("00000000-0000-0000-0000-000000000000")),
  }));
  console.log(query.toEdgeQL());
  const result = await query.run(client);
  console.log(result);
}

run();
