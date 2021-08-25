import {edgedb} from "@generated/imports";
import {Villain} from "@generated/modules/default";
import {InsertShape} from "@syntax/insert";
import {UpdateShape} from "@syntax/update";
import {createPool} from "edgedb";
import {typeutil} from "reflection";

import e from "../generated/example";
import {setupTests, teardownTests, TestData} from "./setupTeardown";

let pool: edgedb.Pool;
let data: TestData;

beforeAll(async () => {
  pool = await createPool();
  data = await setupTests();
});

afterAll(async () => {
  await teardownTests();
  await pool.close();
});

test("basic insert", async () => {
  const insertBlackWidow = e.insert(e.Hero, {
    name: e.str("Black Widow"),
    secret_identity: e.str("Natasha Romanoff"),
  });

  await pool.queryOne(insertBlackWidow.toEdgeQL());

  const deleteBlackWidow = e
    .select(e.Hero)
    .filter(e.eq(e.Hero.name, e.str("Black Widow")))
    .delete();
  await pool.queryOne(deleteBlackWidow.toEdgeQL());

  return;
});
