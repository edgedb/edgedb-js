// tslint:disable:no-console
import * as edgedb from "edgedb";
import {setupTests} from "./test/setupTeardown";
import e from "./dbschema/edgeql-js";

async function run() {
  const {client} = await setupTests();

  const query = await e.insert(e.Movie, {
    title: 'Title" ++ ", injected := (delete Movie)',
  });

  console.log(query.__shape__.title);

  console.log(query.toEdgeQL());
  // const result = await query.run(client);
  // console.log(JSON.stringify(result, null, 2));
}

run();
export {};
