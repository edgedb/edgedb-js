import assert from "node:assert/strict";
import superjson from "superjson";
import * as $ from "../../packages/generate/src/syntax/reflection";
import e from "./dbschema/edgeql-js";
import type { $expr_Function } from "../../packages/generate/src/syntax/funcops";
import { tc } from "./setupTeardown";
import { number } from "./dbschema/edgeql-js/modules/std";

function checkFunctionExpr<T extends $expr_Function>(
  expr: T,
  name: T["__name__"],
  args: T["__args__"],
  namedargs: T["__namedargs__"],
  returnType: T["__element__"],
  cardinality: T["__cardinality__"]
) {
  assert.deepEqual(expr.__name__, name);
  assert.deepEqual(
    superjson.stringify(expr.__args__),
    superjson.stringify(args.filter((arg) => arg !== undefined))
  );
  assert.deepEqual(
    superjson.stringify(expr.__namedargs__),
    superjson.stringify(namedargs)
  );
  assert.deepEqual(expr.__element__.__name__, returnType.__name__);
  assert.deepEqual(expr.__cardinality__, cardinality);
}

describe("functions", () => {
  test("no args", () => {
    checkFunctionExpr(
      e.sys.get_version_as_str(),
      "sys::get_version_as_str",
      [],
      {},
      e.str,
      $.Cardinality.One
    );

    checkFunctionExpr(
      e.sys.get_version(),
      "sys::get_version",
      [],
      {},
      e.tuple({
        major: e.int64,
        minor: e.int64,
        stage: e.sys.VersionStage,
        stage_no: e.int64,
        local: e.array(e.str),
      }),
      $.Cardinality.One
    );

    try {
      // @ts-expect-error
      e.sys.get_version_as_str(e.str("error"));
    } catch {}
  });

  test("positional args", () => {
    checkFunctionExpr(
      e.len(e.str("test")),
      "std::len",
      [e.str("test")],
      {},
      number,
      $.Cardinality.One
    );

    checkFunctionExpr(
      e.len(e.bytes(Buffer.from(""))),
      "std::len",
      [e.bytes(Buffer.from(""))],
      {},
      number,
      $.Cardinality.One
    );

    checkFunctionExpr(
      e.len(e.literal(e.array(e.int32), [1, 2, 3])),
      "std::len",
      [e.literal(e.array(e.int32), [1, 2, 3])],
      {},
      number,
      $.Cardinality.One
    );

    const setOfStr = e.set(e.str("test"), e.str("test2"));

    checkFunctionExpr(
      e.len(setOfStr),
      "std::len",
      [setOfStr],
      {},
      number,
      $.Cardinality.AtLeastOne
    );

    const datetime_getArgs = [e.datetime(new Date()), e.str("day")] as const;
    checkFunctionExpr(
      e.datetime_get(...datetime_getArgs),
      "std::datetime_get",
      datetime_getArgs as $.typeutil.writeable<typeof datetime_getArgs>,
      {},
      number,
      $.Cardinality.One
    );

    const datetime_getArgs2 = [
      e.datetime(new Date()),
      e.set(e.str("day"), e.str("month"), e.str("year")),
    ] as const;
    checkFunctionExpr(
      e.datetime_get(...datetime_getArgs2),
      "std::datetime_get",
      datetime_getArgs2 as $.typeutil.writeable<typeof datetime_getArgs2>,
      {},
      number,
      $.Cardinality.AtLeastOne
    );

    try {
      // @ts-expect-error
      e.len(e.int32("test"));

      // @ts-expect-error
      e.len(e.Hero);
    } catch {}
  });

  test("named args", () => {
    checkFunctionExpr(
      e.std.re_replace(e.str("pattern"), e.str("sub"), e.str("str")),
      "std::re_replace",
      [e.str("pattern"), e.str("sub"), e.str("str")],
      {},
      e.str,
      $.Cardinality.One
    );
    checkFunctionExpr(
      e.std.re_replace(
        { flags: e.str("flags") },
        e.str("pattern"),
        e.str("sub"),
        e.str("str")
      ),
      "std::re_replace",
      [e.str("pattern"), e.str("sub"), e.str("str")],
      { flags: e.str("flags") },
      e.str,
      $.Cardinality.One
    );
    checkFunctionExpr(
      e.std.re_replace({}, e.str("pattern"), e.str("sub"), e.str("str")),
      "std::re_replace",
      [e.str("pattern"), e.str("sub"), e.str("str")],
      {},
      e.str,
      $.Cardinality.One
    );
    checkFunctionExpr(
      e.std.re_replace(
        { flags: e.cast(e.str, e.set()) },
        e.str("pattern"),
        e.str("sub"),
        e.str("str")
      ),
      "std::re_replace",
      [e.str("pattern"), e.str("sub"), e.str("str")],
      { flags: e.cast(e.str, e.set()) },
      e.str,
      $.Cardinality.One
    );

    checkFunctionExpr(
      e.to_duration({}),
      "std::to_duration",
      [],
      {},
      e.duration,
      $.Cardinality.One
    );
    checkFunctionExpr(
      e.to_duration({ hours: e.int64(5) }),
      "std::to_duration",
      [],
      { hours: e.int64(5) },
      e.duration,
      $.Cardinality.One
    );
    checkFunctionExpr(
      e.to_duration({ hours: e.int64(5), seconds: e.int64(30) }),
      "std::to_duration",
      [],
      { hours: e.int64(5), seconds: e.int64(30) },
      e.duration,
      $.Cardinality.One
    );
    checkFunctionExpr(
      e.to_duration({ hours: e.set(e.int64(5), e.int64(6)) }),
      "std::to_duration",
      [],
      { hours: e.set(e.int64(5), e.int64(6)) },
      e.duration,
      $.Cardinality.AtLeastOne
    );
    checkFunctionExpr(
      e.to_duration({ hours: e.int64(5) }),
      "std::to_duration",
      [],
      { hours: e.int64(5) },
      e.duration,
      $.Cardinality.One
    );

    checkFunctionExpr(
      e["💯"]({ "🙀": e.int64(1) }),
      "default::💯",
      [],
      { "🙀": e.int64(1) },
      number,
      $.Cardinality.One
    );

    try {
      e.std.re_replace(
        // @ts-expect-error
        { wrongKey: e.str("") },
        e.str("pattern"),
        e.str("sub"),
        e.str("str")
      );

      e.std.re_replace(
        // @ts-expect-error
        { flags: e.int32(1) },
        e.str("pattern"),
        e.str("sub"),
        e.str("str")
      );

      // @ts-expect-error
      e["💯"]();
      // @ts-expect-error
      e["💯"]({});
    } catch {}
  });

  test("variadic args", () => {
    checkFunctionExpr(
      e.json_get(e.json("json"), e.str("path")),
      "std::json_get",
      [e.json("json"), e.str("path")],
      {},
      e.json,
      $.Cardinality.AtMostOne
    );
    checkFunctionExpr(
      e.json_get(e.json("json"), e.str("some"), e.str("path")),
      "std::json_get",
      [e.json("json"), e.str("some"), e.str("path")],
      {},
      e.json,
      $.Cardinality.AtMostOne
    );
    checkFunctionExpr(
      e.json_get(
        e.json("json"),
        e.str("some"),
        e.set(e.str("path"), e.str("extended"))
      ),
      "std::json_get",
      [e.json("json"), e.str("some"), e.set(e.str("path"), e.str("extended"))],
      {},
      e.json,
      $.Cardinality.Many
    );
    checkFunctionExpr(
      e.json_get(
        {},
        e.json("json"),
        e.str("some"),
        e.set(e.str("path"), e.str("extended"))
      ),
      "std::json_get",
      [e.json("json"), e.str("some"), e.set(e.str("path"), e.str("extended"))],
      {},
      e.json,
      $.Cardinality.Many
    );
    checkFunctionExpr(
      e.json_get(
        { default: e.json("defaultjson") },
        e.json("json"),
        e.str("some"),
        e.str("path")
      ),
      "std::json_get",
      [e.json("json"), e.str("some"), e.str("path")],
      { default: e.json("defaultjson") },
      e.json,
      $.Cardinality.AtMostOne
    );
  });

  test("anytype", () => {
    checkFunctionExpr(
      e.min(e.json("json")),
      "std::min",
      [e.json("json")],
      {},
      e.json,
      $.Cardinality.One
    );
    checkFunctionExpr(
      e.min(e.set(e.int64(1), e.int64(2))),
      "std::min",
      [e.set(e.int64(1), e.int64(2))],
      {},
      number,
      $.Cardinality.One
    );

    checkFunctionExpr(
      e.array_agg(e.str("str")),
      "std::array_agg",
      [e.str("str")],
      {},
      e.array(e.str),
      $.Cardinality.One
    );

    checkFunctionExpr(
      e.array_unpack(e.literal(e.array(e.str), ["str"])),
      "std::array_unpack",
      [e.literal(e.array(e.str), ["str"])],
      {},
      e.str,
      $.Cardinality.Many
    );

    checkFunctionExpr(
      e.contains(
        e.literal(e.array(e.str), ["test", "haystack"]),
        e.set(e.str("needle"), e.str("haystack"))
      ),
      "std::contains",
      [
        e.literal(e.array(e.str), ["test", "haystack"]),
        e.set(e.str("needle"), e.str("haystack")),
      ],
      {},
      e.bool,
      $.Cardinality.AtLeastOne
    );

    checkFunctionExpr(
      e.contains(
        e.literal(e.array(e.int16), [1, 2, 3]),
        e.cast(e.int64, e.bigint(BigInt(2)))
      ),
      "std::contains",
      [
        e.literal(e.array(e.int16), [1, 2, 3]),
        e.cast(e.int64, e.bigint(BigInt(2))),
      ],
      {},
      e.bool,
      $.Cardinality.One
    );

    checkFunctionExpr(
      e.contains(e.literal(e.array(e.float32), [1, 2, 3]), e.int64(2)),
      "std::contains",
      [e.literal(e.array(e.float32), [1, 2, 3]), e.int64(2)],
      {},
      e.bool,
      $.Cardinality.One
    );

    checkFunctionExpr(
      e.array_get(
        { default: e.bigint(BigInt(0)) },
        e.literal(e.array(e.bigint), [BigInt(1), BigInt(2), BigInt(3)]),
        e.int64(4)
      ),
      "std::array_get",
      [
        e.literal(e.array(e.bigint), [BigInt(1), BigInt(2), BigInt(3)]),
        e.int64(4),
      ],
      { default: e.bigint(BigInt(0)) },
      e.bigint,
      $.Cardinality.AtMostOne
    );

    try {
      // @ts-expect-error
      e.contains(e.literal(e.array(e.str), ["test", "haystack"]), e.int64(1));

      e.array_get(
        // @ts-expect-error
        { default: e.str("0") },
        e.literal(e.array(e.bigint), [BigInt(1), BigInt(2), BigInt(3)]),
        e.int64(4)
      );

      // @ts-expect-error
      e.min(e.set(e.int64(1), e.str("str")));

      // @ts-expect-error
      e.contains(e.literal(e.array(e.float32), [1, 2, 3]), e.bigint(BigInt(2)));
    } catch {}
  });

  test("cardinality inference", () => {
    // optional param
    checkFunctionExpr(
      e.to_str(e.int64(123), e.str("")),
      "std::to_str",
      [e.int64(123), e.str("")],
      {},
      e.str,
      $.Cardinality.One
    );
    checkFunctionExpr(
      e.to_str(e.int64(123), e.cast(e.str, e.set())),
      "std::to_str",
      [e.int64(123), e.cast(e.str, e.set())],
      {},
      e.str,
      $.Cardinality.One
    );
    checkFunctionExpr(
      e.to_str(e.int64(123), undefined),
      "std::to_str",
      [e.int64(123), e.cast(e.str, e.set()) as any],
      {},
      e.str,
      $.Cardinality.One
    );
    checkFunctionExpr(
      e.to_str(e.set(e.int64(123), e.int64(456)), undefined),
      "std::to_str",
      [e.set(e.int64(123), e.int64(456)), e.cast(e.str, e.set()) as any],
      {},
      e.str,
      $.Cardinality.AtLeastOne
    );
    checkFunctionExpr(
      e.to_str(e.int64(123)),
      "std::to_str",
      [e.int64(123), undefined as any],
      {},
      e.str,
      $.Cardinality.One
    );

    // setoftype param
    checkFunctionExpr(
      e.sum(e.int64(1)),
      "std::sum",
      [e.int64(1)],
      {},
      number,
      $.Cardinality.One
    );
    checkFunctionExpr(
      e.sum(e.set(e.int64(1), e.int64(2))),
      "std::sum",
      [e.set(e.int64(1), e.int64(2))],
      {},
      number,
      $.Cardinality.One
    );
    checkFunctionExpr(
      e.sum(e.cast(e.int64, e.set())),
      "std::sum",
      [e.cast(e.int64, e.set())],
      {},
      number,
      $.Cardinality.One
    );

    // optional return
    checkFunctionExpr(
      e.array_get(
        e.literal(e.array(e.bigint), [BigInt(1), BigInt(2), BigInt(3)]),
        e.int64(1)
      ),
      "std::array_get",
      [
        e.literal(e.array(e.bigint), [BigInt(1), BigInt(2), BigInt(3)]),
        e.int64(1),
      ],
      {},
      e.bigint,
      $.Cardinality.AtMostOne
    );
    checkFunctionExpr(
      e.array_get(e.cast(e.array(e.bigint), e.set()), e.int64(1)),
      "std::array_get",
      [e.cast(e.array(e.bigint), e.set()), e.int64(1)],
      {},
      e.bigint,
      $.Cardinality.Empty
    );
    // BROKEN
    // checkFunctionExpr(
    //   e.array_get(
    //     e.set(
    //       e.literal(e.array(e.$bigint), [BigInt(1), BigInt(2), BigInt(3)]),
    //       e.literal(e.array(e.$bigint), [BigInt(4)])
    //     ),
    //     e.int64(1)
    //   ),
    //   "std::array_get",
    //   [
    //     e.set(
    //       e.literal(e.array(e.$bigint), [BigInt(1), BigInt(2), BigInt(3)]),
    //       e.literal(e.array(e.$bigint), [BigInt(4)])
    //     ),
    //     e.int64(1),
    //   ],
    //   {},
    //   e.$bigint,
    //   $.Cardinality.Many
    // );

    // setoftype return
    checkFunctionExpr(
      e.array_unpack(e.literal(e.array(e.str), ["str"])),
      "std::array_unpack",
      [e.literal(e.array(e.str), ["str"])],
      {},
      e.str,
      $.Cardinality.Many
    );
    checkFunctionExpr(
      e.array_unpack(e.cast(e.array(e.str), e.set())),
      "std::array_unpack",
      [e.cast(e.array(e.str), e.set())],
      {},
      e.str,
      $.Cardinality.Many
    );
    checkFunctionExpr(
      e.array_unpack(e.literal(e.array(e.str), ["str"])),
      "std::array_unpack",
      [e.literal(e.array(e.str), ["str"])],
      {},
      e.str,
      $.Cardinality.Many
    );
  });

  test("assert_*", () => {
    const emptySet = e.cast(e.str, e.set());
    const oneSet = e.set("str");
    const atLeastOneSet = e.set("str", "str2");
    const atMostOneSet = {
      ...oneSet,
      __cardinality__: $.Cardinality.AtMostOne,
    } as unknown as $.TypeSet<typeof e.str, $.Cardinality.AtMostOne>;
    const manySet = {
      ...atLeastOneSet,
      __cardinality__: $.Cardinality.Many,
    } as unknown as $.TypeSet<typeof e.str, $.Cardinality.Many>;

    assert.deepEqual(emptySet.__cardinality__, $.Cardinality.Empty);
    assert.deepEqual(oneSet.__cardinality__, $.Cardinality.One);
    assert.deepEqual(atLeastOneSet.__cardinality__, $.Cardinality.AtLeastOne);
    assert.deepEqual(atMostOneSet.__cardinality__, $.Cardinality.AtMostOne);
    assert.deepEqual(manySet.__cardinality__, $.Cardinality.Many);
    tc.assert<
      tc.IsExact<(typeof emptySet)["__cardinality__"], $.Cardinality.Empty>
    >(true);
    tc.assert<
      tc.IsExact<(typeof oneSet)["__cardinality__"], $.Cardinality.One>
    >(true);
    tc.assert<
      tc.IsExact<
        (typeof atLeastOneSet)["__cardinality__"],
        $.Cardinality.AtLeastOne
      >
    >(true);
    tc.assert<
      tc.IsExact<
        (typeof atMostOneSet)["__cardinality__"],
        $.Cardinality.AtMostOne
      >
    >(true);
    tc.assert<
      tc.IsExact<(typeof manySet)["__cardinality__"], $.Cardinality.Many>
    >(true);

    // assert_single
    const emptySingle = e.assert_single(emptySet);
    assert.deepEqual(emptySingle.__cardinality__, $.Cardinality.AtMostOne);
    tc.assert<
      tc.IsExact<
        (typeof emptySingle)["__cardinality__"],
        $.Cardinality.AtMostOne
      >
    >(true);
    const oneSingle = e.assert_single(oneSet);
    assert.deepEqual(oneSingle.__cardinality__, $.Cardinality.One);
    tc.assert<
      tc.IsExact<(typeof oneSingle)["__cardinality__"], $.Cardinality.One>
    >(true);
    const atLeastOneSingle = e.assert_single(atLeastOneSet);
    assert.deepEqual(atLeastOneSingle.__cardinality__, $.Cardinality.One);
    tc.assert<
      tc.IsExact<
        (typeof atLeastOneSingle)["__cardinality__"],
        $.Cardinality.One
      >
    >(true);
    const atMostOneSingle = e.assert_single(atMostOneSet);
    assert.deepEqual(atMostOneSingle.__cardinality__, $.Cardinality.AtMostOne);
    tc.assert<
      tc.IsExact<
        (typeof atMostOneSingle)["__cardinality__"],
        $.Cardinality.AtMostOne
      >
    >(true);
    const manySingle = e.assert_single(manySet);
    assert.deepEqual(manySingle.__cardinality__, $.Cardinality.AtMostOne);
    tc.assert<
      tc.IsExact<
        (typeof manySingle)["__cardinality__"],
        $.Cardinality.AtMostOne
      >
    >(true);

    // assert_exists
    const emptyExists = e.assert_exists(emptySet);
    assert.deepEqual(emptyExists.__cardinality__, $.Cardinality.One);
    tc.assert<
      tc.IsExact<(typeof emptyExists)["__cardinality__"], $.Cardinality.One>
    >(true);
    const oneExists = e.assert_exists(oneSet);
    assert.deepEqual(oneExists.__cardinality__, $.Cardinality.One);
    tc.assert<
      tc.IsExact<(typeof oneExists)["__cardinality__"], $.Cardinality.One>
    >(true);
    const atLeastOneExists = e.assert_exists(atLeastOneSet);
    assert.deepEqual(
      atLeastOneExists.__cardinality__,
      $.Cardinality.AtLeastOne
    );
    tc.assert<
      tc.IsExact<
        (typeof atLeastOneExists)["__cardinality__"],
        $.Cardinality.AtLeastOne
      >
    >(true);
    const atMostOneExists = e.assert_exists(atMostOneSet);
    assert.deepEqual(atMostOneExists.__cardinality__, $.Cardinality.One);
    tc.assert<
      tc.IsExact<(typeof atMostOneExists)["__cardinality__"], $.Cardinality.One>
    >(true);
    const manyExists = e.assert_exists(manySet);
    assert.deepEqual(manyExists.__cardinality__, $.Cardinality.AtLeastOne);
    tc.assert<
      tc.IsExact<
        (typeof manyExists)["__cardinality__"],
        $.Cardinality.AtLeastOne
      >
    >(true);
  });

  test("persist Cardinality.One", async () => {
    const query = e.str_trim(e.str("test string"));
    assert.deepEqual(query.__cardinality__, $.Cardinality.One);
    tc.assert<tc.IsExact<(typeof query)["__cardinality__"], $.Cardinality.One>>(
      true
    );
  });
});
