// tslint:disable:no-console

import {setupTests} from "./test/setupTeardown";
<<<<<<< HEAD
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
=======

// import e, {$infer} from "./dbschema/edgeql-js";
// import {Movie} from "./dbschema/edgeql-js/types";
import e, {$infer} from "./dbschema/edgeql-js/index";
import type {TypeSet} from "edgedb/dist/reflection";

async function run() {
  const {client, data} = await setupTests();
  const g = e.global.str_required;
  type g = $infer<typeof g>;
  e.insert(e.Movie, {
    title: e.global.str_required,
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
>>>>>>> fea53fb (Implement globals)
  console.log(query.toEdgeQL());
  const result = await query.run(client);

  console.log(`~~~~~~~~~~~~~~~~~~~~~~~~~~~`);
  console.log(JSON.stringify(result, null, 2));
}

run();
export {};
