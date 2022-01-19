import * as edgedb from "edgedb";
import {ObjectTypeSet} from "edgedb/dist/reflection";

import e from "../dbschema/edgeql";
import {setupTests, teardownTests, TestData} from "./setupTeardown";

let client: edgedb.Client;
let data: TestData;

beforeAll(async () => {
  const setup = await setupTests();
  ({client, data} = setup);
});

afterAll(async () => {
  await teardownTests(client);
});

test("basic insert", async () => {
  const insertBlackWidow = e.insert(e.Hero, {
    name: e.str("Black Widow"),
    secret_identity: e.str("Natasha Romanoff"),
  });

  await client.querySingle(insertBlackWidow.toEdgeQL());

  const blackWidow = e.select(e.Hero, hero => ({
    filter: e.op(hero.name, "=", "Black Widow"),
  }));

  type asdf = typeof blackWidow extends ObjectTypeSet ? true : false;
  const deleteBlackWidow = blackWidow.delete();
  await client.querySingle(deleteBlackWidow.toEdgeQL());

  return;
});
