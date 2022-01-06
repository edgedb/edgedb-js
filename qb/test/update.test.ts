import * as edgedb from "edgedb";

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

test("update", async () => {
  e.select(e.Hero)
    .update({
      name: "asdf",
    })
    .toEdgeQL();

  e.select(e.Villain)
    .update({
      name: e.str("asdf"),
      nemesis: e.set(e.$Hero),
    })
    .toEdgeQL();
});

test("update assignable", () => {
  e.select(e.Bag)
    .update({
      int32Field: e.jsnumber(23),
      int64Field: e.jsnumber(12),
      // @ts-expect-error
      bigintField: e.jsnumber(324),
      // @ts-expect-error
      float32Field: e.bigint(BigInt(1234)),
    })
    .toEdgeQL();

  e.select(e.Bag)
    .update({
      int32Field: 23,
      bigintField: BigInt(324),
      // @ts-expect-error
      float32Field: BigInt(1234),
    })
    .toEdgeQL();
});

test("update link property", async () => {
  const theAvengers = e.select(e.Movie, movie => ({
    filter: e.op(movie.title, "=", "The Avengers"),
    limit: 1,
  }));

  const qq1 = await e
    .select(theAvengers, () => ({id: true, characters: true}))
    .run(client);

  expect(qq1?.characters.length).toEqual(2);

  const q2 = theAvengers.update({
    characters: {
      "+=": e.select(e.Villain, villain => ({
        filter: e.op(villain.name, "=", data.thanos.name),
      })),
    },
  });
  // console.log(q2.toEdgeQL());
  await client.execute(q2.toEdgeQL());

  const t2 = await e
    .select(theAvengers, () => ({id: true, characters: true}))
    .run(client);
  expect(t2?.characters.length).toEqual(3);

  await client.execute(
    theAvengers
      .update({
        characters: {
          "-=": e.select(e.Villain, villain => ({
            filter: e.op(villain.name, "=", data.thanos.name),
          })),
        },
      })
      .toEdgeQL()
  );

  const t3 = await e
    .select(theAvengers, () => ({id: true, characters: true}))
    .run(client);
  expect(t3?.characters.length).toEqual(2);

  await client.execute(
    theAvengers
      .update({
        characters: e.set(e.$Villain),
      })
      .toEdgeQL()
  );

  const t4 = await e
    .select(theAvengers, () => ({id: true, characters: true}))
    .run(client);
  expect(t4?.characters.length).toEqual(0);

  await client.execute(
    theAvengers
      .update({
        characters: e.select(e.Hero, hero => ({
          filter: e.op(
            hero.id,
            "in",
            e.set(e.uuid(data.cap.id), e.uuid(data.iron_man.id))
          ),
        })),
      })
      .toEdgeQL()
  );

  const t5 = await e
    .select(theAvengers, () => ({id: true, characters: true}))
    .run(client);
  expect(t5?.characters.length).toEqual(2);
});
