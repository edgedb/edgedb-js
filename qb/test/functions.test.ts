import type {$expr_Function} from "@syntax/funcops";
import {Cardinality, TypeSet, typeutil} from "../../src/reflection";
import e from "../generated/example";

function checkFunctionExpr<T extends $expr_Function>(
  expr: T,
  name: T["__name__"],
  args: T["__args__"],
  namedargs: T["__namedargs__"],
  returnType: T["__element__"],
  cardinality: T["__cardinality__"]
) {
  expect(expr.__name__).toEqual(name);
  expect(expr.__args__).toEqual(args.filter((arg) => arg !== undefined));
  expect(expr.__namedargs__).toEqual(namedargs);
  expect(expr.__element__).toEqual(returnType);
  expect(expr.__cardinality__).toEqual(cardinality);
}

test("no args", () => {
  checkFunctionExpr(
    e.sys.get_version_as_str(),
    "sys::get_version_as_str",
    [],
    {},
    e.str,
    Cardinality.One
  );

  checkFunctionExpr(
    e.sys.get_version(),
    "sys::get_version",
    [],
    {},
    e.namedTuple({
      major: e.int64,
      minor: e.int64,
      stage: e.sys.VersionStage,
      stage_no: e.int64,
      local: e.array(e.str),
    }),
    Cardinality.One
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
    e.int64,
    Cardinality.One
  );

  checkFunctionExpr(
    e.len(e.bytes("")),
    "std::len",
    [e.bytes("")],
    {},
    e.int64,
    Cardinality.One
  );

  checkFunctionExpr(
    e.len(e.literal(e.array(e.int32), [1, 2, 3])),
    "std::len",
    [e.literal(e.array(e.int32), [1, 2, 3])],
    {},
    e.int64,
    Cardinality.One
  );

  const setOfStr = e.set(e.str("test"), e.str("test2"));
  checkFunctionExpr(
    e.len(setOfStr),
    "std::len",
    [setOfStr],
    {},
    e.int64,
    Cardinality.AtLeastOne
  );

  const datetime_getArgs = [e.datetime(new Date()), e.str("day")] as const;
  checkFunctionExpr(
    e.datetime_get(...datetime_getArgs),
    "std::datetime_get",
    datetime_getArgs as typeutil.writeable<typeof datetime_getArgs>,
    {},
    e.float64,
    Cardinality.One
  );

  const datetime_getArgs2 = [
    e.datetime(new Date()),
    e.set(e.str("day"), e.str("month"), e.str("year")),
  ] as const;
  checkFunctionExpr(
    e.datetime_get(...datetime_getArgs2),
    "std::datetime_get",
    datetime_getArgs2 as typeutil.writeable<typeof datetime_getArgs2>,
    {},
    e.float64,
    Cardinality.AtLeastOne
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
    Cardinality.One
  );
  checkFunctionExpr(
    e.std.re_replace(
      {flags: e.str("flags")},
      e.str("pattern"),
      e.str("sub"),
      e.str("str")
    ),
    "std::re_replace",
    [e.str("pattern"), e.str("sub"), e.str("str")],
    {flags: e.str("flags")},
    e.str,
    Cardinality.One
  );
  checkFunctionExpr(
    e.std.re_replace({}, e.str("pattern"), e.str("sub"), e.str("str")),
    "std::re_replace",
    [e.str("pattern"), e.str("sub"), e.str("str")],
    {},
    e.str,
    Cardinality.One
  );
  checkFunctionExpr(
    e.std.re_replace(
      {flags: e.set(e.str)},
      e.str("pattern"),
      e.str("sub"),
      e.str("str")
    ),
    "std::re_replace",
    [e.str("pattern"), e.str("sub"), e.str("str")],
    {flags: e.set(e.str)},
    e.str,
    Cardinality.One
  );

  checkFunctionExpr(
    e.to_duration({}),
    "std::to_duration",
    [],
    {},
    e.duration,
    Cardinality.One
  );
  checkFunctionExpr(
    e.to_duration({hours: e.int64(5)}),
    "std::to_duration",
    [],
    {hours: e.int64(5)},
    e.duration,
    Cardinality.One
  );
  checkFunctionExpr(
    e.to_duration({hours: e.int64(5), seconds: e.float64(30)}),
    "std::to_duration",
    [],
    {hours: e.int64(5), seconds: e.float64(30)},
    e.duration,
    Cardinality.One
  );
  checkFunctionExpr(
    e.to_duration({hours: e.set(e.int64(5), e.int16(6))}),
    "std::to_duration",
    [],
    {hours: e.set(e.int64(5), e.int16(6))},
    e.duration,
    Cardinality.AtLeastOne
  );
  checkFunctionExpr(
    e.to_duration({hours: e.int16(5)}),
    "std::to_duration",
    [],
    {hours: e.int16(5)},
    e.duration,
    Cardinality.One
  );

  checkFunctionExpr(
    e["💯"]({"🙀": e.int64(1)}),
    "default::💯",
    [],
    {"🙀": e.int64(1)},
    e.int64,
    Cardinality.One
  );

  try {
    e.std.re_replace(
      // @ts-expect-error
      {wrongKey: e.str("")},
      e.str("pattern"),
      e.str("sub"),
      e.str("str")
    );

    e.std.re_replace(
      // @ts-expect-error
      {flags: e.int32(1)},
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
    Cardinality.AtMostOne
  );
  checkFunctionExpr(
    e.json_get(e.json("json"), e.str("some"), e.str("path")),
    "std::json_get",
    [e.json("json"), e.str("some"), e.str("path")],
    {},
    e.json,
    Cardinality.AtMostOne
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
    Cardinality.Many
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
    Cardinality.Many
  );
  checkFunctionExpr(
    e.json_get(
      {default: e.json("defaultjson")},
      e.json("json"),
      e.str("some"),
      e.str("path")
    ),
    "std::json_get",
    [e.json("json"), e.str("some"), e.str("path")],
    {default: e.json("defaultjson")},
    e.json,
    Cardinality.AtMostOne
  );
});

test("anytype", () => {
  checkFunctionExpr(
    e.min(e.json("json" as string)),
    "std::min",
    [e.json("json" as string)],
    {},
    e.json,
    Cardinality.AtMostOne
  );
  checkFunctionExpr(
    e.min(e.set(e.int64(1), e.int64(2))),
    "std::min",
    [e.set(e.int64(1), e.int64(2))],
    {},
    e.int64,
    Cardinality.AtMostOne
  );

  // BROKEN
  // e.min(e.set(e.int64(1), e.str('str')))

  checkFunctionExpr(
    e.array_agg(e.str("str" as string)),
    "std::array_agg",
    [e.str("str" as string)],
    {},
    e.array(e.str),
    Cardinality.One
  );

  checkFunctionExpr(
    e.array_unpack(e.literal(e.array(e.str), ["str"])),
    "std::array_unpack",
    [e.literal(e.array(e.str), ["str"])],
    {},
    e.str,
    Cardinality.Many
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
    Cardinality.AtLeastOne
  );

  checkFunctionExpr(
    e.contains(e.literal(e.array(e.int16), [1, 2, 3]), e.bigint(BigInt(2))),
    "std::contains",
    [e.literal(e.array(e.int16), [1, 2, 3]), e.bigint(BigInt(2))],
    {},
    e.bool,
    Cardinality.One
  );

  checkFunctionExpr(
    e.contains(e.literal(e.array(e.float32), [1, 2, 3]), e.int64(2)),
    "std::contains",
    [e.literal(e.array(e.float32), [1, 2, 3]), e.int64(2)],
    {},
    e.bool,
    Cardinality.One
  );

  checkFunctionExpr(
    e.array_get(
      {default: e.bigint(BigInt(0))},
      e.literal(e.array(e.bigint), [BigInt(1), BigInt(2), BigInt(3)]),
      e.int64(4)
    ),
    "std::array_get",
    [
      e.literal(e.array(e.bigint), [BigInt(1), BigInt(2), BigInt(3)]),
      e.int64(4),
    ],
    {default: e.bigint(BigInt(0))},
    e.bigint,
    Cardinality.AtMostOne
  );

  try {
    // @ts-expect-error
    e.contains(e.literal(e.array(e.str), ["test", "haystack"]), e.int64(1));

    e.array_get(
      // @ts-expect-error
      {default: e.str("0")},
      e.literal(e.array(e.bigint), [BigInt(1), BigInt(2), BigInt(3)]),
      e.int64(4)
    );

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
    Cardinality.One
  );
  checkFunctionExpr(
    e.to_str(e.int64(123), e.set(e.str)),
    "std::to_str",
    [e.int64(123), e.set(e.str)],
    {},
    e.str,
    Cardinality.One
  );
  checkFunctionExpr(
    e.to_str(e.int64(123), undefined),
    "std::to_str",
    [e.int64(123), e.set(e.str) as undefined],
    {},
    e.str,
    Cardinality.One
  );
  checkFunctionExpr(
    e.to_str(e.set(e.int64(123), e.int64(456)), undefined),
    "std::to_str",
    [e.set(e.int64(123), e.int64(456)), e.set(e.str) as undefined],
    {},
    e.str,
    Cardinality.AtLeastOne
  );
  checkFunctionExpr(
    e.to_str(e.int64(123)),
    "std::to_str",
    [e.int64(123), undefined],
    {},
    e.str,
    Cardinality.One
  );

  // setoftype param
  checkFunctionExpr(
    e.sum(e.int64(1)),
    "std::sum",
    [e.int64(1)],
    {},
    e.int64,
    Cardinality.One
  );
  checkFunctionExpr(
    e.sum(e.set(e.int64(1), e.int64(2))),
    "std::sum",
    [e.set(e.int64(1), e.int64(2))],
    {},
    e.int64,
    Cardinality.One
  );
  checkFunctionExpr(
    e.sum(e.set(e.int64)),
    "std::sum",
    [e.set(e.int64)],
    {},
    e.int64,
    Cardinality.One
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
    Cardinality.AtMostOne
  );
  checkFunctionExpr(
    e.array_get(e.set(e.array(e.bigint)), e.int64(1)),
    "std::array_get",
    [e.set(e.array(e.bigint)), e.int64(1)],
    {},
    e.bigint,
    Cardinality.Empty
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
  //   Cardinality.Many
  // );

  // setoftype return
  checkFunctionExpr(
    e.array_unpack(e.literal(e.array(e.str), ["str"])),
    "std::array_unpack",
    [e.literal(e.array(e.str), ["str"])],
    {},
    e.str,
    Cardinality.Many
  );
  checkFunctionExpr(
    e.array_unpack(e.set(e.array(e.str))),
    "std::array_unpack",
    [e.set(e.array(e.str))],
    {},
    e.str,
    Cardinality.Many
  );
  checkFunctionExpr(
    e.array_unpack(e.literal(e.array(e.str), ["str"])),
    "std::array_unpack",
    [e.literal(e.array(e.str), ["str"])],
    {},
    e.str,
    Cardinality.Many
  );
});
