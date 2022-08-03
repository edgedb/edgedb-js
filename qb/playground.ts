// tslint:disable:no-console

import {setupTests} from "./test/setupTeardown";
import e from "./dbschema/edgeql-js";
import {Genre, sys, schema} from "./dbschema/edgeql-js";

async function run() {
  const {client} = await setupTests();
  console.log(`~~~~~~~~~~~~~~~~~~~~~~~~~~~`);

  console.log(Genre);
  console.log(sys.VersionStage.beta);
  console.log(schema.Cardinality.One);

  // console.log(Genre.Action);
  // console.log(Genre.RomCom);
  const query = e.select(e.Hero, hero => ({
    filter: e.op(hero.name, "=", "Iron Man"),
  }));
  console.log(query.toEdgeQL());
  const result = await query.run(client);
  console.log(result);
}

run();
