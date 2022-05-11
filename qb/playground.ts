// tslint:disable:no-console
import type * as edgedb from "edgedb";
import {setupTests} from "./test/setupTeardown";
// import e, {$infer} from "./dbschema/edgeql-js";
// import {Movie} from "./dbschema/edgeql-js/types";
import e, * as types from "./dbschema/edgeql-js/index";

async function run() {
  const {client, data} = await setupTests();
  console.log(e.Movie["*"]);
  const query = e.insert(e.Movie, {
    title: "Iron Man",
    release_year: 1234,
    characters: e.select(e.Hero, hero => ({
      "@character_name": e.str("Iron Man"),
      filter: e.op(hero.name, "=", "Iron Man"),
    })),
  });

  const hello = e.select("hello world");
  const movie = e.insert(e.Movie, {
    title: hello,
  });
  console.log(query.toEdgeQL());
  const result = await query.run(client);
  console.log(result);
}

run();
export {};
