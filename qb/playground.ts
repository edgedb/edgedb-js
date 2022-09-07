// tslint:disable:no-console
import {setupTests} from "./test/setupTeardown";
import e from "./dbschema/edgeql-js";

async function run() {
  const {client} = await setupTests();

  const baseShape = e.shape(e.Movie, m => ({
    title: true,
    num_actors: e.count(m),
  }));

  const query = e.select(e.Movie, m => ({
    ...baseShape(m),
    release_year: true,
    filter: e.op(m.title, "=", "The Avengers"),
  }));

  console.log(query.toEdgeQL());
  const result = await query.run(client);
  console.log(result);
}

run();
