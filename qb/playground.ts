// tslint:disable:no-console
import {setupTests} from "./test/setupTeardown";
import {edgeql, ident} from "../src/tag";

async function run() {
  const {client, data} = await setupTests();

  const query = edgeql`insert ${ident("User")} {
    name := ${"whatever"},
    bigint := ${BigInt(1234)},
    num := ${1239487134},
    numarr := ${[1239487134, 1234, 1234]},
    json := ${{outer: [{inner: 1341234}]}}
  }`.query;

  const result = await client.query(query.query, query.parameters);

  console.log(`~~~~~~~~~~~~~~~~~~~~~~~~~~~`);
  console.log(JSON.stringify(result, null, 2));
}

run();
export {};
