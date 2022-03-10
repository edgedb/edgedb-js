// tslint:disable:no-console
import type * as edgedb from "edgedb";
import {setupTests} from "./test/setupTeardown";
import e, {$infer} from "./dbschema/edgeql-js";
// import {Movie} from "./dbschema/edgeql-js/types";

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

interface BaseObject {
  id: string;
}

enum Genre {
  Horror = "Horror",
  Comedy = "Comedy",
  Drama = "Drama",
}

interface Person extends BaseObject {
  name: string;
  genre?: Genre | null;
}

interface Content extends BaseObject {
  title: string;
  actors: Person[];
}

interface Movie extends Content {
  runtime?: edgedb.Duration | null;
}

interface TVShow extends Content {
  num_seasons?: number | null;
}
