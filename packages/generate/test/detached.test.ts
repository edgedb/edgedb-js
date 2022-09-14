import type * as edgedb from "edgedb";
import e from "../dbschema/edgeql-js";
import {setupTests, tc, teardownTests, TestData} from "./setupTeardown";

let client: edgedb.Client;
let data: TestData;

beforeAll(async () => {
  const setup = await setupTests();
  ({client, data} = setup);
});

afterAll(async () => {
  await teardownTests(client);
});

test("detached", async () => {
  const heroes = await e.select(e.Hero).run(client);

  const result = await e
    .select(e.Hero, hero => ({
      id: true,
      name: true,
      friends: e.select(e.detached(e.Hero)),
      filter: e.op(hero.name, "=", "Iron Man"),
    }))
    .run(client);
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
