import * as edgedb from "edgedb";

import e from "../generated/example";
import {setupTests, teardownTests, TestData} from "./setupTeardown";

let pool: edgedb.Pool;
let data: TestData;

beforeAll(async () => {
  const setup = await setupTests();
  pool = setup.pool;
  data = setup.data;
});

afterAll(async () => {
  await teardownTests(pool);
});

test("update", async () => {
  e.select(e.Hero).update({
    name: e.str("asdf"),
  });

  e.select(e.Villain).update({
    name: e.str("asdf"),
    nemesis: e.set(e.$Hero),
  });
});

test("update assignable", () => {
  e.select(e.Bag).update({
    int32Field: e.int64(23),
    int64Field: e.int16(12),
    // @ts-expect-error
    bigintField: e.float32(324),
    // @ts-expect-error
    float32Field: e.bigint(BigInt(1234)),
  });
});

test("update link property", async () => {
  const theAvengers = e.select(e.Movie, movie => ({
    filter: e.eq(movie.title, e.str("The Avengers")),
    limit: 1,
  }));

  const qq1 = await e
    .select(theAvengers, () => ({id: true, characters: true}))
    .query(pool);

  expect(qq1?.characters.length).toEqual(2);

  const q2 = theAvengers.update({
    characters: {
      "+=": e.select(e.Villain, villain => ({
        filter: e.eq(villain.name, e.str(data.thanos.name)),
      })),
    },
  });
  // console.log(q2.toEdgeQL());
  await pool.execute(q2.toEdgeQL());

  const t2 = await e
    .select(theAvengers, () => ({id: true, characters: true}))
    .query(pool);
  expect(t2?.characters.length).toEqual(3);

  await pool.execute(
    theAvengers
      .update({
        characters: {
          "-=": e.select(e.Villain, villain => ({
            filter: e.eq(villain.name, e.str(data.thanos.name)),
          })),
        },
      })
      .toEdgeQL()
  );

  const t3 = await e
    .select(theAvengers, () => ({id: true, characters: true}))
    .query(pool);
  expect(t3?.characters.length).toEqual(2);

  await pool.execute(
    theAvengers
      .update({
        characters: e.set(e.$Villain),
      })
      .toEdgeQL()
  );

  const t4 = await e
    .select(theAvengers, () => ({id: true, characters: true}))
    .query(pool);
  expect(t4?.characters.length).toEqual(0);

  await pool.execute(
    theAvengers
      .update({
        characters: e.select(e.Hero, hero => ({
          filter: e.in(
            hero.id,
            e.set(e.uuid(data.cap.id), e.uuid(data.iron_man.id))
          ),
        })),
      })
      .toEdgeQL()
  );

  const t5 = await e
    .select(theAvengers, () => ({id: true, characters: true}))
    .query(pool);
  expect(t5?.characters.length).toEqual(2);
});
