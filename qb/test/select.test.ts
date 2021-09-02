import {edgedb} from "@generated/imports";
import {$expr_Select} from "@syntax/select";
import * as tc from "conditional-type-checks";
import {
  BaseTypeToTsType,
  Cardinality,
  ExpressionKind,
  SelectModifierKind,
  setToTsType,
  TypeKind,
} from "../../src/reflection";
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

test("basic select", () => {
  const result = e.select(e.std.str("asdf" as string));
  type result = BaseTypeToTsType<typeof result["__element__"]>;
  tc.assert<tc.IsExact<result, string>>(true);
});

test("basic shape", () => {
  const result = e.select(e.default.Hero);
  type result = BaseTypeToTsType<typeof result["__element__"]>;
  tc.assert<tc.IsExact<result, {id: string}>>(true);
  expect(result.__element__.__shape__).toEqual({id: true});
});

const q1 = e.select(e.Hero, {
  id: true,
  secret_identity: true,
  name: 1 > 0,
  villains: {
    id: true,
    computed: e.str("test"),
  },
  computed: e.str("test"),
});

type q1 = setToTsType<typeof q1>;

test("path construction", () => {
  const result = e.select(e.default.Hero);
  expect(result.villains.nemesis.name.__element__.__name__).toEqual(
    "std::str"
  );
});

test("complex shape", () => {
  type q1type = BaseTypeToTsType<typeof q1["__element__"]>;
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
        };
        computed: "test";
      }
    >
  >(true);
});

test("deep shape", () => {
  const deep = e.select(e.Hero, {
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
  });
  type deep = setToTsType<typeof deep>;
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
  type no_shape = BaseTypeToTsType<typeof no_shape["__element__"]>;
  tc.assert<
    tc.IsExact<
      no_shape,
      {
        id: string;
      }
    >
  >(true);
  expect(no_shape.__element__.__shape__).toEqual({id: true});
  expect(no_shape.__element__.__polys__).toEqual([]);

  // allow override shape
  const override_shape = e.select(q1, {
    id: true,
    secret_identity: true,
  });
  type override_shape = BaseTypeToTsType<typeof override_shape["__element__"]>;
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
  const query = e.select(
    e.Person,
    {
      id: true,
      name: true,
    },
    e.is(e.Hero, {secret_identity: true}),
    e.is(e.Villain, {
      nemesis: {name: true},
    })
  );

  expect(query.__kind__).toEqual(ExpressionKind.Select);
  expect(query.__element__.__kind__).toEqual(TypeKind.object);
  expect(query.__element__.__name__).toEqual("default::Person");
  expect(query.__element__.__shape__).toEqual({id: true, name: true});
  expect(query.__element__.__polys__[0].shape).toEqual({
    secret_identity: true,
  });
  expect(query.__element__.__polys__[0].type.__name__).toEqual(
    "default::Hero"
  );
  expect(query.__element__.__polys__[1].shape).toEqual({
    nemesis: {name: true},
  });
  expect(query.__element__.__polys__[1].type.__name__).toEqual(
    "default::Villain"
  );

  type poly = typeof query["__element__"]["__polys__"][0];
  tc.assert<tc.IsExact<poly["shape"], {secret_identity: true}>>(true);

  const func = <T extends {arg: string}>(arg: T) => arg;
  func({arg: "asdf"});

  type result = BaseTypeToTsType<typeof query["__element__"]>;
  tc.assert<
    tc.IsExact<
      result,
      {
        id: string;
        name: string;
        nemesis?:
          | {
              name: string;
            }
          | undefined;
        secret_identity?: string | null | undefined;
      }
    >
  >(true);
});

test("shape type name", () => {
  const name = e.select(e.Hero).__element__.__name__;
  tc.assert<tc.IsExact<typeof name, "default::Hero">>(true);
});

test("limit inference", () => {
  const r1 = e.select(e.Hero, {name: true}).limit(e.int64(1));
  type c1 = typeof r1["__cardinality__"];
  tc.assert<tc.IsExact<c1, Cardinality.AtMostOne>>(true);
  expect(r1.__cardinality__).toEqual(Cardinality.AtMostOne);

  const r2 = e.select(e.Hero, {name: true}).limit(e.int64(0));
  type c2 = typeof r2["__cardinality__"];
  tc.assert<tc.IsExact<c2, Cardinality.Empty>>(true);
  expect(r2.__cardinality__).toEqual(Cardinality.Empty);

  const r3 = e.select(e.Hero, {name: true}).limit(e.int64(2));
  type c3 = typeof r3["__cardinality__"];
  tc.assert<tc.IsExact<c3, Cardinality.Many>>(true);
  expect(r3.__cardinality__).toEqual(Cardinality.Many);

  const r4 = e.select(e.Hero, {name: true}).limit(e.set(e.int64(1)));
  type c4 = typeof r4["__cardinality__"];
  tc.assert<tc.IsExact<c4, Cardinality.AtMostOne>>(true);
  expect(r4.__cardinality__).toEqual(Cardinality.AtMostOne);
});

test("limit literal inference", () => {
  const r1 = e.select(e.Hero, {name: true}).limit(1);
  type c1 = typeof r1["__cardinality__"];
  tc.assert<tc.IsExact<c1, Cardinality.AtMostOne>>(true);
  expect(r1.__cardinality__).toEqual(Cardinality.AtMostOne);
  expect(r1.__modifier__!.expr.__element__.__name__).toEqual("std::int64");
  const mod = r1.__modifier__!;
  expect(mod.kind).toEqual(SelectModifierKind.limit);
  if (mod.kind === SelectModifierKind.limit) {
    expect((mod.expr as any).__value__).toEqual(1);
  }

  const r2 = e.select(e.Hero, {name: true}).limit(1);
  type c2 = typeof r2["__cardinality__"];
  tc.assert<tc.IsExact<c2, Cardinality.AtMostOne>>(true);
  expect(r2.__cardinality__).toEqual(Cardinality.AtMostOne);

  const r3 = e.select(e.Hero, {name: true}).limit(2);
  type c3 = typeof r3["__cardinality__"];
  tc.assert<tc.IsExact<c3, Cardinality.Many>>(true);
  expect(r3.__cardinality__).toEqual(Cardinality.Many);
});

test("offset", () => {
  const q = e.select(e.Hero, {name: true});
  const r1 = q.offset(5);
  expect(r1.__modifier__!.expr.__element__.__name__).toEqual("std::int64");
});

test("infer cardinality - scalar filters", () => {
  const q = e.select(e.Hero);
  q.$assertSingle();
  const filter = e.eq(e.Hero.name, e.str("asdf"));

  const q2 = q.filter(filter);
  tc.assert<tc.IsExact<typeof q2["__cardinality__"], Cardinality.AtMostOne>>(
    true
  );
  expect(q2.__cardinality__).toEqual(Cardinality.AtMostOne);

  const u3 = e.uuid("asdf");
  const q3 = q.filter(e.eq(e.Hero.id, u3));
  tc.assert<tc.IsExact<typeof q3["__cardinality__"], Cardinality.AtMostOne>>(
    true
  );
  expect(q3.__cardinality__).toEqual(Cardinality.AtMostOne);

  const q4 = q2.secret_identity;
  tc.assert<tc.IsExact<typeof q4["__cardinality__"], Cardinality.AtMostOne>>(
    true
  );
  expect(q4.__cardinality__).toEqual(Cardinality.AtMostOne);

  const q5 = q.filter(e.eq(e.Hero.secret_identity, e.str("asdf")));
  tc.assert<tc.IsExact<typeof q5["__cardinality__"], Cardinality.Many>>(true);
  expect(q5.__cardinality__).toEqual(Cardinality.Many);

  const q6 = e
    .select(e.Villain.nemesis)
    .filter(e.eq(e.Villain.nemesis.name, e.str("asdf")));
  tc.assert<tc.IsExact<typeof q6["__cardinality__"], Cardinality.AtMostOne>>(
    true
  );
  expect(q6.__cardinality__).toEqual(Cardinality.AtMostOne);

  const strs = e.set(e.str("asdf"), e.str("qwer"));
  const q7 = e.select(e.Villain).filter(e.eq(e.Villain.name, strs));
  tc.assert<tc.IsExact<typeof q7["__cardinality__"], Cardinality.Many>>(true);
  expect(q7.__cardinality__).toEqual(Cardinality.Many);

  const expr8 = e.select(e.Villain, {id: true, name: true});
  const q8 = e.select(expr8).filter(e.eq(expr8.name, e.str("asdf")));
  tc.assert<tc.IsExact<typeof q8["__cardinality__"], Cardinality.AtMostOne>>(
    true
  );
  expect(q8.__cardinality__).toEqual(Cardinality.AtMostOne);

  const expr9 = e.select(e.Villain, {id: true, name: true});
  const q9 = e.select(expr9).filter(e.eq(e.Villain.name, e.str("asdf")));
  tc.assert<tc.IsExact<typeof q9["__cardinality__"], Cardinality.AtMostOne>>(
    true
  );
  expect(q9.__cardinality__).toEqual(Cardinality.AtMostOne);

  const q10 = e.select(e.Villain).filter(e.eq(e.Villain.name, e.set(e.str)));
  tc.assert<tc.IsExact<typeof q10["__cardinality__"], Cardinality.Empty>>(
    true
  );
  expect(q10.__cardinality__).toEqual(Cardinality.Empty);

  // test cardinality inference on object equality
  // e.select(e.Profile).filter(e.eq(e.Profile
  // ["<profile[IS default::Movie]"], e.select(e.Profile).limit(1)));
});

test("infer cardinality - object type filters", () => {
  const oneHero = e.select(e.Hero).limit(1);

  const singleHero = e.select(e.Hero).filter(e.eq(e.Hero, oneHero));

  const c1 = singleHero.__cardinality__;
  tc.assert<tc.IsExact<typeof c1, Cardinality.AtMostOne>>(true);
  expect(c1).toEqual(Cardinality.AtMostOne);

  const oneProfile = e.select(e.Hero).limit(1);
  const singleMovie = e
    .select(e.Movie)
    .filter(e.eq(e.Movie.profile, oneProfile));

  const c2 = singleMovie.__cardinality__;
  tc.assert<tc.IsExact<typeof c2, Cardinality.AtMostOne>>(true);
  expect(c2).toEqual(Cardinality.AtMostOne);

  // not a singleton

  const c3 = e
    .select(e.Villain)
    .filter(e.eq(e.Villain.nemesis, oneHero)).__cardinality__;
  tc.assert<tc.IsExact<typeof c3, Cardinality.Many>>(true);
  expect(c3).toEqual(Cardinality.Many);

  // not a singleton

  const c4 = e
    .select(e.Villain)
    .filter(e.eq(e.Villain, e.Villain)).__cardinality__;
  tc.assert<tc.IsExact<typeof c4, Cardinality.Many>>(true);
  expect(c4).toEqual(Cardinality.Many);
});

test("nonchainable offset/limit", () => {
  const val0 = e.select(e.Hero).orderBy(e.Hero.name);
  type val0 = typeof val0;
  tc.assert<"filter" extends keyof val0 ? true : false>(false);

  const val1 = e.select(e.str("asdf")).offset(e.int64(5));
  type val1 = typeof val1;
  tc.assert<"offset" extends keyof val1 ? true : false>(false);

  const val2 = e.select(e.str("asdf")).limit(1);
  type val2 = typeof val2;
  tc.assert<tc.NotHas<keyof val2, "limit">>(true);
  tc.assert<tc.NotHas<keyof val2, "offset">>(true);
  tc.assert<tc.NotHas<keyof val2, "filter">>(true);
  tc.assert<tc.NotHas<keyof val2, "orderBy">>(true);
  tc.assert<tc.IsExact<typeof val2 extends $expr_Select ? true : false, true>>(
    true
  );
});

test("fetch heroes", async () => {
  const result = await pool.query(e.select(e.Hero).toEdgeQL());
  expect(result.length).toEqual(3);
  expect(result.every(h => typeof h.id === "string")).toEqual(true);
});
test("filter by id", async () => {
  const result = await e
    .select(e.Hero)
    .filter(e.eq(e.Hero.id, e.uuid(data.spidey.id)))
    .query(pool);

  expect(result?.id).toEqual(data.spidey.id);
});
test("limit 1", async () => {
  const query = e.select(e.Hero).orderBy(e.Hero.name).offset(1).limit(1);
  const result = await query.query(pool);
  expect(result?.id).toEqual(data.iron_man.id);
});

test("limit 2", async () => {
  const query = e.select(e.Hero).orderBy(e.Hero.name).offset(1).limit(2);
  const results = await query.query(pool);

  expect(results.length).toEqual(2);
  expect(results).toEqual([{id: data.iron_man.id}, {id: data.spidey.id}]);
});

test("shapes", async () => {
  const query = e.select(
    e
      .select(e.Hero)
      .filter(e.eq(e.Hero.name, e.str("Iron Man")))
      .$assertSingle(),
    {
      id: true,
      name: true,
      secret_identity: true,
      villains: {id: true},
    }
  );

  const result = await query.query(pool); // query.query(pool);
  expect(result).toMatchObject(data.iron_man);
  expect(result?.villains).toEqual([{id: data.thanos.id}]);
});

test("computables", async () => {
  const query = e
    .select(e.Person.$is(e.Hero), {
      id: true,
      computable: e.int64(35),
      all_heroes: (() => e.select(e.Hero, {__type__: {name: true}}))(),
    })
    .orderBy(e.Person.name)
    .limit(1);

  type query = setToTsType<typeof query>;
  tc.assert<
    tc.IsExact<
      query,
      {
        id: string;
        computable: 35;
        all_heroes: {__type__: {name: string}}[];
      } | null
    >
  >(true);
  const results = await query.query(pool);

  expect(results?.id).toEqual(data.cap.id);
  expect(results?.computable).toEqual(35);
  expect(
    results?.all_heroes.every(hero => hero.__type__.name === "default::Hero")
  ).toEqual(true);
});

test("type intersections", async () => {
  const query = e.select(e.Person.$is(e.Hero), {
    id: true,
    __type__: {name: true},
  });
  const results = await query.query(pool);
  expect(
    results.every(person => person.__type__.name === "default::Hero")
  ).toEqual(true);
});

test("type intersections - static", () => {
  const result = e.select(e.Movie.characters).$is(e.Villain);
  type result = setToTsType<typeof result>;
  tc.assert<tc.IsExact<result, {id: string}[]>>(true);
});

test("backlinks", async () => {
  const result1 = await e
    .select(e.Hero["<characters[IS default::Movie]"], {
      id: true,
      __type__: {name: true},
      title: true,
    })
    .query(pool);

  const result2 = await e
    .select(e.Hero["<characters"].$is(e.Movie), {
      id: true,
      __type__: {name: true},
      title: true,
    })
    .query(pool);

  expect(result1).toEqual(result2);
  expect(Array.isArray(result1)).toEqual(true);
  expect(
    [data.the_avengers.title, data.civil_war.title].includes(result1[0].title)
  ).toEqual(true);
});

// test("assertSingle this check", () => {
//   const inner = e.select(e.Hero);
//   const outer = e.select(e.Hero).$assertSingle().__args__[0];
//   tc.assert<tc.IsExact<typeof inner, typeof outer>>(true);
// });
