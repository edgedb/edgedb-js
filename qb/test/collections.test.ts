import {Client, $} from "edgedb";
import e, {$infer} from "../dbschema/edgeql-js";

import type {$VersionStageλEnum} from "../dbschema/edgeql-js/modules/sys";
import {tc} from "./setupTeardown";

import {setupTests, teardownTests, TestData} from "./setupTeardown";

let client: Client;
let data: TestData;

beforeAll(async () => {
  const setup = await setupTests();
  ({client, data} = setup);
});

afterAll(async () => {
  await teardownTests(client);
});

test("array literal", async () => {
  const strArrayType = e.array(e.str);
  expect(strArrayType.__kind__).toEqual($.TypeKind.array);
  expect(strArrayType.__element__.__kind__).toEqual($.TypeKind.scalar);
  expect(strArrayType.__element__.__name__).toEqual("std::str");

  const arg = e.array(["asdf", e.str("qwer")]);
  type arg = $.setToTsType<typeof arg>;
  tc.assert<tc.IsExact<arg, string[]>>(true);
  expect(arg.__kind__).toEqual($.ExpressionKind.Array);
  expect(arg.__element__.__kind__).toEqual($.TypeKind.array);
  expect(arg.__cardinality__).toEqual($.Cardinality.One);
  expect(arg.__element__.__element__.__kind__).toEqual($.TypeKind.scalar);
  expect(arg.__element__.__element__.__name__).toEqual("std::str");
  const result = await client.querySingle(e.select(arg).toEdgeQL());
  expect(result).toEqual(["asdf", "qwer"]);

  const arg1 = arg[1];
  tc.assert<tc.IsExact<typeof arg1["__kind__"], $.ExpressionKind.Operator>>(
    true
  );
  expect(arg1.__kind__).toEqual($.ExpressionKind.Operator);
  tc.assert<tc.IsExact<typeof arg1["__cardinality__"], $.Cardinality.One>>(
    true
  );
  expect(arg1.__cardinality__).toEqual($.Cardinality.One);
  tc.assert<tc.IsExact<typeof arg1["__element__"]["__name__"], "std::str">>(
    true
  );
  expect(arg1.__element__.__name__).toEqual("std::str");
  expect(await e.select(arg1).run(client)).toEqual("qwer");

  const multiArray = e.array(["asdf", e.set(e.str("qwer"), e.str("erty"))]);

  type multiArray = $.setToTsType<typeof multiArray>;
  tc.assert<tc.IsExact<multiArray, [string[], ...string[][]]>>(true);
  expect(multiArray.__kind__).toEqual($.ExpressionKind.Array);
  expect(multiArray.__element__.__kind__).toEqual($.TypeKind.array);

  expect(multiArray.__cardinality__).toEqual($.Cardinality.AtLeastOne);
  expect(multiArray.__element__.__element__.__kind__).toEqual(
    $.TypeKind.scalar
  );
  expect(multiArray.__element__.__element__.__name__).toEqual("std::str");
  const multiArrayResult = await client.query(e.select(multiArray).toEdgeQL());
  expect(multiArrayResult).toEqual([
    ["asdf", "qwer"],
    ["asdf", "erty"],
  ]);

  const multi0 = multiArray[0];
  tc.assert<
    tc.IsExact<typeof multi0["__cardinality__"], $.Cardinality.AtLeastOne>
  >(true);
  expect(multi0.__cardinality__).toEqual($.Cardinality.AtLeastOne);
  expect(await e.select(multi0).run(client)).toEqual(["asdf", "asdf"]);

  // array slicing
  const arr = e.str_split(e.str("zxcvbnm"), e.str(""));
  const sliceResult = await e
    .select({
      reverseIndex: arr["-2"],
      slice24: arr["2:4"],
      slice2: arr["2:"],
      slice4: arr[":4"],
      reverseSlice2: arr["-2:"],
      reverseSlice4: arr[":-4"],
      reverseSlice24: arr["-4:-2"],
    })
    .run(client);
  tc.assert<
    tc.IsExact<
      typeof sliceResult,
      {
        reverseIndex: string;
        slice24: string[];
        slice2: string[];
        slice4: string[];
        reverseSlice2: string[];
        reverseSlice4: string[];
        reverseSlice24: string[];
      }
    >
  >(true);
  expect(JSON.stringify(sliceResult)).toEqual(
    JSON.stringify({
      reverseIndex: "n",
      slice24: ["c", "v"],
      slice2: ["c", "v", "b", "n", "m"],
      slice4: ["z", "x", "c", "v"],
      reverseSlice2: ["n", "m"],
      reverseSlice4: ["z", "x", "c"],
      reverseSlice24: ["v", "b"],
    })
  );

  // @ts-expect-error
  arr["str"];
  // @ts-expect-error
  arr[":"];
});

test("tuple literal", async () => {
  const tupleType = e.tuple([e.str, e.int64]);
  expect(tupleType.__kind__).toEqual($.TypeKind.tuple);
  expect(tupleType.__items__[0].__kind__).toEqual($.TypeKind.scalar);
  expect(tupleType.__items__[0].__name__).toEqual("std::str");
  expect(tupleType.__items__[1].__kind__).toEqual($.TypeKind.scalar);
  expect(tupleType.__items__[1].__name__).toEqual("std::int64");

  const myTuple = e.tuple(["asdf", 45]);
  type myTuple = $.setToTsType<typeof myTuple>;
  tc.assert<tc.IsExact<myTuple, [string, number]>>(true);
  expect(myTuple.__element__.__kind__).toEqual($.TypeKind.tuple);
  expect(myTuple.__element__.__items__[0].__kind__).toEqual($.TypeKind.scalar);
  expect(myTuple.__element__.__items__[0].__name__).toEqual("std::str");
  expect(myTuple.__element__.__items__[1].__kind__).toEqual($.TypeKind.scalar);
  expect(myTuple.__element__.__items__[1].__name__).toEqual("std::number");
  const myTupleResult = await client.querySingle(e.select(myTuple).toEdgeQL());
  expect(myTupleResult).toEqual(["asdf", 45]);
  const myTuplePath0 = myTuple[0];
  const myTuplePath1 = myTuple[1];
  tc.assert<tc.IsExact<$infer<typeof myTuplePath0>, string>>(true);
  tc.assert<tc.IsExact<$infer<typeof myTuplePath1>, number>>(true);
  expect(await e.select(myTuplePath0).run(client)).toEqual("asdf");
  expect(await e.select(myTuplePath1).run(client)).toEqual(45);

  const multiTuple = e.tuple(["asdf", e.set(e.str("qwer"), e.str("erty"))]);
  tc.assert<
    tc.IsExact<
      $infer<typeof multiTuple>,
      [[string, string], ...[string, string][]]
    >
  >(true);
  expect(multiTuple.__kind__).toEqual($.ExpressionKind.Tuple);
  expect(multiTuple.__element__.__kind__).toEqual($.TypeKind.tuple);
  expect(multiTuple.__cardinality__).toEqual($.Cardinality.AtLeastOne);
  expect(multiTuple.__element__.__items__[0].__kind__).toEqual(
    $.TypeKind.scalar
  );
  expect(multiTuple.__element__.__items__[0].__name__).toEqual("std::str");
  expect(multiTuple.__element__.__items__[1].__name__).toEqual("std::str");
  const multiTupleResult = await client.query(e.select(multiTuple).toEdgeQL());
  expect(multiTupleResult).toEqual([
    ["asdf", "qwer"],
    ["asdf", "erty"],
  ]);
  const multiTuplePath = multiTuple[0];
  tc.assert<tc.IsExact<$infer<typeof multiTuplePath>, [string, ...string[]]>>(
    true
  );
  tc.assert<
    tc.IsExact<
      typeof multiTuplePath["__cardinality__"],
      $.Cardinality.AtLeastOne
    >
  >(true);
  expect(multiTuplePath.__cardinality__).toEqual($.Cardinality.AtLeastOne);
  expect(await e.select(multiTuplePath).run(client)).toEqual(["asdf", "asdf"]);

  const singleTuple = e.tuple([e.str("asdf")]);
  type singleTuple = $infer<typeof singleTuple>;
  tc.assert<tc.IsExact<singleTuple, [string]>>(true);
  expect(singleTuple.__element__.__kind__).toEqual($.TypeKind.tuple);
  expect(singleTuple.__element__.__items__[0].__kind__).toEqual(
    $.TypeKind.scalar
  );
  expect(singleTuple.__element__.__items__[0].__name__).toEqual("std::str");
  const singleTupleResult = await client.querySingle(
    e.select(singleTuple).toEdgeQL()
  );
  expect(singleTupleResult).toEqual(["asdf"]);

  const nestedTuple = e.tuple([
    "a",
    e.tuple(["b", e.set(e.str("c"), e.str("d"))]),
  ]);
  type nestedTuple = $infer<typeof nestedTuple>;
  tc.assert<
    tc.IsExact<
      nestedTuple,
      [[string, [string, string]], ...[string, [string, string]][]]
    >
  >(true);
  const nestedTupleResult = await e.select(nestedTuple).run(client);
  expect(nestedTupleResult).toEqual([
    ["a", ["b", "c"]],
    ["a", ["b", "d"]],
  ]);
  const nestedTuplePathResult = await e
    .select({
      tup0: nestedTuple[0],
      tup1: nestedTuple[1],
      tup10: nestedTuple[1][0],
      tup11: nestedTuple[1][1],
    })
    .run(client);
  tc.assert<
    tc.IsExact<
      typeof nestedTuplePathResult,
      {
        tup0: [string, ...string[]];
        tup1: [[string, string], ...[string, string][]];
        tup10: [string, ...string[]];
        tup11: [string, ...string[]];
      }
    >
  >(true);
  expect(JSON.parse(JSON.stringify(nestedTuplePathResult))).toEqual({
    tup0: ["a", "a"],
    tup1: [
      ["b", "c"],
      ["b", "d"],
    ],
    tup10: ["b", "b"],
    tup11: ["c", "d"],
  });

  const heroNamesTuple = e.tuple([e.Hero.name]);
  type heroNamesTuple = $infer<typeof heroNamesTuple>;
  tc.assert<tc.IsExact<heroNamesTuple, [string][]>>(true);
  expect(heroNamesTuple.__element__.__kind__).toEqual($.TypeKind.tuple);
  expect(heroNamesTuple.__element__.__items__[0].__kind__).toEqual(
    $.TypeKind.scalar
  );
  expect(heroNamesTuple.__element__.__items__[0].__name__).toEqual("std::str");
  const heroNamesTupleResult = await e.select(heroNamesTuple).run(client);
  expect(
    heroNamesTupleResult.sort((a, b) => a[0].localeCompare(b[0]))
  ).toEqual(
    [[data.cap.name], [data.iron_man.name], [data.spidey.name]].sort((a, b) =>
      a[0].localeCompare(b[0])
    )
  );
});

test("namedTuple literal", async () => {
  const tupleType = e.tuple({
    string: e.str,
    number: e.int64,
  });
  expect(tupleType.__kind__).toEqual($.TypeKind.namedtuple);
  expect(tupleType.__shape__.string.__kind__).toEqual($.TypeKind.scalar);
  expect(tupleType.__shape__.string.__name__).toEqual("std::str");
  expect(tupleType.__shape__.number.__kind__).toEqual($.TypeKind.scalar);
  expect(tupleType.__shape__.number.__name__).toEqual("std::int64");

  const named = e.tuple({
    string: "asdf",
    number: 1234,
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
  expect(named.__element__.__shape__.number.__name__).toEqual("std::number");
  const namedResult = await client.querySingle(e.select(named).toEdgeQL());
  expect(JSON.stringify(namedResult)).toEqual(
    JSON.stringify({string: "asdf", number: 1234})
  );
  const namedStr = named.string;
  const namedNum = named.number;
  tc.assert<tc.IsExact<$infer<typeof namedStr>, string>>(true);
  tc.assert<tc.IsExact<$infer<typeof namedNum>, number>>(true);
  expect(await e.select(namedStr).run(client)).toEqual("asdf");
  expect(await e.select(namedNum).run(client)).toEqual(1234);

  const nested = e.tuple({
    a: "asdf",
    named: e.tuple({b: 123}),
    tuple: e.tuple([true, e.set(e.str("x"), e.str("y"))]),
  });
  const nestedResult = await e
    .select({
      nested: nested,
      nestedA: nested.a,
      nestedNamed: nested.named,
      nestedTuple: nested.tuple,
      nestedTuple0: nested.tuple[0],
      nestedTuple1: nested.tuple[1],
    })
    .run(client);
  tc.assert<
    tc.IsExact<
      typeof nestedResult,
      {
        nested: {a: string; named: {b: number}; tuple: [boolean, string]}[];
        nestedA: string[];
        nestedNamed: {b: number}[];
        nestedTuple: [boolean, string][];
        nestedTuple0: boolean[];
        nestedTuple1: string[];
      }
    >
  >(true);
  expect(JSON.stringify(nestedResult)).toEqual(
    JSON.stringify({
      nested: [
        {a: "asdf", named: {b: 123}, tuple: [true, "x"]},
        {a: "asdf", named: {b: 123}, tuple: [true, "y"]},
      ],
      nestedA: ["asdf", "asdf"],
      nestedNamed: [{b: 123}, {b: 123}],
      nestedTuple: [
        [true, "x"],
        [true, "y"],
      ],
      nestedTuple0: [true, true],
      nestedTuple1: ["x", "y"],
    })
  );

  const emptyNamedTuple = e.tuple({string: e.cast(e.str, e.set())});
  type emptyNamedTuple = $.setToTsType<typeof emptyNamedTuple>;
  tc.assert<tc.IsExact<emptyNamedTuple, null>>(true);
  expect(emptyNamedTuple.__cardinality__).toEqual($.Cardinality.Empty);

  const multiNamedTuple = e.tuple({
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

test("non literal tuples", async () => {
  const ver = e.sys.get_version();
  expect(ver.major.__element__.__name__).toEqual("std::int64");
  expect(ver.major.__cardinality__).toEqual($.Cardinality.One);
  expect(ver.stage.__element__.__name__).toEqual("sys::VersionStage");
  expect(ver.stage.__cardinality__).toEqual($.Cardinality.One);
  expect(ver.local.__element__.__name__).toEqual("array<std::str>");
  expect(ver.local.__cardinality__).toEqual($.Cardinality.One);

  const result = await e
    .select({
      ver,
      verMajor: ver.major,
      verStage: ver.stage,
      verLocal: ver.local,
      verLocal0: ver.local[0],
    })
    .run(client);

  tc.assert<
    tc.IsExact<
      typeof result,
      {
        ver: {
          major: number;
          minor: number;
          stage: `${$VersionStageλEnum}`;
          stage_no: number;
          local: string[];
        };
        verMajor: number;
        verStage: `${$VersionStageλEnum}`;
        verLocal: string[];
        verLocal0: string;
      }
    >
  >(true);

  expect({
    major: result.verMajor,
    stage: result.verStage,
    local: result.verLocal,
    local0: result.verLocal0,
  }).toEqual({
    major: result.ver.major,
    stage: result.ver.stage,
    local: result.ver.local,
    local0: result.ver.local[0],
  });
});
