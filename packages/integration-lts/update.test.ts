import assert from "node:assert/strict";
import type * as edgedb from "edgedb";

import e from "./dbschema/edgeql-js";
import type { UpdateShape } from "./dbschema/edgeql-js/syntax";
import { setupTests, tc, teardownTests, type TestData } from "./setupTeardown";

describe("update", () => {
  let client: edgedb.Client;
  let data: TestData;

  const $Hero = e.Hero.__element__;
  const $Villain = e.Villain.__element__;

  beforeAll(async () => {
    const setup = await setupTests();
    ({ client, data } = setup);
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
        nemesis: e.cast($Hero, e.set()),
      },
    })).toEdgeQL();

    e.update(e.Bag, () => ({
      set: {
        stringsMulti: {
          "+=": ["new string"],
        },
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
        int32Field: e.float32(23),
        int64Field: e.float64(12),
        // @ts-expect-error
        bigintField: e.float32(324),
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
    const query = e.update(e.Hero, (hero) => ({
      filter_single: e.op(hero.name, "=", data.spidey.name),
      set: {
        name: e.op("The Amazing ", "++", hero.name),
      },
    }));

    const result = await query.run(client);
    tc.assert<tc.IsExact<typeof result, { id: string } | null>>(true);

    assert.deepEqual(result, { id: data.spidey.id });

    assert.deepEqual(
      await e
        .select(e.Hero, (hero) => ({
          name: true,
          filter_single: e.op(hero.id, "=", e.uuid(result!.id)),
        }))
        .run(client),
      { name: `The Amazing ${data.spidey.name}` }
    );
  });

  test("update link property", async () => {
    const theAvengers = e
      .select(e.Movie, (movie) => ({
        filter: e.op(movie.title, "=", "The Avengers"),
        limit: 1,
      }))
      .assert_single();

    const qq1 = await e
      .select(theAvengers, () => ({ id: true, characters: true }))
      .run(client);

    assert.equal(qq1?.characters.length, 2);

    const q2 = e.update(theAvengers, () => ({
      set: {
        characters: {
          "+=": e.select(e.Villain, (villain) => ({
            filter: e.op(villain.name, "=", data.thanos.name),
          })),
        },
      },
    }));
    await q2.run(client);

    const t2 = await e
      .select(theAvengers, () => ({ id: true, characters: true }))
      .run(client);
    assert.equal(t2?.characters.length, 3);

    await e
      .update(theAvengers, () => ({
        set: {
          characters: {
            "-=": e.select(e.Villain, (villain) => ({
              filter: e.op(villain.name, "=", data.thanos.name),
            })),
          },
        },
      }))
      .run(client);

    const t3 = await e
      .select(theAvengers, () => ({ id: true, characters: true }))
      .run(client);
    assert.equal(t3?.characters.length, 2);

    await e
      .update(theAvengers, () => ({
        set: {
          characters: e.cast($Villain, e.set()),
        },
      }))
      .run(client);

    const t4 = await e
      .select(theAvengers, () => ({ id: true, characters: true }))
      .run(client);
    assert.equal(t4?.characters.length, 0);

    await e
      .update(theAvengers, () => ({
        set: {
          characters: e.select(e.Hero, (hero) => ({
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
      .select(theAvengers, () => ({ id: true, characters: true }))
      .run(client);
    assert.equal(t5?.characters.length, 2);
  });

  test("optional prop update", async () => {
    const query = e.params({ title: e.optional(e.str) }, (params) => {
      return e.update(e.Movie, (m) => ({
        filter_single: { title: "not a real title" },
        set: {
          // Error here
          title: params.title,
        },
      }));
    });
    await query.run(client, { title: "still not real" });
  });

  test("exclude readonly props", () => {
    type updateProfileShape = UpdateShape<(typeof e)["Profile"]>;
    tc.assert<
      tc.IsExact<keyof updateProfileShape, "plot_summary" | "a" | "b" | "c">
    >(true);
  });

  test("empty update", async () => {
    const result = await e.update(e.Movie, () => ({ set: {} })).run(client);
    assert.ok(result);
  });

  test("update with filter_single", async () => {
    await e
      .update(e.Movie, () => ({
        filter_single: { id: data.the_avengers.id },
        set: {},
      }))
      .run(client);
  });

  test("update with filter_single + op", async () => {
    await e
      .update(e.Profile, (profile) => ({
        filter_single: e.op(
          profile["<profile[is Movie]"].title,
          "=",
          "The Avengers"
        ),
        set: { a: "test" },
      }))
      .run(client);
  });
});
