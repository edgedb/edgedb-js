import {Pool, reflection as $} from "edgedb";
import e from "../generated/example";
import {tc} from "./setupTeardown";

import {setupTests, teardownTests, TestData} from "./setupTeardown";

let pool: Pool;
let data: TestData;

beforeAll(async () => {
  const setup = await setupTests();
  pool = setup.pool;
  data = setup.data;
});

afterAll(async () => {
  await teardownTests(pool);
});

test("array literal", async () => {
  const strArrayType = e.array(e.str);
  expect(strArrayType.__kind__).toEqual($.TypeKind.array);
  expect(strArrayType.__element__.__kind__).toEqual($.TypeKind.scalar);
  expect(strArrayType.__element__.__name__).toEqual("std::str");

  const arg = e.array([e.str("asdf" as string), e.str("qwer" as string)]);
  type arg = $.setToTsType<typeof arg>;
  tc.assert<tc.IsExact<arg, string[]>>(true);
  expect(arg.__kind__).toEqual($.ExpressionKind.Array);
  expect(arg.__element__.__kind__).toEqual($.TypeKind.array);
  expect(arg.__cardinality__).toEqual($.Cardinality.One);
  expect(arg.__element__.__element__.__kind__).toEqual($.TypeKind.scalar);
  expect(arg.__element__.__element__.__name__).toEqual("std::str");

  const result = await pool.queryOne(e.select(arg).toEdgeQL());
  expect(result).toEqual(["asdf", "qwer"]);

  const multiArray = e.array([
    e.str("asdf" as string),
    e.set(e.str("qwer" as string), e.str("erty")),
  ]);

  type multiArray = $.setToTsType<typeof multiArray>;
  tc.assert<tc.IsExact<multiArray, [string[], ...string[][]]>>(true);
  expect(multiArray.__kind__).toEqual($.ExpressionKind.Array);
  expect(multiArray.__element__.__kind__).toEqual($.TypeKind.array);

  expect(multiArray.__cardinality__).toEqual($.Cardinality.AtLeastOne);
  expect(multiArray.__element__.__element__.__kind__).toEqual(
    $.TypeKind.scalar
  );
  expect(multiArray.__element__.__element__.__name__).toEqual("std::str");
  const multiArrayResult = await pool.query(e.select(multiArray).toEdgeQL());
  expect(multiArrayResult).toEqual([
    ["asdf", "qwer"],
    ["asdf", "erty"],
  ]);
});

test("tuple literal", async () => {
  const tupleType = e.tuple([e.str, e.int64]);
  expect(tupleType.__kind__).toEqual($.TypeKind.tuple);
  expect(tupleType.__items__[0].__kind__).toEqual($.TypeKind.scalar);
  expect(tupleType.__items__[0].__name__).toEqual("std::str");
  expect(tupleType.__items__[1].__kind__).toEqual($.TypeKind.scalar);
  expect(tupleType.__items__[1].__name__).toEqual("std::int64");

  const myTuple = e.tuple([e.str("asdf" as string), e.int64(45 as number)]);
  type myTuple = $.setToTsType<typeof myTuple>;
  tc.assert<tc.IsExact<myTuple, [string, number]>>(true);
  expect(myTuple.__element__.__kind__).toEqual($.TypeKind.tuple);
  expect(myTuple.__element__.__items__[0].__kind__).toEqual($.TypeKind.scalar);
  expect(myTuple.__element__.__items__[0].__name__).toEqual("std::str");
  expect(myTuple.__element__.__items__[1].__kind__).toEqual($.TypeKind.scalar);
  expect(myTuple.__element__.__items__[1].__name__).toEqual("std::int64");
  const myTupleResult = await pool.queryOne(e.select(myTuple).toEdgeQL());
  expect(myTupleResult).toEqual(["asdf", 45]);

  const multiTuple = e.tuple([
    e.str("asdf" as string),
    e.set(e.str("qwer" as string), e.str("erty")),
  ]);
  type multiTuple = $.setToTsType<typeof multiTuple>;
  tc.assert<tc.IsExact<multiTuple, [[string, string], ...[string, string][]]>>(
    true
  );
  expect(multiTuple.__kind__).toEqual($.ExpressionKind.Tuple);
  expect(multiTuple.__element__.__kind__).toEqual($.TypeKind.tuple);
  expect(multiTuple.__cardinality__).toEqual($.Cardinality.AtLeastOne);
  expect(multiTuple.__element__.__items__[0].__kind__).toEqual(
    $.TypeKind.scalar
  );
  expect(multiTuple.__element__.__items__[0].__name__).toEqual("std::str");
  expect(multiTuple.__element__.__items__[1].__name__).toEqual("std::str");
  const multiTupleResult = await pool.query(e.select(multiTuple).toEdgeQL());
  expect(multiTupleResult).toEqual([
    ["asdf", "qwer"],
    ["asdf", "erty"],
  ]);
});

test("namedTuple literal", async () => {
  const tupleType = e.namedTuple({
    string: e.str,
    number: e.int64,
  });
  expect(tupleType.__kind__).toEqual($.TypeKind.namedtuple);
  expect(tupleType.__shape__.string.__kind__).toEqual($.TypeKind.scalar);
  expect(tupleType.__shape__.string.__name__).toEqual("std::str");
  expect(tupleType.__shape__.number.__kind__).toEqual($.TypeKind.scalar);
  expect(tupleType.__shape__.number.__name__).toEqual("std::int64");

  const named = e.namedTuple({
    string: e.str("asdf" as string),
    number: e.int64(1234 as number),
  });

  type named = $.setToTsType<typeof named>;
  tc.assert<tc.IsExact<named, {string: string; number: number}>>(true);
  expect(named.__kind__).toEqual($.ExpressionKind.NamedTuple);
  expect(named.__element__.__kind__).toEqual($.TypeKind.namedtuple);
  expect(named.__cardinality__).toEqual($.Cardinality.One);
  expect(named.__shape__.string.__kind__).toEqual($.ExpressionKind.Literal);
  expect(named.__shape__.string.__value__).toEqual("asdf");
  expect(named.__shape__.number.__kind__).toEqual($.ExpressionKind.Literal);
  expect(named.__shape__.number.__value__).toEqual(1234);
  expect(named.__element__.__shape__.string.__kind__).toEqual(
    $.TypeKind.scalar
  );
  expect(named.__element__.__shape__.string.__name__).toEqual("std::str");
  expect(named.__element__.__shape__.number.__kind__).toEqual(
    $.TypeKind.scalar
  );
  expect(named.__element__.__shape__.number.__name__).toEqual("std::int64");
  const namedResult = await pool.queryOne(e.select(named).toEdgeQL());
  expect(JSON.stringify(namedResult)).toEqual(
    JSON.stringify({string: "asdf", number: 1234})
  );

  const emptyNamedTuple = e.namedTuple({string: e.set(e.str)});
  type emptyNamedTuple = $.setToTsType<typeof emptyNamedTuple>;
  tc.assert<tc.IsExact<emptyNamedTuple, null>>(true);
  expect(emptyNamedTuple.__cardinality__).toEqual($.Cardinality.Empty);

  const multiNamedTuple = e.namedTuple({
    hero: e.Hero,
  });
  type multiNamedTuple = $.setToTsType<typeof multiNamedTuple>;
  tc.assert<
    tc.IsExact<
      multiNamedTuple,
      {
        hero: {
          id: string;
        };
      }[]
    >
  >(true);
  expect(multiNamedTuple.__cardinality__).toEqual($.Cardinality.Many);
});
