import e from "../dbschema/edgeql-js";
import type {getSharedParentPrimitiveVariadic} from "../dbschema/edgeql-js/syntax/syntax";
import {tc} from "./setupTeardown";

test("primitive types", () => {
  expect(e.int16.__name__).toEqual("std::int16");
  expect(e.int32.__name__).toEqual("std::int32");
  expect(e.int64.__name__).toEqual("std::int64");
  expect(e.float32.__name__).toEqual("std::float32");
  expect(e.float64.__name__).toEqual("std::float64");
  expect(e.str.__name__).toEqual("std::str");
});

test("collection types", () => {
  const arrayType = e.array(e.str);
  expect(arrayType.__name__).toEqual("array<std::str>");
  const named = e.tuple({str: e.str});
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
});
