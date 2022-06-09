// tslint:disable:no-console

import {setupTests} from "./test/setupTeardown";
import e from "./dbschema/edgeql-js";
import {insert} from "dist";
// import type {objectTypeToSelectShape} from "dbschema/edgeql-js/syntax/select";

async function run() {
  const {client, data} = await setupTests();
  // type asdf = objectTypeToSelectShape<typeof e["Movie"]["__element__"]>;

  // const group = e.select({outer: e.select({inner: e.str("asdf")})});
  // const query = e.select(group, arg => ({
  //   qwer: arg.outer.inner[0],
  //   outer: {
  //     inner: true,
  //     upper: e.str_upper(arg.outer.inner),
  //   },
  // }));

  const inserted = e.insert(e.Movie, {
    title: "Iron Man 3",
    release_year: 2013,
    characters: e.select(e.Hero, hero => ({
      filter: e.op(hero.name, "=", "Iron Man"),
      "@character_name": e.str("Tony Stark"),
    })),
  });

  const query = e.select(inserted, () => ({
    characters: {
      name: true,
      "@character_name": true,
    },
  }));

  console.log(`\n#############\n### QUERY ###\n#############`);
  console.log(query.toEdgeQL());
  const result = await query.run(client);

  console.log(`~~~~~~~~~~~~~~~~~~~~~~~~~~~`);
  console.log(JSON.stringify(result, null, 2));
}

run();
export {};
