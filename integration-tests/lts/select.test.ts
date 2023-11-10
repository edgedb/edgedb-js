import assert from "node:assert/strict";
import * as edgedb from "edgedb";
import * as $ from "../../packages/generate/src/syntax/reflection";

import e, { type $infer } from "./dbschema/edgeql-js";
import { setupTests, teardownTests, tc, type TestData } from "./setupTeardown";
let client: edgedb.Client;
let data: TestData;

describe("select", () => {
  beforeAll(async () => {
    const setup = await setupTests();
    ({ client, data } = setup);
  });

  afterAll(async () => {
    await teardownTests(client);
  });

  test("basic select", () => {
    const result = e.select(e.std.str("asdf"));
    type result = $infer<typeof result>;
    tc.assert<tc.IsExact<result, "asdf">>(true);
  });

  test("selecting JS data", () => {
    const strSelect = e.select("test");
    assert.equal(strSelect.__kind__, $.ExpressionKind.Select);
    assert.equal(strSelect.__element__, e.str);
    assert.equal(strSelect.__cardinality__, $.Cardinality.One);

    const numberSelect = e.select(1234);
    assert.equal(numberSelect.__kind__, $.ExpressionKind.Select);
    assert.equal(numberSelect.__element__.__name__, `std::number`);
    assert.equal(numberSelect.__cardinality__, $.Cardinality.One);

    const boolSelect = e.select(false);
    assert.equal(boolSelect.__kind__, $.ExpressionKind.Select);
    assert.equal(boolSelect.__element__, e.bool);
    assert.equal(boolSelect.__cardinality__, $.Cardinality.One);

    const bigintSelect = e.select(BigInt(1234));
    assert.equal(bigintSelect.__kind__, $.ExpressionKind.Select);
    assert.equal(bigintSelect.__element__, e.bigint);
    assert.equal(bigintSelect.__cardinality__, $.Cardinality.One);

    const bufferSelect = e.select(Buffer.from([]));
    assert.equal(bufferSelect.__kind__, $.ExpressionKind.Select);
    assert.equal(bufferSelect.__element__, e.bytes);
    assert.equal(bufferSelect.__cardinality__, $.Cardinality.One);

    const dateSelect = e.select(new Date());
    assert.equal(dateSelect.__kind__, $.ExpressionKind.Select);
    assert.equal(dateSelect.__element__, e.datetime);
    assert.equal(dateSelect.__cardinality__, $.Cardinality.One);

    const durationSelect = e.select(new edgedb.Duration());
    assert.equal(durationSelect.__kind__, $.ExpressionKind.Select);
    assert.equal(durationSelect.__element__, e.duration);
    assert.equal(durationSelect.__cardinality__, $.Cardinality.One);

    const ldrSelect = e.select(new edgedb.LocalDateTime(1, 2, 3));
    assert.equal(ldrSelect.__kind__, $.ExpressionKind.Select);
    assert.equal(ldrSelect.__element__, e.cal.local_datetime);
    assert.equal(ldrSelect.__cardinality__, $.Cardinality.One);

    const ldSelect = e.select(new edgedb.LocalDate(1, 2, 3));
    assert.equal(ldSelect.__kind__, $.ExpressionKind.Select);
    assert.equal(ldSelect.__element__, e.cal.local_date);
    assert.equal(ldSelect.__cardinality__, $.Cardinality.One);

    const ltSelect = e.select(new edgedb.LocalTime(1, 2, 3));
    assert.equal(ltSelect.__kind__, $.ExpressionKind.Select);
    assert.equal(ltSelect.__element__, e.cal.local_time);
    assert.equal(ltSelect.__cardinality__, $.Cardinality.One);

    const rdSelect = e.select(new edgedb.RelativeDuration(1, 2, 3));
    assert.equal(rdSelect.__kind__, $.ExpressionKind.Select);
    assert.equal(rdSelect.__element__, e.cal.relative_duration);
    assert.equal(rdSelect.__cardinality__, $.Cardinality.One);

    const memSelect = e.select(new edgedb.ConfigMemory(BigInt(1234)));
    assert.equal(memSelect.__kind__, $.ExpressionKind.Select);
    assert.equal(memSelect.__element__, e.cfg.memory);
    assert.equal(memSelect.__cardinality__, $.Cardinality.One);
  });

  test("no shape", async () => {
    const query = e.select(e.default.Hero);
    const result = await query.run(client);
    tc.assert<tc.IsExact<typeof result, { id: string }[]>>(true);
    assert.deepEqual(
      query.__element__.__shape__,
      e.default.Hero.__element__.__shape__
    );
    assert.equal(
      result.every((val) => !!val.id),
      true
    );
  });

  test("computed only shape", () => {
    const query = e.select(e.Hero, (hero) => ({
      upper_name: e.str_upper(hero.name),
    }));

    tc.assert<tc.IsExact<$infer<typeof query>, { upper_name: string }[]>>(true);
  });

  const q1 = e.select(e.Hero, () => ({
    id: true,
    secret_identity: true,
    name: 1 > 0,
    villains: {
      id: true,
      computed: e.str("test"),
    },
    computed: e.str("test"),
  }));

  type q1 = $.setToTsType<typeof q1>;

  test("path construction", () => {
    const result = e.select(e.default.Hero);
    assert.equal(result.villains.nemesis.name.__element__.__name__, "std::str");
  });

  test("complex shape", () => {
    type q1type = $.BaseTypeToTsType<(typeof q1)["__element__"]>;
    tc.assert<
      tc.IsExact<
        q1type,
        {
          id: string;
          name: string | undefined;
          secret_identity: string | null;
          villains: {
            id: string;
            computed: "test";
          }[];
          computed: "test";
        }
      >
    >(true);
  });

  test("deep shape", () => {
    const deep = e.select(e.Hero, () => ({
      id: true,
      __type__: {
        name: true,
        __type__: {
          id: true,
          __type__: {
            id: true,
            name: true,
          },
        },
      },
    }));
    type deep = $.setToTsType<typeof deep>;
    tc.assert<
      tc.IsExact<
        deep,
        {
          id: string;
          __type__: {
            name: string;
            __type__: {
              id: string;
              __type__: {
                id: string;
                name: string;
              };
            };
          };
        }[]
      >
    >(true);
  });

  test("compositionality", () => {
    // selecting a select statement should
    // default to { id }
    const no_shape = e.select(q1);

    type no_shape = $.BaseTypeToTsType<(typeof no_shape)["__element__"]>;
    type q1 = $.BaseTypeToTsType<(typeof q1)["__element__"]>;
    tc.assert<tc.IsExact<no_shape, q1>>(true);
    assert.deepEqual(no_shape.__element__.__shape__, q1.__element__.__shape__);

    // allow override shape
    const override_shape = e.select(q1, () => ({
      id: true,
      secret_identity: true,
    }));
    type override_shape = $.BaseTypeToTsType<
      (typeof override_shape)["__element__"]
    >;
    tc.assert<
      tc.IsExact<
        override_shape,
        {
          id: string;
          secret_identity: string | null;
        }
      >
    >(true);
  });

  test("polymorphism", () => {
    const query = e.select(e.Person, () => ({
      id: true,
      name: true,
      ...e.is(e.Hero, { secret_identity: true }),
      ...e.is(e.Villain, {
        nemesis: { name: true },
      }),
    }));
    // query.__element__.

    assert.deepEqual(query.__kind__, $.ExpressionKind.Select);
    assert.deepEqual(query.__element__.__kind__, $.TypeKind.object);
    assert.equal(query.__element__.__name__, "default::Person");

    type result = $.BaseTypeToTsType<(typeof query)["__element__"]>;
    tc.assert<
      tc.IsExact<
        result,
        {
          id: string;
          name: string;
          nemesis: {
            name: string;
          } | null;
          secret_identity: string | null;
        }
      >
    >(true);
  });

  test("polymorphic with nested modifiers", () => {
    e.is(e.Villain, {
      id: true,
    });

    e.select(e.Person, () => ({
      id: true,
      name: true,
      ...e.is(e.Villain, {
        nemesis: (hero) => ({
          name: true,
          order_by: hero.name,
          filter: e.op(hero.name, "=", hero.name),
          limit: 1,
          offset: 10,
        }),
      }),
    }));
  });

  test("computables in polymorphics", () => {
    const q = e.select(e.Person, () => ({
      id: true,
      ...e.is(e.Hero, {
        secret_identity: true,
      }),
      ...e.is(e.Villain, {
        nemesis: { id: true, computable: e.int64(1234) },
        computable: e.int64(1234),
      }),
    }));

    type q = $.setToTsType<typeof q>;
    tc.assert<
      tc.IsExact<
        q,
        {
          id: string;
          secret_identity: string | null;
          nemesis: { id: string; computable: 1234 } | null;
          computable: never;
        }[]
      >
    >(true);
  });

  test("parent type props in polymorphic", () => {
    const q = e.select(e.Person, () => ({
      ...e.is(e.Hero, {
        // name is prop of Person
        name: true,
        secret_identity: true,
      }),
      ...e.is(e.Villain, { nemesis: { name: true } }),
    }));

    tc.assert<
      tc.IsExact<
        $infer<typeof q>,
        {
          name: string | null;
          secret_identity: string | null;
          nemesis: { name: string } | null;
        }[]
      >
    >(true);
  });

  test("* in polymorphic", async () => {
    const q = e.select(e.Person, () => ({
      ...e.is(e.Hero, e.Hero["*"]),
      name: true,
    }));

    // 'id' is filtered out since it is not valid in a polymorphic expr
    tc.assert<
      tc.IsExact<
        $infer<typeof q>,
        {
          name: string;
          height: string | null;
          number_of_movies: number | null;
          secret_identity: string | null;
        }[]
      >
    >(true);

    await q.run(client);
  });

  test("shape type name", () => {
    const name = e.select(e.Hero).__element__.__name__;
    tc.assert<tc.IsExact<typeof name, "default::Hero">>(true);
  });

  test("limit/offset inference", () => {
    const testSet = e.set(1, 2, 3);

    tc.assert<
      tc.IsExact<(typeof testSet)["__cardinality__"], $.Cardinality.AtLeastOne>
    >(true);
    assert.deepEqual(testSet.__cardinality__, $.Cardinality.AtLeastOne);

    const r0 = e.select(testSet, () => ({}));
    tc.assert<
      tc.IsExact<(typeof r0)["__cardinality__"], $.Cardinality.AtLeastOne>
    >(true);
    assert.deepEqual(r0.__cardinality__, $.Cardinality.AtLeastOne);

    const r1 = e.select(testSet, () => ({ limit: 1 }));
    tc.assert<tc.IsExact<(typeof r1)["__cardinality__"], $.Cardinality.Many>>(
      true
    );
    assert.deepEqual(r1.__cardinality__, $.Cardinality.Many);

    const r2 = e.select(testSet, () => ({ offset: 1 }));
    tc.assert<tc.IsExact<(typeof r2)["__cardinality__"], $.Cardinality.Many>>(
      true
    );
    assert.deepEqual(r2.__cardinality__, $.Cardinality.Many);
  });

  test("offset", () => {
    const q = e.select(e.Hero, () => ({ name: true }));
    const r1 = e.select(q, () => ({ offset: 5 }));
    assert.equal(r1.__modifiers__.offset?.__element__.__name__, "std::number");
  });

  test("infer cardinality - scalar filters", () => {
    const q = e.select(e.Hero);
    const q2 = e.select(q, (hero) => ({
      filter_single: e.op(hero.name, "=", "asdf"),
    }));
    tc.assert<
      tc.IsExact<(typeof q2)["__cardinality__"], $.Cardinality.AtMostOne>
    >(true);
    assert.deepEqual(q2.__cardinality__, $.Cardinality.AtMostOne);

    const u3 = e.uuid("asdf");
    const q3 = e.select(q, (hero) => {
      return { filter_single: e.op(hero.id, "=", u3) };
    });
    tc.assert<
      tc.IsExact<(typeof q3)["__cardinality__"], $.Cardinality.AtMostOne>
    >(true);
    assert.deepEqual(q3.__cardinality__, $.Cardinality.AtMostOne);

    const q4 = q2.secret_identity;
    tc.assert<
      tc.IsExact<(typeof q4)["__cardinality__"], $.Cardinality.AtMostOne>
    >(true);
    assert.deepEqual(q4.__cardinality__, $.Cardinality.AtMostOne);

    const q5 = e.select(q, (hero) => ({
      filter: e.op(hero.secret_identity, "=", "asdf"),
    }));
    tc.assert<tc.IsExact<(typeof q5)["__cardinality__"], $.Cardinality.Many>>(
      true
    );
    assert.deepEqual(q5.__cardinality__, $.Cardinality.Many);

    const q6 = e.select(e.Villain.nemesis, (nemesis) => ({
      filter_single: e.op(nemesis.name, "=", "asdf"),
    }));
    tc.assert<
      tc.IsExact<(typeof q6)["__cardinality__"], $.Cardinality.AtMostOne>
    >(true);
    assert.deepEqual(q6.__cardinality__, $.Cardinality.AtMostOne);

    const strs = e.set(e.str("asdf"), e.str("qwer"));
    const q7 = e.select(e.Villain, (villain) => ({
      filter: e.op(villain.name, "=", strs),
    }));
    tc.assert<tc.IsExact<(typeof q7)["__cardinality__"], $.Cardinality.Many>>(
      true
    );
    assert.deepEqual(q7.__cardinality__, $.Cardinality.Many);

    const expr8 = e.select(e.Villain, () => ({ id: true, name: true }));
    const q8 = e.select(expr8, (villain) => ({
      filter_single: e.op(villain.name, "=", "asdf"),
    }));
    tc.assert<
      tc.IsExact<(typeof q8)["__cardinality__"], $.Cardinality.AtMostOne>
    >(true);
    assert.deepEqual(q8.__cardinality__, $.Cardinality.AtMostOne);

    const expr9 = e.select(e.Villain, () => ({ id: true, name: true }));
    const q9 = e.select(expr9, (villain) => ({
      filter_single: e.op(villain.name, "=", "asdf"),
    }));
    tc.assert<
      tc.IsExact<(typeof q9)["__cardinality__"], $.Cardinality.AtMostOne>
    >(true);
    assert.deepEqual(q9.__cardinality__, $.Cardinality.AtMostOne);
  });

  test("infer cardinality - object type filters", () => {
    const oneHero = e.select(e.Hero, () => ({ limit: 1 })).assert_single();

    const singleHero = e.select(e.Hero, (hero) => ({
      filter_single: e.op(hero, "=", oneHero),
    }));

    const c1 = singleHero.__cardinality__;
    tc.assert<tc.IsExact<typeof c1, $.Cardinality.AtMostOne>>(true);
    assert.deepEqual(c1, $.Cardinality.AtMostOne);

    const oneProfile = e.select(e.Hero, () => ({ limit: 1 })).assert_single();
    const singleMovie = e.select(e.Movie, (movie) => ({
      filter_single: e.op(movie.profile, "=", oneProfile),
    }));

    const c2 = singleMovie.__cardinality__;
    tc.assert<tc.IsExact<typeof c2, $.Cardinality.AtMostOne>>(true);
    assert.deepEqual(c2, $.Cardinality.AtMostOne);

    // not a singleton

    const c3 = e.select(e.Villain, (villain) => ({
      filter: e.op(villain.nemesis, "=", oneHero),
    })).__cardinality__;
    tc.assert<tc.IsExact<typeof c3, $.Cardinality.Many>>(true);
    assert.deepEqual(c3, $.Cardinality.Many);

    // not a singleton
    // technically a bug, but for now this behavior is expected
    const c4 = e.select(e.Villain, (villain) => ({
      filter_single: e.op(villain, "=", villain),
    })).__cardinality__;
    tc.assert<tc.IsExact<typeof c4, $.Cardinality.AtMostOne>>(true);
    assert.deepEqual(c4, $.Cardinality.AtMostOne);
  });

  test("non 'e.eq' filters", () => {
    const q1 = e.select(e.Hero, () => ({
      filter: e.bool(true),
    }));
    tc.assert<tc.IsExact<(typeof q1)["__cardinality__"], $.Cardinality.Many>>(
      true
    );
    assert.deepEqual(q1.__cardinality__, $.Cardinality.Many);

    const q2 = e.select(e.Hero, (hero) => ({
      filter: e.op(true, "if", e.op(hero.name, "=", "Thanos"), "else", false),
    }));
    tc.assert<tc.IsExact<(typeof q2)["__cardinality__"], $.Cardinality.Many>>(
      true
    );
    assert.deepEqual(q2.__cardinality__, $.Cardinality.Many);
  });

  test("fetch heroes", async () => {
    const result = await e.select(e.Hero).run(client);
    assert.equal(result.length, 3);
    assert.equal(
      result.every((h) => typeof h.id === "string"),
      true
    );
  });

  test("named tuples", async () => {
    const namedTuple = e.tuple({ foo: e.str("bar") });
    const result = await e.select(namedTuple).run(client);
    assert.deepEqual(result, { foo: "bar" });

    const pathResult = await e.select(namedTuple.foo).run(client);
    assert.deepEqual(pathResult, "bar");

    const nestedObjectTuple = e.for(
      e.enumerate(e.select(e.Hero)),
      (enumeration) =>
        e.tuple({
          hero: enumeration[1],
          index: enumeration[0],
        })
    );
    const nestedObjectQuery = e.select(nestedObjectTuple.hero, (hero) => ({
      name: hero.name,
      order_by: nestedObjectTuple.index,
    }));
    const nestedObjectResult = await nestedObjectQuery.run(client);
    assert.equal(nestedObjectResult.length, 3);
    assert.ok(nestedObjectResult.every((r) => Boolean(r.name)));
  });

  test("filter by id", async () => {
    const result = await e
      .select(e.Hero, () => ({
        filter_single: { id: data.spidey.id },
      }))
      .run(client);

    assert.deepEqual(result?.id, data.spidey.id);
  });

  test("filter by id expr", async () => {
    const result = await e
      .select(e.Hero, () => ({
        filter_single: { id: e.uuid(data.spidey.id) },
      }))
      .run(client);

    assert.deepEqual(result?.id, data.spidey.id);
  });

  test("limit 1", async () => {
    const query = e
      .select(e.Hero, (hero) => ({
        order_by: hero.name,
        offset: 1,
        limit: 1,
      }))
      .assert_single();
    const result = await e.select(query).run(client);
    assert.deepEqual(result?.id, data.iron_man.id);
  });

  test("limit 2", async () => {
    const query = e.select(e.Hero, (hero) => ({
      order_by: hero.name,
      offset: 1,
      limit: 2,
    }));
    const results = await query.run(client);

    assert.equal(results.length, 2);
    assert.deepEqual(results, [
      { id: data.iron_man.id },
      { id: data.spidey.id },
    ]);
  });

  test("order by self", async () => {
    const query = e.select(e.Hero, (hero) => ({
      order_by: hero,
    }));
    const result = await query.run(client);
    assert.deepEqual(
      result,
      [data.cap, data.spidey, data.iron_man]
        .map((h) => ({ id: h.id }))
        .sort((a, b) => a.id.localeCompare(b.id))
    );
  });

  test("shapes", async () => {
    const query = e.select(
      e
        .select(e.Hero, (hero) => ({
          filter: e.op(hero.name, "=", "Iron Man"),
        }))
        .assert_single(),
      () => ({
        id: true,
        name: true,
        secret_identity: true,
        villains: { id: true },
      })
    );

    const result = await query.run(client);
    assert.ok(result);
    assert.deepEqual(result, { ...result, ...data.iron_man });
    assert.deepEqual(result.villains, [{ id: data.thanos.id }]);
  });

  test("computables", async () => {
    const all_heroes = e.select(e.Hero, () => ({
      // __type__: {name: true}
      id: true,
    }));
    const query = e.select(
      e
        .select(e.Person.is(e.Hero), (hero) => ({
          order_by: hero.name,
          limit: 1,
        }))
        .assert_single(),
      () => ({
        id: true,
        computable: e.int64(35),
        all_heroes,
      })
    );

    type query = $.setToTsType<typeof query>;
    tc.assert<
      tc.IsExact<
        query,
        {
          id: string;
          computable: 35;
          all_heroes: {
            // __type__: {name: string}
            id: string;
          }[];
        } | null
      >
    >(true);
    const results = await query.run(client);

    assert.deepEqual(results?.id, data.cap.id);
    assert.equal(results?.computable, 35);
  });

  test("type intersections", async () => {
    const query = e.select(e.Person.is(e.Hero), () => ({
      id: true,
      // __type__: {name: true},
    }));
    const results = await query.run(client);
    assert.equal(
      results.every((person) => typeof person.id === "string"),
      true
    );
  });

  test("type intersections - static", () => {
    const result = e.select(e.Movie.characters).is(e.Villain);
    type result = $.setToTsType<typeof result>;
    tc.assert<tc.IsExact<result, { id: string }[]>>(true);
  });

  test("backlinks", async () => {
    const result1 = await e
      .select(e.Hero["<characters[is Movie]"], () => ({
        id: true,
        // __type__: {name: true},
        title: true,
      }))
      .run(client);

    const q2 = e.select(e.Hero["<characters"].is(e.Movie), () => ({
      id: true,
      // __type__: {name: true},
      title: true,
    }));

    const result2 = await q2.run(client);

    assert.deepEqual(result1, result2);
    assert.equal(Array.isArray(result1), true);
    assert.equal(
      [data.the_avengers.title, data.civil_war.title].includes(
        result1[0].title
      ),
      true
    );

    const q3 = e.select(e.Hero, (hero) => ({
      "<characters[is Movie]": {
        title: true,
      },
      starredIn: e.select(hero["<characters[is Movie]"], () => ({
        title: true,
      })),
    }));

    const res3 = await q3.run(client);
    tc.assert<
      tc.IsExact<
        typeof res3,
        {
          "<characters[is Movie]": { title: string }[];
          starredIn: { title: string }[];
        }[]
      >
    >(true);

    for (const hero of res3) {
      assert.deepEqual(hero["<characters[is Movie]"], hero.starredIn);
    }
  });

  test("overrides with implicit casting", () => {
    e.select(e.Hero, () => ({
      id: e.uuid("asdf"),
      number_of_movies: e.int64(1234),
      name: e.str("adsf"),
    }));
  });

  test("link properties", async () => {
    const query = e.select(e.Movie, () => ({
      id: true,
      characters: () => ({
        name: true,
        "@character_name": true,
      }),
    }));

    const result = await query.run(client);

    tc.assert<
      tc.IsExact<
        typeof result,
        {
          id: string;
          characters: {
            name: string;
            "@character_name": string | null;
          }[];
        }[]
      >
    >(true);
  });

  test("link properties in expressions", async () => {
    const query = e.select(e.Movie, () => ({
      id: true,
      characters: (char) => ({
        name: true,
        "@character_name": true,
        char_name: char["@character_name"],
        person_name: char.name,

        filter: e.op(char["@character_name"], "ilike", "a%"),
      }),
    }));

    const result = await query.run(client);

    tc.assert<
      tc.IsExact<
        typeof result,
        {
          id: string;
          characters: {
            name: string;
            "@character_name": string | null;
            char_name: string | null;
            person_name: string;
          }[];
        }[]
      >
    >(true);
  });

  test("polymorphic link properties in expressions", async () => {
    const query = e.select(e.Object, () => ({
      id: true,
      ...e.is(e.Movie, {
        title: true,
        characters: (char) => ({
          name: true,
          "@character_name": true,
          char_name: char["@character_name"],
          person_name: char.name,

          filter: e.op(char["@character_name"], "ilike", "a%"),
        }),
      }),
    }));

    query.__element__.__shape__.characters;

    const result = await query.run(client);

    tc.assert<
      tc.IsExact<
        typeof result,
        {
          id: string;
          title: string | null;
          characters:
            | {
                name: string;
                "@character_name": string | null;
                char_name: string | null;
                person_name: string;
              }[]
            | null;
        }[]
      >
    >(true);
  });

  // test("assert_single this check", () => {
  //   const inner = e.select(e.Hero);
  //   const outer = e.select(e.Hero).assert_single().__args__[0];
  //   tc.assert<tc.IsExact<typeof inner, typeof outer>>(true);
  // });

  test("filters in subqueries", async () => {
    const q1 = e.select(e.Hero, (hero) => ({
      name: true,
      villains: {
        id: true,
        name: true,
      },
      filter_single: e.op(hero.name, "=", data.spidey.name),
    }));

    const res1 = await q1.run(client);

    tc.assert<
      tc.IsExact<
        typeof res1,
        {
          name: string;
          villains: {
            id: string;
            name: string;
          }[];
        } | null
      >
    >(true);

    assert.ok(res1);
    assert.equal(res1.villains.length, 1);

    const q2 = e.select(e.Hero, (hero) => ({
      name: true,
      villains: (v) => ({
        id: true,
        name: true,
        filter: e.op(v.name, "ilike", "%n%"),
      }),
      filter_single: e.op(hero.name, "=", data.spidey.name),
    }));

    const res2 = await q2.run(client);

    assert.ok(res2);
    assert.equal(res2.villains.length, 0);

    tc.assert<tc.IsExact<typeof res1, typeof res2>>(true);

    const q3 = e.select(e.Hero, (hero) => ({
      name: true,
      villains: (v) => ({
        id: true,
        name: true,
        filter: e.op(v.name, "=", "Thanos"),
      }),
      thanos: e.select(hero.villains, (v) => ({
        name: true,
        filter_single: e.op(v.name, "=", "Thanos"),
      })),
    }));

    await e
      .select(e.Hero.villains, (v) => ({
        name: true,
        filter: e.op(v.name, "=", "Thanos"),
      }))
      .run(client);

    const res3 = await q3.run(client);

    assert.equal(Array.isArray(res3), true);
    const ironMan = res3.find((r) => r.name === "Iron Man");
    assert.ok(ironMan);
    assert.equal(Array.isArray(ironMan.villains), true);
    assert.equal(Array.isArray(ironMan.thanos), false);

    tc.assert<
      tc.IsExact<
        typeof res3,
        /**
       * onst res3:
  {
    name: string;
    villains: {
        id: string;
        name: string;
    }[];
    thanos: {
        name: string | undefined;
    } | null;
  }[]
       */
        {
          name: string;
          villains: {
            id: string;
            name: string;
          }[];
          thanos: {
            name: string;
          } | null;
        }[]
      >
    >(true);
  });

  test("repeated computed", async () => {
    const query = e.select(e.Villain, () => ({
      id: true,
      name: true,
      nemesis: (nemesis) => {
        const nameLen = e.len(nemesis.name);
        return {
          name: true,
          nameLen,
          nameLen2: nameLen,
        };
      },
    }));

    assert.equal(
      query.toEdgeQL(),
      `WITH
  __scope_0_defaultVillain := DETACHED default::Villain
SELECT __scope_0_defaultVillain {
  id,
  name,
  nemesis := (
    WITH
      __scope_1_defaultHero_expr := __scope_0_defaultVillain.nemesis,
      __scope_1_defaultHero := (FOR __scope_1_defaultHero_inner IN {__scope_1_defaultHero_expr} UNION (
        WITH
          __withVar_2 := std::len(__scope_1_defaultHero_inner.name)
        SELECT __scope_1_defaultHero_inner {
          __withVar_2 := __withVar_2
        }
      ))
    SELECT __scope_1_defaultHero {
      name,
      single nameLen := __scope_1_defaultHero.__withVar_2,
      single nameLen2 := __scope_1_defaultHero.__withVar_2
    }
  )
}`
    );

    const res = await query.run(client);

    tc.assert<
      tc.IsExact<
        typeof res,
        {
          id: string;
          name: string;
          nemesis: {
            name: string;
            nameLen: number;
            nameLen2: number;
          } | null;
        }[]
      >
    >(true);
  });

  test("polymorphic subqueries", async () => {
    const query = e.select(e.Movie.characters, () => ({
      id: true,
      name: true,
      ...e.is(e.Villain, { nemesis: true }),
      ...e.is(e.Hero, {
        secret_identity: true,
        villains: {
          id: true,
          name: true,
          nemesis: (nemesis) => {
            const nameLen = e.len(nemesis.name);
            return {
              name: true,
              nameLen,
              nameLen2: nameLen,
            };
          },
        },
      }),
    }));

    assert.equal(
      query.toEdgeQL(),
      `WITH
  __scope_0_defaultPerson := DETACHED default::Movie.characters
SELECT __scope_0_defaultPerson {
  id,
  name,
  [IS default::Villain].nemesis,
  [IS default::Hero].secret_identity,
  multi villains := (
    WITH
      __scope_1_defaultVillain := __scope_0_defaultPerson[IS default::Hero].villains
    SELECT __scope_1_defaultVillain {
      id,
      name,
      nemesis := (
        WITH
          __scope_2_defaultHero_expr := __scope_1_defaultVillain.nemesis,
          __scope_2_defaultHero := (FOR __scope_2_defaultHero_inner IN {__scope_2_defaultHero_expr} UNION (
            WITH
              __withVar_3 := std::len(__scope_2_defaultHero_inner.name)
            SELECT __scope_2_defaultHero_inner {
              __withVar_3 := __withVar_3
            }
          ))
        SELECT __scope_2_defaultHero {
          name,
          single nameLen := __scope_2_defaultHero.__withVar_3,
          single nameLen2 := __scope_2_defaultHero.__withVar_3
        }
      )
    }
  )
}`
    );

    const res = await query.run(client);

    tc.assert<
      tc.IsExact<
        typeof res,
        {
          id: string;
          name: string;
          nemesis: {
            id: string;
          } | null;
          secret_identity: string | null;
          villains:
            | {
                id: string;
                name: string;
                nemesis: {
                  name: string;
                  nameLen: number;
                  nameLen2: number;
                } | null;
              }[]
            | null;
        }[]
      >
    >(true);
  });

  test("polymorphic field in nested shape", async () => {
    const query = e.select(e.Movie, (movie) => ({
      title: true,
      characters: (char) => ({
        name: true,
        order_by: char.name,
        ...e.is(e.Hero, { secret_identity: true }),
      }),
      filter_single: e.op(movie.title, "=", "The Avengers"),
    }));

    const result = await query.run(client);
    assert.deepEqual(JSON.parse(JSON.stringify(result)), {
      title: data.the_avengers.title,
      characters: [
        {
          name: data.cap.name,
          secret_identity: data.cap.secret_identity,
        },
        {
          name: data.iron_man.name,
          secret_identity: data.iron_man.secret_identity,
        },
      ],
    });

    tc.assert<
      tc.IsExact<
        typeof result,
        {
          title: string;
          characters: {
            name: string;
            secret_identity: string | null;
          }[];
        } | null
      >
    >(true);
  });

  test("correlated path select", async () => {
    const query = e.select(
      e.op(e.op(e.Hero.name, "++", " is "), "++", e.Hero.secret_identity)
    );

    const correlatedQuery = e.with([e.Hero], query);

    const heros = [data.cap, data.iron_man, data.spidey];

    assert.deepEqual(
      (await query.run(client)).sort(),
      $.util
        .flatMap(heros, (h1) =>
          heros.map((h2) => `${h1.name} is ${h2.secret_identity}`)
        )
        .sort()
    );

    assert.deepEqual(
      (await correlatedQuery.run(client)).sort(),
      heros.map((h) => `${h.name} is ${h.secret_identity}`).sort()
    );
  });

  test("modifiers on scalar selects", async () => {
    // filter
    const q1 = e.select(e.Hero.name, (el) => ({
      filter: e.op(el, "ilike", "%man%"),
    }));
    const res1 = await q1.run(client);
    tc.assert<tc.IsExact<typeof res1, string[]>>(true);
    assert.deepEqual(
      res1.sort(),
      [data.iron_man.name, data.spidey.name].sort()
    );

    // order
    const unorderedSet = e.set(
      e.int64(2),
      e.int64(4),
      e.int64(1),
      e.int64(5),
      e.int64(3)
    );

    const q2 = e.select(unorderedSet, (el) => ({
      order_by: el,
    }));
    const res2 = await q2.run(client);
    tc.assert<tc.IsExact<typeof res2, [number, ...number[]]>>(true);
    assert.deepEqual(res2, [1, 2, 3, 4, 5]);

    const q3 = e.select(unorderedSet, (el) => ({
      order_by: { expression: el, direction: e.DESC },
    }));
    const res3 = await q3.run(client);
    tc.assert<tc.IsExact<typeof res3, [number, ...number[]]>>(true);
    assert.deepEqual(res3, [5, 4, 3, 2, 1]);

    // offset and limit
    const q4 = e
      .select(unorderedSet, () => ({
        offset: 2,
        limit: 1,
      }))
      .assert_single();
    const res4 = await e.select(q4).run(client);
    tc.assert<tc.IsExact<typeof res4, number | null>>(true);
    assert.equal(res4, 1);
  });

  test("nested matching scopes", async () => {
    const q = e.select(e.Hero, (h) => ({
      name: h.name,
      otherHeros: e.select(e.Hero, (h2) => ({
        name: true,
        names: e.op(h.name, "++", h2.name),
        order_by: h2.name,
      })),
      order_by: h.name,
    }));

    const result = await q.run(client);

    const heros = [data.cap, data.iron_man, data.spidey];

    const expectedResult = heros.map((h) => ({
      name: h.name,
      otherHeros: heros.map((h2) => ({
        name: h2.name,
        names: h.name + h2.name,
      })),
    }));

    assert.deepEqual(JSON.stringify(result), JSON.stringify(expectedResult));
  });

  test("runnable expressions", async () => {
    const expr = e.op("Hello ", "++", "World");

    assert.equal(await expr.run(client), `Hello World`);
  });

  test("computed property path", async () => {
    const numbers = e.set(1, 2, 3);
    const expr = e.select({
      numbers,
    });
    const query = e.select(expr.numbers);

    assert.deepEqual(await query.run(client), [1, 2, 3]);
  });

  test("select with enums", async () => {
    const query = e.select(e.Movie, (movie) => ({
      title: true,
      genre: true,
      filter: e.op(movie.genre, "=", e.Genre.Action),
    }));
    const result = await query.run(client);
    assert.equal(result.length, 2);
  });

  test("filter by sequence", async () => {
    await e.op(e.Bag.seqField, "=", 1).run(client);
  });

  test("Date type", async () => {
    const dates = await e.select(e.Bag.datetimeField).run(client);
    tc.assert<tc.IsExact<typeof dates, Date[]>>(true);
  });

  test("select *", async () => {
    const allFields = await e
      .select(e.Movie, (movie) => ({
        ...e.Movie["*"],
        filter: e.op(movie.title, "=", data.the_avengers.title),
      }))
      .run(client);

    const { characters: _characters, ...movie } = data.the_avengers;
    assert.deepEqual(allFields, [movie]);
  });

  test("select required multi link", async () => {
    const query = e.select(e.User, () => ({
      username: true,
      favourite_movies: {
        title: true,
      },
    }));

    await query.run(client);
  });

  test("filter on link prop", async () => {
    const query = e.select(e.Movie, () => ({
      title: true,
      characters: (c) => ({
        name: true,
        "@character_name": true,
        filter: e.op(c["@character_name"], "=", "Tony Stark"),
      }),
    }));
    await query.run(client);
  });

  test("filter on link prop in nested path", async () => {
    const query = e.select(e.Movie, (movie) => ({
      filter: e.op("Iron Man", "in", movie.characters["@character_name"]),
      title: true,
    }));
    await query.run(client);
  });

  test("cardinality of linkprop in scopified object", async () => {
    const query = e.select(e.Movie.characters, (c) => {
      assert.deepEqual(
        c["@character_name"].__cardinality__,
        $.Cardinality.AtMostOne
      );
      return {
        name: true,
        // doesn't work yet
        // ["@character_name"]: true,
      };
    });
    await query.run(client);
  });

  test("portable shape", async () => {
    const baseShape = e.shape(e.Movie, (movie) => ({
      ...movie["*"],
    }));
    const query = e.select(e.Movie, (m) => {
      return {
        ...baseShape(m),
        characters: { name: true },
        filter_single: e.op(m.title, "=", "The Avengers"),
      };
    });

    const result = await query.run(client);
    assert.ok(result?.rating);
    assert.ok(result?.characters);
  });

  test("filter_single id", async () => {
    const query = e.select(e.Movie, () => ({
      title: true,
      filter_single: { title: "The Avengers" },
    }));
    const result = await query.run(client);
    assert.equal(result?.title, "The Avengers");
  });

  test("filter_single exclusive prop", async () => {
    const query = e.select(e.Movie, () => ({
      title: true,
      filter_single: { title: "The Avengers" },
    }));
    const result = await query.run(client);
    assert.equal(result?.title, "The Avengers");
  });

  test("filter_single composite", async () => {
    const query = e.select(e.Movie, () => ({
      title: true,
      filter_single: { title: "The Avengers", release_year: 2012 },
    }));
    const result = await query.run(client);
    assert.equal(result?.title, "The Avengers");
  });

  test("filter_single composite truple", async () => {
    const query = e.select(e.Profile, () => ({
      slug: true,
      filter_single: {
        a: "adsf",
        b: "adsf",
        c: "adsf",
      },
    }));

    await query.run(client);
  });

  test("filter_single expect error", async () => {
    // @ts-expect-error filter_single only types exclusive props
    e.select(e.Movie, () => ({
      title: true,
      filter_single: { genre: e.Genre.Horror },
    }));
  });

  test("filter_single card mismatch", async () => {
    const query = e.select(e.Movie, (movie) => ({
      title: true,
      filter_single: e.op(movie.genre, "=", e.Genre.Action),
    }));

    assert.rejects(() => query.run(client), edgedb.CardinalityViolationError);
  });

  test("type union links", async () => {
    const query = e.select(e.Z, () => ({
      xy: {
        a: true,
        ...e.is(e.X, {
          b: true,
        }),
      },
    }));

    const result = await query.run(client);

    tc.assert<
      tc.IsExact<
        typeof result,
        { xy: { a: string | null; b: number | null } | null }[]
      >
    >(true);
  });
});
