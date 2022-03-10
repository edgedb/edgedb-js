// tslint:disable:no-console
import type * as edgedb from "edgedb";
import {setupTests} from "./test/setupTeardown";
// import e, {$infer} from "./dbschema/edgeql-js";
// import {Movie} from "./dbschema/edgeql-js/types";
import e, {Movie, Person, $infer} from "./dbschema/edgeql-js";
async function run() {
  const {client} = await setupTests();
  const query = e.select(e.Movie, () => ({title: true}));
  type result = $infer<typeof query>;
  // {title: string}[]
  const result = await query.run(client);
  console.log(JSON.stringify(result, null, 2));
}

run();
export {};
