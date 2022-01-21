import * as edgedb from "edgedb";

import e from "../dbschema/edgeql";
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

test("update", async () => {
  e.update(e.Hero, () => ({
    set: {
      name: "asdf",
    },
  })).toEdgeQL();

  e.update(e.Villain, () => ({
    set: {
      name: e.str("asdf"),
      nemesis: e.set(e.$Hero),
    },
  })).toEdgeQL();

  e.update(e.Bag, () => ({
    set: {
      stringsMulti: {
        "+=": "new string",
      },
    },
  })).toEdgeQL();
});

test("update assignable", () => {
  e.update(e.Bag, () => ({
    set: {
      int32Field: e.number(23),
      int64Field: e.number(12),
      // @ts-expect-error
      bigintField: e.number(324),
      // @ts-expect-error
      float32Field: e.bigint(BigInt(1234)),
    },
  })).toEdgeQL();

  e.update(e.Bag, () => ({
    set: {
      int32Field: 23,
      bigintField: BigInt(324),
      // @ts-expect-error
      float32Field: BigInt(1234),
    },
  })).toEdgeQL();

  e.update(e.Movie, () => ({
    set: {
      rating: null,
      profile: null,
      // @ts-expect-error release_year is required prop
      release_year: null,
    },
  })).toEdgeQL();
});

test("scoped update", async () => {
  const query = e.update(e.Hero, hero => ({
    filter: e.op(hero.name, "=", data.spidey.name),
    set: {
      name: e.op("The Amazing ", "++", hero.name),
    },
  }));

  const result = await query.run(client);
  tc.assert<tc.IsExact<typeof result, {id: string} | null>>(true);

  expect(result).toEqual({id: data.spidey.id});

  expect(
    await e
      .select(e.Hero, hero => ({
        name: true,
        filter: e.op(hero.id, "=", e.uuid(result!.id)),
      }))
      .run(client)
  ).toEqual({id: data.spidey.id, name: `The Amazing ${data.spidey.name}`});
});

test("update link property", async () => {
  const theAvengers = e
    .select(e.Movie, movie => ({
      filter: e.op(movie.title, "=", "The Avengers"),
      limit: 1,
    }))
    .$assertSingle();

  const qq1 = await e
    .select(theAvengers, () => ({id: true, characters: true}))
    .run(client);

  expect(qq1?.characters.length).toEqual(2);

  const q2 = e.update(theAvengers, () => ({
    set: {
      characters: {
        "+=": e.select(e.Villain, villain => ({
          filter: e.op(villain.name, "=", data.thanos.name),
        })),
      },
    },
  }));
  await q2.run(client);

  const t2 = await e
    .select(theAvengers, () => ({id: true, characters: true}))
    .run(client);
  expect(t2?.characters.length).toEqual(3);

  await e
    .update(theAvengers, () => ({
      set: {
        characters: {
          "-=": e.select(e.Villain, villain => ({
            filter: e.op(villain.name, "=", data.thanos.name),
          })),
        },
      },
    }))
    .run(client);

  const t3 = await e
    .select(theAvengers, () => ({id: true, characters: true}))
    .run(client);
  expect(t3?.characters.length).toEqual(2);

  await e
    .update(theAvengers, () => ({
      set: {
        characters: e.set(e.$Villain),
      },
    }))
    .run(client);

  const t4 = await e
    .select(theAvengers, () => ({id: true, characters: true}))
    .run(client);
  expect(t4?.characters.length).toEqual(0);

  await e
    .update(theAvengers, () => ({
      set: {
        characters: e.select(e.Hero, hero => ({
          filter: e.op(
            hero.id,
            "in",
            e.set(e.uuid(data.cap.id), e.uuid(data.iron_man.id))
          ),
        })),
      },
    }))
    .run(client);

  const t5 = await e
    .select(theAvengers, () => ({id: true, characters: true}))
    .run(client);
  expect(t5?.characters.length).toEqual(2);
});
