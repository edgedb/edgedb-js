import {Client} from "edgedb";
import {Villain} from "../dbschema/edgeql-js/modules/default";
import {InsertShape} from "../dbschema/edgeql-js/syntax/insert";
import e from "../dbschema/edgeql-js";
import {setupTests, teardownTests, TestData} from "./setupTeardown";

let client: Client;
let data: TestData;

beforeAll(async () => {
  const setup = await setupTests();
  ({client, data} = setup);
});

afterAll(async () => {
  await teardownTests(client);
});

test("insert shape check", async () => {
  type insertVillainShape = InsertShape<typeof Villain>;
  const c1: insertVillainShape = {name: e.str("adf")};
});

test("basic insert", async () => {
  const q1 = e.insert(e.Hero, {
    name: "Black Widow",
    secret_identity: e.str("Natasha Romanoff"),
  });

  await client.querySingle(q1.toEdgeQL());

  client.execute(`DELETE Hero FILTER .name = 'Black Widow';`);
  return;
});

test("nested insert", async () => {
  const q1 = e.insert(e.Villain, {
    name: e.str("villain"),
    nemesis: e.insert(e.Hero, {
      name: "hero",
    }),
  });

  const q2 = e.select(q1, () => ({
    name: true,
    nemesis: {name: true},
  }));

  const result = await q2.run(client);

  expect(result).toMatchObject({
    name: "villain",
    nemesis: {name: "hero"},
  });

  // cleanup
  await client.execute(`delete Villain filter .name = '${result.name}';`);
  await client.execute(
    `delete Hero filter .name = '${result.nemesis!.name}';`
  );
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

  e.insert(e.Hero, {
    // @ts-expect-error
    name: 1234,
    // @ts-expect-error
    number_of_movies: "Ronin",
  });

  // should not error on missing required prop 'release_year'
  // since it has a default value
  e.insert(e.Movie, {
    title: "test_movie",
  });

  e.insert(e.Movie, {
    title: "test movie",
    rating: null,
    profile: null,
    // @ts-expect-error release_year is required prop
    release_year: null,
  }).toEdgeQL();

  return;
});
