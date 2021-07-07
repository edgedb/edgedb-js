import * as edgedb from "edgedb";
import {typeutil} from "../../src/reflection";
import * as e from "../generated/example";

test("primitive types", () => {
  expect(e.$Int16.__name__).toEqual("std::int16");
  // expect(e.std.).toEqual("std::int64");
});

test("collection types", () => {
  const arrayType = e.$Array(e.$Str);
  expect(arrayType.__name__).toEqual("array<std::str>");
  const named = e.$NamedTuple({str: e.$Str});
  expect(named.__name__).toEqual("tuple<str: std::str>");
  expect(named.__shape__.str.__name__).toEqual("std::str");
  const unnamed = e.$UnnamedTuple([e.$Str, e.$Int64]);
  expect(unnamed.__name__).toEqual("tuple<std::str, std::int64>");
  expect(unnamed.__items__[0].__name__).toEqual("std::str");
  expect(unnamed.__items__[1].__name__).toEqual("std::int64");
});

test("scalar type merging", () => {
  type _t1 = e.getSharedParentPrimitiveVariadic<[e.std.$Str, e.std.$Str]>;
  const _f1: typeutil.assertEqual<_t1, e.std.$Str> = true;
  type _t2 = e.getSharedParentPrimitiveVariadic<[e.std.$Str, e.std.$Int32]>;
  const _f2: typeutil.assertEqual<_t2, never> = true;
  type _t3 = e.getSharedParentPrimitiveVariadic<[e.std.$Int16, e.std.$Int32]>;
  const _f3: typeutil.assertEqual<_t3, e.$Int32> = true;
  type _t4 = e.getSharedParentPrimitiveVariadic<
    [e.std.$Int64, e.std.$Float32]
  >;
  const _f4: typeutil.assertEqual<_t4, e.$Float64> = true;
  type _t5 = e.getSharedParentPrimitiveVariadic<
    [e.$Array<e.std.$Int64>, e.$Array<e.std.$Float32>]
  >;
  const _f5: typeutil.assertEqual<_t5, e.$Array<e.$Float64>> = true;
  type _t6 = e.getSharedParentPrimitiveVariadic<
    [e.$UnnamedTuple<[e.std.$Int64]>, e.$UnnamedTuple<[e.std.$Float32]>]
  >;
  const _f6: typeutil.assertEqual<_t6, e.$UnnamedTuple<[e.$Float64]>> = true;
  type _t7 = e.getSharedParentPrimitiveVariadic<
    [e.$NamedTuple<{num: e.std.$Int64}>, e.$NamedTuple<{num: e.std.$Float32}>]
  >;
  const _f7: typeutil.assertEqual<
    _t7,
    e.$NamedTuple<{num: e.$Float64}>
  > = true;
});
