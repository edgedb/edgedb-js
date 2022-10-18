// tslint:disable:no-console
import {setupTests} from "./test/setupTeardown";
import e from "./dbschema/edgeql-js";
import {createClient} from "edgedb";

const client = createClient();

// e.select(
//   e.group(e.Movie, movie => ({
//     by: {
//       localeId: movie.,
//       translated: e.op("exists", translation.content)
//     }
//   })),
//   group => ({
//     translated: group.key.translated,
//     localeId: group.key.localeId,
//     count: e.count(group.elements)
//   })
// );

const groups = e.group(e.Movie, movie => ({
  by: {
    localeId: movie.genre
    // translated: e.op("exists", movie.title)
  }
}));

groups.__expr__.__cardinality__;

async function run() {
  const {client} = await setupTests();
  const query = e.select(groups, grp => ({
    key: grp.key,
    grouping: grp.grouping,
    count: e.count(grp.elements)
  }));

  console.log(query.toEdgeQL());

  const result = await query.run(client);

  console.log(result);
}

run();
