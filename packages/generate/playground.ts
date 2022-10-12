// tslint:disable:no-console
import {setupTests} from "./test/setupTeardown";
import e from "./dbschema/edgeql-js";

async function run() {
  const {client} = await setupTests();

  const query = e.select(e.Hero.name, el => ({
    filter: e.op(el, "ilike", "%man%")
  }));
  console.log(query.toEdgeQL());

  const result = await query.run(client);
  console.log(result);
}

run();
