import {Pool} from "edgedb";
import {Villain} from "../dbschema/edgeql/modules/default";
import {InsertShape} from "../dbschema/edgeql/syntax/insert";
import e from "../dbschema/edgeql";
import {setupTests, teardownTests, TestData} from "./setupTeardown";

let pool: Pool;
let data: TestData;

beforeAll(async () => {
  const setup = await setupTests();
  pool = setup.pool;
  data = setup.data;
});

afterAll(async () => {
  await teardownTests(pool);
});

test("insert shape check", async () => {
  type insertVillainShape = InsertShape<typeof Villain>;
  const c1: insertVillainShape = {name: e.str("adf")};
});

test("basic insert", async () => {
  const q1 = e.insert(e.Hero, {
    name: e.str("Black Widow"),
    secret_identity: e.str("Natasha Romanoff"),
    // id
  });

  await pool.queryOne(q1.toEdgeQL());

  pool.execute(`DELETE Hero FILTER .name = 'Black Widow';`);
  return;
});

test("nested insert", async () => {
  const q1 = e.insert(e.Villain, {
    name: e.str("asdf"),
    nemesis: e.insert(e.Hero, {
      name: e.str("asdf"),
    }),
  });

  const q2 = e.select(q1, () => ({
    name: true,
    nemesis: {name: true},
  }));

  const result = await pool.queryOne(q2.toEdgeQL());

  // cleanup
  await pool.execute(`delete Villain filter .name = '${result.name}';`);
  await pool.execute(`delete Hero filter .name = '${result.nemesis.name}';`);
  return;
});

test("insert type enforcement", async () => {
  e.insert(e.Villain, {
    // @ts-expect-error card mismatch
    nemesis: e.select(e.Hero),
  });

  // @ts-expect-error missing required field
  e.insert(e.Villain, {});

  e.insert(e.Villain, {
    // @ts-expect-error
    name: e.set(e.str),
  });
  return;
});
