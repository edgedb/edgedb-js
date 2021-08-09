// import * as edgedb from "edgedb";
import {assert} from "console";
import {
  Cardinality,
  ExpressionKind,
  TypeKind,
  typeutil,
} from "../../src/reflection";
import e, {is, select} from "../generated/example";

test("basic select", () => {
  const result = select(e.std.str("asdf" as string));
  type result = typeof result["__element__"]["__tstype__"];
  const f1: typeutil.assertEqual<result, string> = true;
});

test("basic shape", () => {
  const result = select(e.default.Hero);
  type result = typeof result["__element__"]["__tstype__"];
  const f1: typeutil.assertEqual<result, {id: string}> = true;
  expect(result.__element__.__params__).toEqual({id: true});
});

const q1 = select(e.Hero, {
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
  const result = select(e.default.Hero);
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
  const no_params = select(q1);
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
  const override_params = select(q1, {
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
  const query = select(
    e.Person,
    {
      id: true,
      name: true,
    },
    is(e.Hero, {secret_identity: true}),
    is(e.Villain, {
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
  const name = select(e.Hero).__element__.__name__;
  const f1: typeutil.assertEqual<typeof name, "default::Hero_shape"> = true;
});

test("limit inference", () => {
  const r1 = e.select(e.Hero, {name: true}).limit(e.int64(1));
  type c1 = typeof r1["__cardinality__"];
  const _f1: typeutil.assertEqual<c1, Cardinality.AtMostOne> = true;
  expect(r1.__cardinality__).toEqual(Cardinality.AtMostOne);

  const r2 = e.select(e.Hero, {name: true}).limit(e.int64(1));
  type c2 = typeof r2["__cardinality__"];
  const _f2: typeutil.assertEqual<c2, Cardinality.AtMostOne> = true;
  expect(r2.__cardinality__).toEqual(Cardinality.AtMostOne);

  const r3 = e.select(e.Hero, {name: true}).limit(e.int64(2));
  type c3 = typeof r3["__cardinality__"];
  const _f3: typeutil.assertEqual<c3, Cardinality.Many> = true;
  expect(r3.__cardinality__).toEqual(Cardinality.Many);
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
