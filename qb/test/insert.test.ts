import {Client} from "edgedb";
import {Villain} from "../dbschema/edgeql/modules/default";
import {InsertShape} from "../dbschema/edgeql/syntax/insert";
import e from "../dbschema/edgeql";
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
    name: e.str("Black Widow"),
    secret_identity: e.str("Natasha Romanoff"),
    // id
  });

  await client.querySingle(q1.toEdgeQL());

  client.execute(`DELETE Hero FILTER .name = 'Black Widow';`);
  return;
});

test("nested insert", async () => {
  const q1 = e.insert(e.Villain, {
    name: e.str("villain"),
    nemesis: e.insert(e.Hero, {
      name: e.str("hero"),
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
  return;
});
