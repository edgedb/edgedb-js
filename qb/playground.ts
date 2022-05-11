// tslint:disable:no-console

import {setupTests} from "./test/setupTeardown";

// import e, {$infer} from "./dbschema/edgeql-js";
// import {Movie} from "./dbschema/edgeql-js/types";
import e from "./dbschema/edgeql-js/index";
import type {TypeSet} from "edgedb/dist/reflection";

async function run() {
  const {client, data} = await setupTests();

  e.insert(e.Movie, {
    title: "Iron Man",
    release_year: 2008,
    characters: e.select(e.Person, person => ({
      filter: e.op(person.name, "=", "Robert Downey Jr."),
      "@character_name": "Tony Stark",
    })),
  });

  const query = e.insert(e.Movie, {
    title: `${Math.random()}`,
    release_year: 2021,
    characters: e.insert(e.Hero, {
      name: "Killian",
      "@character_name": "Robert Downey Jr.",
    }),
  });

  // const query = e.insert(e.Movie, {
  //   title: `${Math.random()}`,
  //   release_year: 2021,
  //   characters: e.select(e.Person, person => ({
  //     filter: e.op(person.name, "=", "Robert Downey Jr."),
  //     "@character_name": e.str("Iron Man"),
  //   })),
  // });
  console.log(query.toEdgeQL());

  const result = await query.run(client);
  console.log(result);
}

run();
export {};
