import {$expr_Select} from "@syntax/select";
import {
  Cardinality,
  ExpressionKind,
  TypeKind,
  typeutil,
} from "../../src/reflection";
import e from "../generated/example";

test("basic select", () => {
  const result = e.select(e.std.str("asdf" as string));
  type result = typeof result["__element__"]["__tstype__"];
  const f1: typeutil.assertEqual<result, string> = true;
});

test("basic shape", () => {
  const result = e.select(e.default.Hero);
  type result = typeof result["__element__"]["__tstype__"];
  const f1: typeutil.assertEqual<result, {id: string}> = true;
  expect(result.__element__.__params__).toEqual({id: true});
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

test("path construction", () => {
  const result = e.select(e.default.Hero);
  expect(result.villains.nemesis.name.__element__.__name__).toEqual(
    "std::str"
  );
});

test("complex shape", () => {
  type q1type = typeof q1["__element__"]["__tstype__"];
  const f1: typeutil.assertEqual<
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
  > = true;
});

test("compositionality", () => {
  // selecting a select statement should
  // default to { id }
  const no_params = e.select(q1);
  type no_params = typeof no_params["__element__"]["__tstype__"];
  const no_params_test: typeutil.assertEqual<
    no_params,
    {
      id: string;
    }
  > = true;
  expect(no_params.__element__.__params__).toEqual({id: true});
  expect(no_params.__element__.__polys__).toEqual([]);

  // allow override params
  const override_params = e.select(q1, {
    id: true,
    secret_identity: true,
  });
  type override_params = typeof override_params["__element__"]["__tstype__"];
  const f1: typeutil.assertEqual<
    override_params,
    {
      id: string;
      secret_identity: string | null;
    }
  > = true;
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
  expect(query.__element__.__name__).toEqual("default::Person_shape");
  expect(query.__element__.__params__).toEqual({id: true, name: true});
  expect(query.__element__.__polys__[0].params).toEqual({
    secret_identity: true,
  });
  expect(query.__element__.__polys__[0].type.__name__).toEqual(
    "default::Hero"
  );
  expect(query.__element__.__polys__[1].params).toEqual({
    nemesis: {name: true},
  });
  expect(query.__element__.__polys__[1].type.__name__).toEqual(
    "default::Villain"
  );

  type poly = typeof query["__element__"]["__polys__"][0];
  const f1: typeutil.assertEqual<poly["params"], {secret_identity: true}> =
    true;

  type result = typeof query["__element__"]["__tstype__"];
  const f2: typeutil.assertEqual<
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
  > = true;
});

test("shape type name", () => {
  const name = e.select(e.Hero).__element__.__name__;
  const f1: typeutil.assertEqual<typeof name, "default::Hero_shape"> = true;
});

test("limit inference", () => {
  const r1 = e.select(e.Hero, {name: true}).limit(e.int64(1));
  type c1 = typeof r1["__cardinality__"];
  const _f1: typeutil.assertEqual<c1, Cardinality.AtMostOne> = true;
  expect(r1.__cardinality__).toEqual(Cardinality.AtMostOne);

  const r2 = e.select(e.Hero, {name: true}).limit(e.int64(0));
  type c2 = typeof r2["__cardinality__"];
  const _f2: typeutil.assertEqual<c2, Cardinality.Empty> = true;
  expect(r2.__cardinality__).toEqual(Cardinality.Empty);

  const r3 = e.select(e.Hero, {name: true}).limit(e.int64(2));
  type c3 = typeof r3["__cardinality__"];
  const _f3: typeutil.assertEqual<c3, Cardinality.Many> = true;
  expect(r3.__cardinality__).toEqual(Cardinality.Many);

  const r4 = e.select(e.Hero, {name: true}).limit(e.set(e.int64(1)));
  type c4 = typeof r4["__cardinality__"];
  const _f4: typeutil.assertEqual<c4, Cardinality.AtMostOne> = true;
  expect(r4.__cardinality__).toEqual(Cardinality.AtMostOne);
});

test("limit literal inference", () => {
  const r1 = e.select(e.Hero, {name: true}).limit(1);
  type c1 = typeof r1["__cardinality__"];
  const _f1: typeutil.assertEqual<c1, Cardinality.AtMostOne> = true;
  expect(r1.__cardinality__).toEqual(Cardinality.AtMostOne);
  expect(r1.__modifier__.expr.__element__.__name__).toEqual("std::int64");
  expect(r1.__modifier__.expr.__value__).toEqual(1);

  const r2 = e.select(e.Hero, {name: true}).limit(1);
  type c2 = typeof r2["__cardinality__"];
  const _f2: typeutil.assertEqual<c2, Cardinality.AtMostOne> = true;
  expect(r2.__cardinality__).toEqual(Cardinality.AtMostOne);

  const r3 = e.select(e.Hero, {name: true}).limit(2);
  type c3 = typeof r3["__cardinality__"];
  const _f3: typeutil.assertEqual<c3, Cardinality.Many> = true;
  expect(r3.__cardinality__).toEqual(Cardinality.Many);
});

test("offset", () => {
  const q = e.select(e.Hero, {name: true});

  const r1 = q.offset(5);
  expect(r1.__modifier__.expr.__element__.__name__).toEqual("std::int64");
});

test("infer cardinality - scalar filters", () => {
  const q = e.select(e.Hero);
  // q.__element__.__kind__;
  const q2 = q.filter(e.eq(e.Hero.name, e.str("asdf")));
  const _f2: typeutil.assertEqual<
    typeof q2["__cardinality__"],
    Cardinality.AtMostOne
  > = true;
  expect(q2.__cardinality__).toEqual(Cardinality.AtMostOne);

  const u3 = e.uuid("asdf");
  const q3 = q.filter(e.eq(e.Hero.id, u3));
  const _f3: typeutil.assertEqual<
    typeof q3["__cardinality__"],
    Cardinality.AtMostOne
  > = true;
  expect(q3.__cardinality__).toEqual(Cardinality.AtMostOne);

  const q4 = q2.secret_identity;
  const _f4: typeutil.assertEqual<
    typeof q4["__cardinality__"],
    Cardinality.AtMostOne
  > = true;
  expect(q4.__cardinality__).toEqual(Cardinality.AtMostOne);

  const q5 = q.filter(e.eq(e.Hero.secret_identity, e.str("asdf")));
  const _f5: typeutil.assertEqual<
    typeof q5["__cardinality__"],
    Cardinality.Many
  > = true;
  expect(q5.__cardinality__).toEqual(Cardinality.Many);

  const q6 = e
    .select(e.Villain.nemesis)
    .filter(e.eq(e.Villain.nemesis.name, e.str("asdf")));
  const _f6: typeutil.assertEqual<
    typeof q6["__cardinality__"],
    Cardinality.AtMostOne
  > = true;
  expect(q6.__cardinality__).toEqual(Cardinality.AtMostOne);

  const strs = e.set(e.str("asdf"), e.str("qwer"));
  const q7 = e.select(e.Villain).filter(e.eq(e.Villain.name, strs));
  const _f7: typeutil.assertEqual<
    typeof q7["__cardinality__"],
    Cardinality.Many
  > = true;
  expect(q7.__cardinality__).toEqual(Cardinality.Many);

  const expr8 = e.select(e.Villain, {id: true, name: true});
  const q8 = e.select(expr8).filter(e.eq(expr8.name, e.str("asdf")));
  const _f8: typeutil.assertEqual<
    typeof q8["__cardinality__"],
    Cardinality.AtMostOne
  > = true;
  expect(q8.__cardinality__).toEqual(Cardinality.AtMostOne);

  const expr9 = e.select(e.Villain, {id: true, name: true});
  const q9 = e.select(expr9).filter(e.eq(e.Villain.name, e.str("asdf")));
  const _f9: typeutil.assertEqual<
    typeof q9["__cardinality__"],
    Cardinality.Many
  > = true;
  expect(q9.__cardinality__).toEqual(Cardinality.Many);

  const q10 = e.select(e.Villain).filter(e.eq(e.Villain.name, e.set(e.str)));
  const _f10: typeutil.assertEqual<
    typeof q10["__cardinality__"],
    Cardinality.Empty
  > = true;
  expect(q10.__cardinality__).toEqual(Cardinality.Empty);

  // test cardinality inference on object equality
  // e.select(e.Profile).filter(e.eq(e.Profile
  // ["<profile[IS default::Movie]"], e.select(e.Profile).limit(1)));
});

test("infer cardinality - object type filters", () => {
  const oneHero = e.select(e.Hero).limit(1);

  const singleHero = e.select(e.Hero).filter(e.eq(e.Hero, oneHero));

  const c1 = singleHero.__cardinality__;
  const t1: typeutil.assertEqual<typeof c1, Cardinality.AtMostOne> = true;
  expect(c1).toEqual(Cardinality.AtMostOne);

  const oneProfile = e.select(e.Hero).limit(1);
  const singleMovie = e
    .select(e.Movie)
    .filter(e.eq(e.Movie.profile, oneProfile));

  const c2 = singleMovie.__cardinality__;
  const t2: typeutil.assertEqual<typeof c2, Cardinality.AtMostOne> = true;
  expect(c2).toEqual(Cardinality.AtMostOne);

  // not a singleton

  const c3 = e
    .select(e.Villain)
    .filter(e.eq(e.Villain.nemesis, oneHero)).__cardinality__;
  const t3: typeutil.assertEqual<typeof c3, Cardinality.Many> = true;
  expect(c3).toEqual(Cardinality.Many);

  // not a singleton

  const c4 = e
    .select(e.Villain)
    .filter(e.eq(e.Villain, e.Villain)).__cardinality__;
  const t4: typeutil.assertEqual<typeof c4, Cardinality.Many> = true;
  expect(c4).toEqual(Cardinality.Many);
});

test("nonchainable offset/limit", () => {
  const val0 = e.select(e.Hero).orderBy(e.Hero.name);
  type val0 = typeof val0;
  const f0: "filter" extends keyof val0 ? true : false = false;

  const val1 = e.select(e.str("asdf")).offset(e.int64(5));
  type val1 = typeof val1;
  const f1: "offset" extends keyof val1 ? true : false = false;

  const val2 = e.select(e.str("asdf")).limit(1);
  type val2 = typeof val2;
  const f2a: "limit" extends keyof val2 ? true : false = false;
  const f2b: "offset" extends keyof val2 ? true : false = false;
  const f2c: "filter" extends keyof val2 ? true : false = false;
  const f2d: "orderBy" extends keyof val2 ? true : false = false;

  const f3: val2 extends $expr_Select ? true : false = true;
});
