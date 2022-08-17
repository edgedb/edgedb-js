// tslint:disable:no-console

import {setupTests} from "./test/setupTeardown";
import e from "./dbschema/edgeql-js";
import type {PathParent} from "../src/reflection";

async function run() {
  const {client} = await setupTests();
  console.log(`~~~~~~~~~~~~~~~~~~~~~~~~~~~`);
  // e.Movie.__element__.__pointers__.characters.properties;
  type char = typeof e["Movie"]["characters"];
  type ext = char extends {
    __parent__: PathParent<infer Parent, infer L>;
  }
    ? true
    : false;

  // const query = e.select(e.User, x => ({
  //   filter: e.op(x.id, "=", e.uuid(userId)),
  //   ownedHangouts: e.select(x["<participants[is Hangout]"], y => ({
  //     filter: e.op(y["@role"], "=", e.Role.manager),
  //     id: true,
  //     name: true,
  //   })),
  // }));

  const query = e.select(e.Person, person => ({
    title: true,
    some_characters: e.select(person["<characters[is Movie]"], m => ({
      title: true,
      // filter: e.op(m),
    })),
  }));
  console.log(query.toEdgeQL());
  const result = await query.run(client);
  console.log(JSON.stringify(result, null, 2));
}

run();
