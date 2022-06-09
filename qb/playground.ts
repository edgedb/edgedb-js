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
  // const group = e.group(e.Movie, movie => ({
  //   ry: movie.release_year,
  // }));

  // const query = e.select(group, () => ({
  //   grouping: true,
  //   key: {ry: true},
  //   elements: {
  //     title: true,
  //     release_year: true,
  //   },
  // }));

  const query = e.select(e.Movie.characters, character => ({
    id: true,
    name: true,
    ...e.is(e.Villain, {nemesis: true}),
    ...e.is(e.Hero, {
      secret_identity: true,
      villains: {
        id: true,
        name: true,
        nemesis: nemesis => {
          const nameLen = e.len(nemesis.name);
          return {
            name: true,
            nameLen,
            nameLen2: nameLen,
          };
        },
      },
    }),
  }));

  console.log(`\n#############\n### QUERY ###\n#############`);
  console.log(query.toEdgeQL());
  const result = await query.run(client);

  console.log(`~~~~~~~~~~~~~~~~~~~~~~~~~~~`);
  console.log(JSON.stringify(result, null, 2));
}

run();
export {};
