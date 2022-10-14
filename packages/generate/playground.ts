// tslint:disable:no-console
import {setupTests} from "./test/setupTeardown";
import e from "./dbschema/edgeql-js";
import type {Movie, helper} from "./dbschema/interfaces";

async function run() {
  const {client, data} = await setupTests();
  // type lkj  = types.Movie extends object ? true : false;
  type asdf = helper.Links<Movie>;

  const query = e.select(e.Movie, m => ({
    filter_single: {
      id: m.id
    }
  }));

  console.log(query.toEdgeQL());

  const result = await query.run(client);

  console.log(result);
}

run();
