import * as edgedb from "edgedb";

import e from "../dbschema/edgeql";
import {setupTests, teardownTests, TestData} from "./setupTeardown";

let pool: edgedb.Client;
let data: TestData;

beforeAll(async () => {
  const setup = await setupTests();
  pool = setup.pool;
  data = setup.data;
});

afterAll(async () => {
  await teardownTests(pool);
});

test("basic insert", async () => {
  const insertBlackWidow = e.insert(e.Hero, {
    name: e.str("Black Widow"),
    secret_identity: e.str("Natasha Romanoff"),
  });

  await pool.querySingle(insertBlackWidow.toEdgeQL());

  const deleteBlackWidow = e
    .select(e.Hero, hero => ({
      filter: e.eq(hero.name, e.str("Black Widow")),
    }))
    .delete();
  await pool.querySingle(deleteBlackWidow.toEdgeQL());

  return;
});
