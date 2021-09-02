import * as edgedb from "edgedb";
import {typeutil} from "../../src/reflection";
import e, {
  $Array,
  $NamedTuple,
  $Tuple,
  getSharedParentPrimitiveVariadic,
} from "../generated/example";
import {tc} from "./setupTeardown";

test("primitive types", () => {
  expect(e.int16.__name__).toEqual("std::int16");
  // expect(e.std.).toEqual("std::int64");
});

test("collection types", () => {
  const arrayType = e.array(e.str);
  expect(arrayType.__name__).toEqual("array<std::str>");
  const named = e.namedTuple({str: e.str});
  expect(named.__name__).toEqual("tuple<str: std::str>");
  expect(named.__shape__.str.__name__).toEqual("std::str");
  const unnamed = e.tuple([e.str, e.int64]);
  expect(unnamed.__name__).toEqual("tuple<std::str, std::int64>");
  expect(unnamed.__items__[0].__name__).toEqual("std::str");
  expect(unnamed.__items__[1].__name__).toEqual("std::int64");
});

test("scalar type merging", () => {
  type _t1 = getSharedParentPrimitiveVariadic<
    [typeof e.std.str, typeof e.std.str]
  >;
  tc.assert<tc.IsExact<_t1, typeof e.std.str>>(true);
  type _t2 = getSharedParentPrimitiveVariadic<
    [typeof e.std.str, typeof e.std.int32]
  >;
  tc.assert<tc.IsExact<_t2, never>>(true);
  type _t3 = getSharedParentPrimitiveVariadic<
    [typeof e.std.int16, typeof e.std.int32]
  >;
  tc.assert<tc.IsExact<_t3, typeof e.int32>>(true);
  type _t4 = getSharedParentPrimitiveVariadic<
    [typeof e.std.int64, typeof e.std.float32]
  >;
  tc.assert<tc.IsExact<_t4, typeof e.float64>>(true);
  type _t5 = getSharedParentPrimitiveVariadic<
    [$Array<typeof e.std.int64>, $Array<typeof e.std.float32>]
  >;
  tc.assert<tc.IsExact<_t5, $Array<typeof e.float64>>>(true);
  type _t6 = getSharedParentPrimitiveVariadic<
    [$Tuple<[typeof e.std.int64]>, $Tuple<[typeof e.std.float32]>]
  >;
  tc.assert<tc.IsExact<_t6, $Tuple<[typeof e.float64]>>>(true);
  type _t7 = getSharedParentPrimitiveVariadic<
    [
      $NamedTuple<{num: typeof e.std.int64}>,
      $NamedTuple<{num: typeof e.std.float32}>
    ]
  >;
  tc.assert<tc.IsExact<_t7, $NamedTuple<{num: typeof e.float64}>>>(true);
});
