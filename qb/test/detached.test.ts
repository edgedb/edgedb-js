import * as edgedb from "edgedb";
import e from "../dbschema/edgeql";
import {setupTests, tc, teardownTests, TestData} from "./setupTeardown";

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

test("detached", async () => {
  const heroes = await e.select(e.Hero).run(pool);

  const result = await e
    .select(e.Hero, hero => ({
      id: true,
      name: true,
      friends: e.select(e.detached(e.Hero)),
      filter: e.eq(hero.name, e.str("Iron Man")),
    }))
    .run(pool);
  type result = typeof result;
  tc.assert<
    tc.IsExact<
      result,
      {
        id: string;
        name: string;
        friends: {id: string}[];
      } | null
    >
  >(true);
  expect(result).toMatchObject({
    id: data.iron_man.id,
    name: data.iron_man.name,
  });
  expect(result?.friends).toEqual(heroes);
});
