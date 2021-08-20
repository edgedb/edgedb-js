import {edgedb} from "@generated/imports";
import {$expr_Select} from "@syntax/select";
import {createPool} from "edgedb";
import {typeutil} from "../../src/reflection";
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
  console.log("closed pool");
});

test("detached", async () => {
  const heroes = await e.select(e.Hero).query(pool);

  const result = await e
    .select(e.Hero, {
      id: true,
      name: true,
      friends: e.select(e.detached(e.Hero)),
    })
    .filter(e.eq(e.Hero.name, e.str("Iron Man")))
    .query(pool);
  type result = typeof result;
  const f1: typeutil.assertEqual<
    result,
    {
      id: string;
      name: string;
      friends: {id: string}[];
    } | null
  > = true;
  expect(result).toMatchObject({
    id: data.iron_man.id,
    name: data.iron_man.name,
  });
  expect(result?.friends).toEqual(heroes);
});
