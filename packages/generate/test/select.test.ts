import * as edgedb from "edgedb";
import * as $ from "../src/syntax/reflection";
import * as tc from "conditional-type-checks";

import e, {$infer} from "../dbschema/edgeql-js";
import {setupTests, teardownTests, TestData} from "./setupTeardown";
import {CardinalityViolationError} from "edgedb";
let client: edgedb.Client;
let data: TestData;

beforeAll(async () => {
  const setup = await setupTests();
  ({client, data} = setup);
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
  expect(strSelect.__kind__).toBe($.ExpressionKind.Select);
  expect(strSelect.__element__).toBe(e.str);
  expect(strSelect.__cardinality__).toBe($.Cardinality.One);

  const numberSelect = e.select(1234);
  expect(numberSelect.__kind__).toBe($.ExpressionKind.Select);
  expect(numberSelect.__element__.__name__).toBe(`std::number`);
  expect(numberSelect.__cardinality__).toBe($.Cardinality.One);

  const boolSelect = e.select(false);
  expect(boolSelect.__kind__).toBe($.ExpressionKind.Select);
  expect(boolSelect.__element__).toBe(e.bool);
  expect(boolSelect.__cardinality__).toBe($.Cardinality.One);

  const bigintSelect = e.select(BigInt(1234));
  expect(bigintSelect.__kind__).toBe($.ExpressionKind.Select);
  expect(bigintSelect.__element__).toBe(e.bigint);
  expect(bigintSelect.__cardinality__).toBe($.Cardinality.One);

  const bufferSelect = e.select(Buffer.from([]));
  expect(bufferSelect.__kind__).toBe($.ExpressionKind.Select);
  expect(bufferSelect.__element__).toBe(e.bytes);
  expect(bufferSelect.__cardinality__).toBe($.Cardinality.One);

  const dateSelect = e.select(new Date());
  expect(dateSelect.__kind__).toBe($.ExpressionKind.Select);
  expect(dateSelect.__element__).toBe(e.datetime);
  expect(dateSelect.__cardinality__).toBe($.Cardinality.One);

  const durationSelect = e.select(new edgedb.Duration());
  expect(durationSelect.__kind__).toBe($.ExpressionKind.Select);
  expect(durationSelect.__element__).toBe(e.duration);
  expect(durationSelect.__cardinality__).toBe($.Cardinality.One);

  const ldrSelect = e.select(new edgedb.LocalDateTime(1, 2, 3));
  expect(ldrSelect.__kind__).toBe($.ExpressionKind.Select);
  expect(ldrSelect.__element__).toBe(e.cal.local_datetime);
  expect(ldrSelect.__cardinality__).toBe($.Cardinality.One);

  const ldSelect = e.select(new edgedb.LocalDate(1, 2, 3));
  expect(ldSelect.__kind__).toBe($.ExpressionKind.Select);
  expect(ldSelect.__element__).toBe(e.cal.local_date);
  expect(ldSelect.__cardinality__).toBe($.Cardinality.One);

  const ltSelect = e.select(new edgedb.LocalTime(1, 2, 3));
  expect(ltSelect.__kind__).toBe($.ExpressionKind.Select);
  expect(ltSelect.__element__).toBe(e.cal.local_time);
  expect(ltSelect.__cardinality__).toBe($.Cardinality.One);

  const rdSelect = e.select(new edgedb.RelativeDuration(1, 2, 3));
  expect(rdSelect.__kind__).toBe($.ExpressionKind.Select);
  expect(rdSelect.__element__).toBe(e.cal.relative_duration);
  expect(rdSelect.__cardinality__).toBe($.Cardinality.One);

  const memSelect = e.select(new edgedb.ConfigMemory(BigInt(1234)));
  expect(memSelect.__kind__).toBe($.ExpressionKind.Select);
  expect(memSelect.__element__).toBe(e.cfg.memory);
  expect(memSelect.__cardinality__).toBe($.Cardinality.One);
});

test("no shape", async () => {
  const query = e.select(e.default.Hero);
  const result = await query.run(client);
  tc.assert<tc.IsExact<typeof result, {id: string}[]>>(true);
  expect(query.__element__.__shape__).toEqual(
    e.default.Hero.__element__.__shape__
  );
  expect(result.every(val => !!val.id)).toEqual(true);
});

test("computed only shape", () => {
  const query = e.select(e.Hero, hero => ({
    upper_name: e.str_upper(hero.name)
  }));

  tc.assert<tc.IsExact<$infer<typeof query>, {upper_name: string}[]>>(true);
});

const q1 = e.select(e.Hero, () => ({
  id: true,
  secret_identity: true,
  name: 1 > 0,
  villains: {
    id: true,
    computed: e.str("test")
  },
  computed: e.str("test")
}));

type q1 = $.setToTsType<typeof q1>;

test("path construction", () => {
  const result = e.select(e.default.Hero);
  expect(result.villains.nemesis.name.__element__.__name__).toEqual(
    "std::str"
  );
});

test("complex shape", () => {
  type q1type = $.BaseTypeToTsType<typeof q1["__element__"]>;
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
  const deep = e.select(e.Hero, _hero => ({
    id: true,
    __type__: {
      name: true,
      __type__: {
        id: true,
        __type__: {
          id: true,
          name: true
        }
      }
    }
  }));
  type deep = $.setToTsType<typeof deep>;
  tc.assert<
    tc.IsExact<
      deep,
      {
        id: string;
        __type__: {
          name: "default::Hero";
          __type__: {
            id: string;
            __type__: {
              id: string;
              name: "schema::ObjectType";
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

  type no_shape = $.BaseTypeToTsType<typeof no_shape["__element__"]>;
  type q1 = $.BaseTypeToTsType<typeof q1["__element__"]>;
  tc.assert<tc.IsExact<no_shape, q1>>(true);
  expect(no_shape.__element__.__shape__).toEqual(q1.__element__.__shape__);
  // expect(no_shape.__element__.__shape__).toEqual({id: true});

  // allow override shape
  const override_shape = e.select(q1, () => ({
    id: true,
    secret_identity: true
  }));
  type override_shape = $.BaseTypeToTsType<
    typeof override_shape["__element__"]
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
    ...e.is(e.Hero, {secret_identity: true}),
    ...e.is(e.Villain, {
      nemesis: {name: true}
    })
  }));
  // query.__element__.

  expect(query.__kind__).toEqual($.ExpressionKind.Select);
  expect(query.__element__.__kind__).toEqual($.TypeKind.object);
  expect(query.__element__.__name__).toEqual("default::Person");

  type result = $.BaseTypeToTsType<typeof query["__element__"]>;
  tc.assert<
    tc.IsExact<
      result,
      {
        id: string;
        name: string;
      } & (
        | {
            __typename: "default::Hero";
            secret_identity: string | null;
          }
        | {
            __typename: "default::Villain";
            nemesis: {
              name: string;
            } | null;
          }
      )
    >
  >(true);
});

test("polymorphic with nested modifiers", () => {
  e.is(e.Villain, {
    id: true
  });

  const query = e.select(e.Person, person => ({
    id: true,
    name: true,
    ...e.is(e.Villain, {
      nemesis: hero => ({
        name: true,
        order_by: hero.name,
        filter: e.op(hero.name, "=", hero.name),
        limit: 1,
        offset: 10
      })
    })
  }));

  type q = $.setToTsType<typeof query>;
});

test("computables in polymorphics", () => {
  const q = e.select(e.Person, person => ({
    id: true,
    ...e.is(e.Hero, {
      secret_identity: true
    }),
    ...e.is(e.Villain, {
      nemesis: {id: true, computable: e.int64(1234)},
      computable: e.int64(1234)
    })
  }));

  type q = $.setToTsType<typeof q>;
  tc.assert<
    tc.IsExact<
      q,
      ({
        id: string;
      } & (
        | {__typename: "default::Hero"; secret_identity: string | null}
        | {
            __typename: "default::Villain";
            nemesis: {id: string; computable: 1234} | null;
            computable: never;
          }
      ))[]
    >
  >(true);
});

test("parent type props in polymorphic", () => {
  const q = e.select(e.Person, () => ({
    ...e.is(e.Hero, {
      // name is prop of Person
      name: true,
      secret_identity: true
    }),
    ...e.is(e.Villain, {nemesis: {name: true}})
  }));

  tc.assert<
    tc.IsExact<
      $infer<typeof q>,
      (
        | {
            __typename: "default::Hero";
            name: string;
            secret_identity: string | null;
          }
        | {
            __typename: "default::Villain";
            nemesis: {name: string} | null;
          }
      )[]
    >
  >(true);
});

test("* in polymorphic", async () => {
  const q = e.select(e.Person, () => ({
    ...e.is(e.Hero, e.Hero["*"])
  }));

  // 'id' is filtered out since it is not valid in a polymorphic expr
  tc.assert<
    tc.IsExact<
      $infer<typeof q>,
      (
        | {__typename: "default::Villain"}
        | {
            __typename: "default::Hero";
            name: string;
            number_of_movies: number | null;
            secret_identity: string | null;
          }
      )[]
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
    tc.IsExact<typeof testSet["__cardinality__"], $.Cardinality.AtLeastOne>
  >(true);
  expect(testSet.__cardinality__).toEqual($.Cardinality.AtLeastOne);

  const r0 = e.select(testSet, () => ({}));
  tc.assert<
    tc.IsExact<typeof r0["__cardinality__"], $.Cardinality.AtLeastOne>
  >(true);
  expect(r0.__cardinality__).toEqual($.Cardinality.AtLeastOne);

  const r1 = e.select(testSet, () => ({limit: 1}));
  tc.assert<tc.IsExact<typeof r1["__cardinality__"], $.Cardinality.Many>>(
    true
  );
  expect(r1.__cardinality__).toEqual($.Cardinality.Many);

  const r2 = e.select(testSet, () => ({offset: 1}));
  tc.assert<tc.IsExact<typeof r2["__cardinality__"], $.Cardinality.Many>>(
    true
  );
  expect(r2.__cardinality__).toEqual($.Cardinality.Many);
});

test("offset", () => {
  const q = e.select(e.Hero, () => ({name: true}));
  const r1 = e.select(q, () => ({offset: 5}));
  expect(r1.__modifiers__.offset?.__element__.__name__).toEqual("std::number");
});

test("infer cardinality - scalar filters", () => {
  const q = e.select(e.Hero);
  const q2 = e.select(q, hero => ({
    filter_single: e.op(hero.name, "=", "asdf")
  }));
  tc.assert<tc.IsExact<typeof q2["__cardinality__"], $.Cardinality.AtMostOne>>(
    true
  );
  expect(q2.__cardinality__).toEqual($.Cardinality.AtMostOne);

  const u3 = e.uuid("asdf");
  const q3 = e.select(q, hero => {
    return {filter_single: e.op(hero.id, "=", u3)};
  });
  tc.assert<tc.IsExact<typeof q3["__cardinality__"], $.Cardinality.AtMostOne>>(
    true
  );
  expect(q3.__cardinality__).toEqual($.Cardinality.AtMostOne);

  const q4 = q2.secret_identity;
  tc.assert<tc.IsExact<typeof q4["__cardinality__"], $.Cardinality.AtMostOne>>(
    true
  );
  expect(q4.__cardinality__).toEqual($.Cardinality.AtMostOne);

  const q5 = e.select(q, hero => ({
    filter: e.op(hero.secret_identity, "=", "asdf")
  }));
  tc.assert<tc.IsExact<typeof q5["__cardinality__"], $.Cardinality.Many>>(
    true
  );
  expect(q5.__cardinality__).toEqual($.Cardinality.Many);

  const q6 = e.select(e.Villain.nemesis, nemesis => ({
    filter_single: e.op(nemesis.name, "=", "asdf")
  }));
  tc.assert<tc.IsExact<typeof q6["__cardinality__"], $.Cardinality.AtMostOne>>(
    true
  );
  expect(q6.__cardinality__).toEqual($.Cardinality.AtMostOne);

  const strs = e.set(e.str("asdf"), e.str("qwer"));
  const q7 = e.select(e.Villain, villain => ({
    filter: e.op(villain.name, "=", strs)
  }));
  tc.assert<tc.IsExact<typeof q7["__cardinality__"], $.Cardinality.Many>>(
    true
  );
  expect(q7.__cardinality__).toEqual($.Cardinality.Many);

  const expr8 = e.select(e.Villain, () => ({id: true, name: true}));
  const q8 = e.select(expr8, villain => ({
    filter_single: e.op(villain.name, "=", "asdf")
  }));
  tc.assert<tc.IsExact<typeof q8["__cardinality__"], $.Cardinality.AtMostOne>>(
    true
  );
  expect(q8.__cardinality__).toEqual($.Cardinality.AtMostOne);

  const expr9 = e.select(e.Villain, () => ({id: true, name: true}));
  const q9 = e.select(expr9, villain => ({
    filter_single: e.op(villain.name, "=", "asdf")
  }));
  tc.assert<tc.IsExact<typeof q9["__cardinality__"], $.Cardinality.AtMostOne>>(
    true
  );
  expect(q9.__cardinality__).toEqual($.Cardinality.AtMostOne);

  // const q10 = e.select(e.Villain, villain => ({
  //   filter_single: e.op(villain.name, "=", e.cast(e.str, e.set()))
  // }));
  // tc.assert<tc.IsExact<typeof q10["__cardinality__"], $.Cardinality.Empty>>(
  //   true
  // );
  // expect(q10.__cardinality__).toEqual($.Cardinality.Empty);
});

test("infer cardinality - object type filters", () => {
  const oneHero = e.select(e.Hero, () => ({limit: 1})).assert_single();

  const singleHero = e.select(e.Hero, hero => ({
    filter_single: e.op(hero, "=", oneHero)
  }));

  const c1 = singleHero.__cardinality__;
  tc.assert<tc.IsExact<typeof c1, $.Cardinality.AtMostOne>>(true);
  expect(c1).toEqual($.Cardinality.AtMostOne);

  const oneProfile = e.select(e.Hero, () => ({limit: 1})).assert_single();
  const singleMovie = e.select(e.Movie, movie => ({
    filter_single: e.op(movie.profile, "=", oneProfile)
  }));

  const c2 = singleMovie.__cardinality__;
  tc.assert<tc.IsExact<typeof c2, $.Cardinality.AtMostOne>>(true);
  expect(c2).toEqual($.Cardinality.AtMostOne);

  // not a singleton

  const c3 = e.select(e.Villain, villain => ({
    filter: e.op(villain.nemesis, "=", oneHero)
  })).__cardinality__;
  tc.assert<tc.IsExact<typeof c3, $.Cardinality.Many>>(true);
  expect(c3).toEqual($.Cardinality.Many);

  // not a singleton
  // technically a bug, but for now this behavior is expected
  const c4 = e.select(e.Villain, villain => ({
    filter_single: e.op(villain, "=", villain)
  })).__cardinality__;
  tc.assert<tc.IsExact<typeof c4, $.Cardinality.AtMostOne>>(true);
  expect(c4).toEqual($.Cardinality.AtMostOne);
});

test("non 'e.eq' filters", () => {
  const q1 = e.select(e.Hero, hero => ({
    filter: e.bool(true)
  }));
  tc.assert<tc.IsExact<typeof q1["__cardinality__"], $.Cardinality.Many>>(
    true
  );
  expect(q1.__cardinality__).toEqual($.Cardinality.Many);

  const q2 = e.select(e.Hero, hero => ({
    filter: e.op(true, "if", e.op(hero.name, "=", "Thanos"), "else", false)
  }));
  tc.assert<tc.IsExact<typeof q2["__cardinality__"], $.Cardinality.Many>>(
    true
  );
  expect(q2.__cardinality__).toEqual($.Cardinality.Many);
});

test("fetch heroes", async () => {
  const result = await e.select(e.Hero).run(client);
  expect(result.length).toEqual(3);
  expect(result.every(h => typeof h.id === "string")).toEqual(true);
});

test("filter by id", async () => {
  const result = await e
    .select(e.Hero, hero => ({
      filter_single: {id: data.spidey.id}
    }))
    .run(client);

  expect(result?.id).toEqual(data.spidey.id);
});

test("filter by id expr", async () => {
  const result = await e
    .select(e.Hero, hero => ({
      filter_single: {id: e.uuid(data.spidey.id)}
    }))
    .run(client);

  expect(result?.id).toEqual(data.spidey.id);
});

test("limit 1", async () => {
  const query = e
    .select(e.Hero, hero => ({
      order_by: hero.name,
      offset: 1,
      limit: 1
    }))
    .assert_single();
  const result = await e.select(query).run(client);
  expect(result?.id).toEqual(data.iron_man.id);
});

test("limit 2", async () => {
  const query = e.select(e.Hero, hero => ({
    order_by: hero.name,
    offset: 1,
    limit: 2
  }));
  const results = await query.run(client);

  expect(results.length).toEqual(2);
  expect(results).toEqual([{id: data.iron_man.id}, {id: data.spidey.id}]);
});

test("order by self", async () => {
  const query = e.select(e.Hero, hero => ({
    order_by: hero
  }));
  const result = await query.run(client);
  expect(result).toEqual(
    [data.cap, data.spidey, data.iron_man]
      .map(h => ({id: h.id}))
      .sort((a, b) => a.id.localeCompare(b.id))
  );
});

test("shapes", async () => {
  const query = e.select(
    e
      .select(e.Hero, hero => ({filter: e.op(hero.name, "=", "Iron Man")}))
      .assert_single(),
    () => ({
      id: true,
      name: true,
      secret_identity: true,
      villains: {id: true}
    })
  );

  const result = await query.run(client);
  expect(result).toMatchObject(data.iron_man);
  expect(result?.villains).toEqual([{id: data.thanos.id}]);
});

test("computables", async () => {
  const all_heroes = e.select(e.Hero, () => ({
    // __type__: {name: true}
    id: true
  }));
  const query = e.select(
    e
      .select(e.Person.is(e.Hero), hero => ({order_by: hero.name, limit: 1}))
      .assert_single(),
    hero => ({
      id: true,
      computable: e.int64(35),
      all_heroes
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

  expect(results?.id).toEqual(data.cap.id);
  expect(results?.computable).toEqual(35);
  // expect(
  //   results?.all_heroes.every(hero => hero.__type__.name === "default::Hero")
  // ).toEqual(true);
});

test("type intersections", async () => {
  const query = e.select(e.Person.is(e.Hero), () => ({
    id: true
    // __type__: {name: true},
  }));
  const results = await query.run(client);
  expect(results.every(person => typeof person.id === "string")).toEqual(true);
  // expect(
  //   results.every(person => person.__type__.name === "default::Hero")
  // ).toEqual(true);
});

test("type intersections - static", () => {
  const result = e.select(e.Movie.characters).is(e.Villain);
  type result = $.setToTsType<typeof result>;
  tc.assert<tc.IsExact<result, {id: string}[]>>(true);
});

test("backlinks", async () => {
  const result1 = await e
    .select(e.Hero["<characters[is Movie]"], () => ({
      id: true,
      // __type__: {name: true},
      title: true
    }))
    .run(client);

  const q2 = e.select(e.Hero["<characters"].is(e.Movie), () => ({
    id: true,
    // __type__: {name: true},
    title: true
  }));

  const result2 = await q2.run(client);

  expect(result1).toEqual(result2);
  expect(Array.isArray(result1)).toEqual(true);
  expect(
    [data.the_avengers.title, data.civil_war.title].includes(result1[0].title)
  ).toEqual(true);

  const q3 = e.select(e.Hero, hero => ({
    "<characters[is Movie]": {
      title: true
    },
    starredIn: e.select(hero["<characters[is Movie]"], () => ({
      title: true
    }))
  }));

  const res3 = await q3.run(client);
  tc.assert<
    tc.IsExact<
      typeof res3,
      {
        "<characters[is Movie]": {title: string}[];
        starredIn: {title: string}[];
      }[]
    >
  >(true);

  for (const hero of res3) {
    expect(hero["<characters[is Movie]"]).toEqual(hero.starredIn);
  }
});

test("overrides with implicit casting", () => {
  e.select(e.Hero, () => ({
    id: e.uuid("asdf"),
    number_of_movies: e.int64(1234),
    name: e.str("adsf")
  }));
});

test("link properties", async () => {
  const query = e.select(e.Movie, movie => ({
    id: true,
    characters: char => ({
      name: true,
      "@character_name": true
    })
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
  const query = e.select(e.Movie, movie => ({
    id: true,
    characters: char => ({
      name: true,
      "@character_name": true,
      char_name: char["@character_name"],
      person_name: char.name,

      filter: e.op(char["@character_name"], "ilike", "a%")
    })
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
  const query = e.select(e.Object, obj => ({
    id: true,
    ...e.is(e.Movie, {
      title: true,
      characters: char => ({
        name: true,
        "@character_name": true,
        char_name: char["@character_name"],
        person_name: char.name,

        filter: e.op(char["@character_name"], "ilike", "a%")
      })
    })
  }));

  query.__element__.__shape__.characters;

  const result = await query.run(client);

  tc.assert<
    tc.IsExact<
      typeof result,
      ({
        id: string;
      } & (
        | {
            __typename:
              | "default::A"
              | "default::User"
              | "default::MovieShape"
              | "default::Profile"
              | "default::S p a M"
              | "default::Łukasz";
          }
        | {
            __typename: "default::Movie";
            title: string;
            characters:
              | {
                  name: string;
                  "@character_name": string | null;
                  char_name: string | null;
                  person_name: string;
                }[];
          }
      ))[]
    >
  >(true);
});

// test("assert_single this check", () => {
//   const inner = e.select(e.Hero);
//   const outer = e.select(e.Hero).assert_single().__args__[0];
//   tc.assert<tc.IsExact<typeof inner, typeof outer>>(true);
// });

test("filters in subqueries", async () => {
  const q1 = e.select(e.Hero, hero => ({
    name: true,
    villains: {
      id: true,
      name: true
    },
    filter_single: e.op(hero.name, "=", data.spidey.name)
  }));

  const res1 = await q1.run(client);

  expect(res1).not.toBeNull();
  expect(res1!.villains.length).toBe(1);

  const q2 = e.select(e.Hero, hero => ({
    name: true,
    villains: v => ({
      id: true,
      name: true,
      filter: e.op(v.name, "ilike", "%n%")
    }),
    filter_single: e.op(hero.name, "=", data.spidey.name)
  }));

  const res2 = await q2.run(client);

  expect(res2).not.toBeNull();
  expect(res2!.villains.length).toBe(0);

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

  tc.assert<tc.IsExact<typeof res1, typeof res2>>(true);

  const q3 = e.select(e.Hero, hero => ({
    name: true,
    villains: v => ({
      id: true,
      name: true,
      filter: e.op(v.name, "=", "Thanos")
    }),
    thanos: e.select(hero.villains, v => ({
      name: true,
      filter_single: e.op(v.name, "=", "Thanos")
    }))
  }));

  const test = await e
    .select(e.Hero.villains, v => ({
      name: true,
      filter: e.op(v.name, "=", "Thanos")
    }))
    .run(client);

  const arg = q3.__element__.__shape__.thanos.__element__.__shape__;

  // q3.__modifiers__.
  const res3 = await q3.run(client);

  expect(Array.isArray(res3)).toBe(true);
  const ironMan = res3.find(r => r.name === "Iron Man");
  expect(ironMan).not.toBeUndefined();
  expect(Array.isArray(ironMan!.villains)).toBe(true);
  expect(Array.isArray(ironMan!.thanos)).toBe(false);

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
    nemesis: nemesis => {
      const nameLen = e.len(nemesis.name);
      return {
        name: true,
        nameLen,
        nameLen2: nameLen
      };
    }
  }));

  expect(query.toEdgeQL()).toEqual(`WITH
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
}`);

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
  const query = e.select(e.Movie.characters, character => ({
    id: true,
    name: true,
    ...e.is(e.Villain, {nemesis: true}),
    ...e.is(e.Hero, {
      secret_identity: true,
      villains: {
        id: true,
        name: true,
        nemesis: nemesis => {
          const nameLen = e.len(nemesis.name);
          return {
            name: true,
            nameLen,
            nameLen2: nameLen
          };
        }
      }
    })
  }));

  expect(query.toEdgeQL()).toEqual(`WITH
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
  ),
  __typename := .__type__.name
}`);

  const res = await query.run(client);

  tc.assert<
    tc.IsExact<
      typeof res,
      ({
        id: string;
        name: string;
      } & (
        | {
            __typename: "default::Villain";
            nemesis: {id: string} | null;
          }
        | {
            __typename: "default::Hero";
            secret_identity: string | null;
            villains: {
              id: string;
              name: string;
              nemesis: {
                name: string;
                nameLen: number;
                nameLen2: number;
              } | null;
            }[];
          }
      ))[]
    >
  >(true);
});

test("polymorphic field in nested shape", async () => {
  const query = e.select(e.Movie, movie => ({
    title: true,
    characters: char => ({
      name: true,
      order_by: char.name,
      ...e.is(e.Hero, {secret_identity: true})
    }),
    filter_single: e.op(movie.title, "=", "The Avengers")
  }));

  const result = await query.run(client);
  expect(JSON.parse(JSON.stringify(result))).toEqual({
    title: data.the_avengers.title,
    characters: [
      {
        __typename: "default::Hero",
        name: data.cap.name,
        secret_identity: data.cap.secret_identity
      },
      {
        __typename: "default::Hero",
        name: data.iron_man.name,
        secret_identity: data.iron_man.secret_identity
      }
    ]
  });

  tc.assert<
    tc.IsExact<
      typeof result,
      {
        title: string;
        characters: ({
          name: string;
        } & (
          | {__typename: "default::Villain"}
          | {
              __typename: "default::Hero";
              secret_identity: string | null;
            }
        ))[];
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

  expect((await query.run(client)).sort()).toEqual(
    $.util
      .flatMap(heros, h1 =>
        heros.map(h2 => `${h1.name} is ${h2.secret_identity}`)
      )
      .sort()
  );

  expect((await correlatedQuery.run(client)).sort()).toEqual(
    heros.map(h => `${h.name} is ${h.secret_identity}`).sort()
  );
});

test("modifiers on scalar selects", async () => {
  // filter
  const q1 = e.select(e.Hero.name, el => ({
    filter: e.op(el, "ilike", "%man%")
  }));
  const res1 = await q1.run(client);
  tc.assert<tc.IsExact<typeof res1, string[]>>(true);
  expect(res1.sort()).toEqual([data.iron_man.name, data.spidey.name].sort());

  // order
  const unorderedSet = e.set(
    e.int64(2),
    e.int64(4),
    e.int64(1),
    e.int64(5),
    e.int64(3)
  );

  const q2 = e.select(unorderedSet, el => ({
    order_by: el
  }));
  const res2 = await q2.run(client);
  tc.assert<tc.IsExact<typeof res2, [number, ...number[]]>>(true);
  expect(res2).toEqual([1, 2, 3, 4, 5]);

  const q3 = e.select(unorderedSet, el => ({
    order_by: {expression: el, direction: e.DESC}
  }));
  const res3 = await q3.run(client);
  tc.assert<tc.IsExact<typeof res3, [number, ...number[]]>>(true);
  expect(res3).toEqual([5, 4, 3, 2, 1]);

  // offset and limit
  const q4 = e
    .select(unorderedSet, el => ({
      offset: 2,
      limit: 1
    }))
    .assert_single();
  const res4 = await e.select(q4).run(client);
  tc.assert<tc.IsExact<typeof res4, number | null>>(true);
  expect(res4).toEqual(1);
});

test("nested matching scopes", async () => {
  const q = e.select(e.Hero, h => ({
    name: h.name,
    otherHeros: e.select(e.Hero, h2 => ({
      name: true,
      names: e.op(h.name, "++", h2.name),
      order_by: h2.name
    })),
    order_by: h.name
  }));

  const result = await q.run(client);

  const heros = [data.cap, data.iron_man, data.spidey];

  const expectedResult = heros.map(h => ({
    name: h.name,
    otherHeros: heros.map(h2 => ({
      name: h2.name,
      names: h.name + h2.name
    }))
  }));

  expect(JSON.stringify(result)).toEqual(JSON.stringify(expectedResult));
});

test("runnable expressions", async () => {
  const expr = e.op("Hello ", "++", "World");

  expect(await expr.run(client)).toEqual(`Hello World`);
});

test("computed property path", async () => {
  const numbers = e.set(1, 2, 3);
  const expr = e.select({
    numbers
  });
  const query = e.select(expr.numbers);

  expect(await query.run(client)).toEqual([1, 2, 3]);
});

test("select with enums", async () => {
  const query = e.select(e.Movie, movie => ({
    title: true,
    genre: true,
    filter: e.op(movie.genre, "=", e.Genre.Action)
  }));
  const result = await query.run(client);
  expect(result.length).toEqual(2);
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
    .select(e.Movie, movie => ({
      ...e.Movie["*"],
      filter: e.op(movie.title, "=", data.the_avengers.title)
    }))
    .run(client);

  expect(allFields).toEqual([
    {
      ...data.the_avengers,
      characters: undefined
    }
  ]);
});

test("select required multi link", async () => {
  const query = e.select(e.User, () => ({
    username: true,
    favourite_movies: {
      title: true
    }
  }));

  await query.run(client);
});

test("filter on link prop", async () => {
  const query = e.select(e.Movie, movie => ({
    title: true,
    characters: c => ({
      name: true,
      "@character_name": true,
      filter: e.op(c["@character_name"], "=", "Tony Stark")
    })
  }));
  await query.run(client);
});

test("filter on link prop in nested path", async () => {
  const query = e.select(e.Movie, movie => ({
    filter: e.op("Iron Man", "in", movie.characters["@character_name"]),
    title: true
  }));
  await query.run(client);
});

test("cardinality of linkprop in scopified object", async () => {
  const query = e.select(e.Movie.characters, c => {
    expect(c["@character_name"].__cardinality__).toEqual(
      $.Cardinality.AtMostOne
    );
    return {
      name: true
      // doesn't work yet
      // ["@character_name"]: true,
    };
  });
  await query.run(client);
});

test("portable shape", async () => {
  const baseShape = e.shape(e.Movie, movie => ({
    ...movie["*"]
  }));
  const query = e.select(e.Movie, m => {
    return {
      ...baseShape(m),
      characters: {name: true},
      filter_single: e.op(m.title, "=", "The Avengers")
    };
  });

  const result = await query.run(client);
  expect(result?.rating).toBeDefined();
  expect(result?.characters).toBeDefined();
});

test("filter_single id", async () => {
  const query = e.select(e.Movie, () => ({
    title: true,
    filter_single: {title: "The Avengers"}
  }));
  const result = await query.run(client);
  expect(result?.title).toEqual("The Avengers");
});

test("filter_single exclusive prop", async () => {
  const query = e.select(e.Movie, () => ({
    title: true,
    filter_single: {title: "The Avengers"}
  }));
  const result = await query.run(client);
  expect(result?.title).toEqual("The Avengers");
});

test("filter_single composite", async () => {
  const query = e.select(e.Movie, () => ({
    title: true,
    filter_single: {title: "The Avengers", release_year: 2012}
  }));
  const result = await query.run(client);
  expect(result?.title).toEqual("The Avengers");
});

test("filter_single composite truple", async () => {
  const query = e.select(e.Profile, () => ({
    slug: true,
    filter_single: {
      a: "adsf",
      b: "adsf",
      c: "adsf"
    }
  }));

  await query.run(client);
});

test("filter_single expect error", async () => {
  // @ts-expect-error
  e.select(e.Movie, () => ({
    title: true,
    filter_single: {genre: e.Genre.Horror}
  }));
});

test("filter_single card mismatch", async () => {
  const query = e.select(e.Movie, movie => ({
    title: true,
    filter_single: e.op(movie.genre, "=", e.Genre.Action)
  }));

  await expect(query.run(client)).rejects.toThrow(CardinalityViolationError);
});

// EdgeQL limitation
// test("link prop on backlink", async()=>{
//   const query = e.select(e.Person, person => ({
//     movies: e.select(person["<characters[is Movie]"], m => ({
//       title: true,
//       "@character_name": true,
//     })),
//   }));
//   await query.run(client);
// })

// Modifier methods removed for now, until we can fix typescript inference
// problems / excessively deep errors

// test("modifier methods", async () => {
//   const strs = ["c", "a", "aa", "b", "cc", "bb"];
//   let q3 = e.select(e.set(...strs), vals => ({
//     order_by: {expression: e.len(vals), direction: e.DESC},
//   }));

//   // reassignment allowed
//   q3 = q3.order_by(vals => vals);
//   tc.assert<tc.IsExact<typeof q3["__cardinality__"], $.Cardinality.Many>>(
//     true
//   );

//   expect(await q3.run(client)).toEqual(["aa", "bb", "cc", "a", "b", "c"]);

//   const q4 = e
//     .select(e.Hero, hero => ({
//       order_by: hero.name,
//     }))
//     .limit(2);
//   const r4 = await q4.run(client);

//   expect(r4.length).toEqual(2);
//   expect(await q4.limit(1).offset(1).run(client)).toEqual(r4.slice(1, 2));

//   const q5 = e
//     .select(e.Hero, hero => ({
//       name: true,
//       nameLen: e.len(hero.name),
//     }))
//     .order_by(hero => hero.nameLen);

//   const r5 = await q5.run(client);
// });

// test("modifier methods", async () => {
//   let freeQuery = e.select({
//     heroes: e.Hero,
//   });

//   const filteredFreeQuery = freeQuery.filter(arg => e.bool(false));
//   // methods do not change change cardinality
//   tc.assert<
//     tc.IsExact<typeof filteredFreeQuery["__cardinality__"], $.Cardinality.One>
//   >(true);
//   expect(filteredFreeQuery.__cardinality__).toEqual($.Cardinality.One);

//   const offsetFreeQuery = freeQuery.offset(3);
//   // methods do not change change cardinality
//   tc.assert<
//     tc.IsExact<typeof offsetFreeQuery["__cardinality__"], $.Cardinality.One>
//   >(true);
//   expect(offsetFreeQuery.__cardinality__).toEqual($.Cardinality.One);

//   const limitFreeQuery = freeQuery.limit(1);
//   // methods do not change change cardinality
//   tc.assert<
//     tc.IsExact<typeof limitFreeQuery["__cardinality__"], $.Cardinality.One>
//   >(true);
//   expect(limitFreeQuery.__cardinality__).toEqual($.Cardinality.One);

//   // should allow reassignment
//   freeQuery = freeQuery.offset(1).filter(e.bool(false));
//   expect(await freeQuery.run(client)).toEqual(null);
// });
