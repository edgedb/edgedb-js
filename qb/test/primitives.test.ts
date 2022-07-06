import * as edgedb from "edgedb";
import e from "../dbschema/edgeql-js";
import type {getSharedParentPrimitiveVariadic} from "../dbschema/edgeql-js/syntax/syntax";
import {setupTests, tc, teardownTests} from "./setupTeardown";

let client: edgedb.Client;

export const version_lt = async (cutoff: number) => {
  const version = await client.queryRequiredSingle<{major: number}>(
    `select sys::get_version()`
  );
  return version.major < cutoff;
};

beforeAll(async () => {
  const setup = await setupTests();
  ({client} = setup);
});

afterAll(async () => {
  await teardownTests(client);
});

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

test("range primitives", async () => {
  const range = new edgedb.Range(3, 8);
  const lowerRange = new edgedb.Range(3, null);
  const upperRange = new edgedb.Range(null, 8);
  const dateRange = new edgedb.Range(
    new Date("2022-07-05T14:00:00Z"),
    new Date("2022-07-05T16:00:00Z")
  );

  expect(e.std.range(range).toEdgeQL()).toEqual(
    `std::range(3, 8, inc_lower := true, inc_upper := false)`
  );
  expect(e.std.range(lowerRange).toEdgeQL()).toEqual(
    `std::range(3, <std::float64>{}, inc_lower := true, inc_upper := false)`
  );
  expect(e.std.range(upperRange).toEdgeQL()).toEqual(
    `std::range(<std::float64>{}, 8, inc_lower := true, inc_upper := false)`
  );
  expect(e.std.range(dateRange).toEdgeQL()).toEqual(
    `std::range(<std::datetime>'2022-07-05T14:00:00.000Z', <std::datetime>'2022-07-05T16:00:00.000Z', inc_lower := true, inc_upper := false)`
  );

  expect(e.range(3, 8).toEdgeQL()).toEqual(`std::range(3, 8)`);
  expect(e.range(3).toEdgeQL()).toEqual(`std::range(3)`);
  expect(e.range(undefined, 8).toEdgeQL()).toEqual(
    `std::range(<std::float64>{}, 8)`
  );

  const res = await e
    .select({
      range: e.range(range),
      lowerRange: e.range(lowerRange),
      upperRange: e.range(upperRange),
      dateRange: e.range(dateRange),
    })
    .run(client);

  tc.assert<
    tc.IsExact<
      typeof res,
      {
        range: edgedb.Range<number>;
        lowerRange: edgedb.Range<number>;
        upperRange: edgedb.Range<number>;
        dateRange: edgedb.Range<Date>;
      }
    >
  >(true);

  expect(res).toEqual({
    range: range,
    lowerRange: lowerRange,
    upperRange: new edgedb.Range(null, 8, false),
    dateRange: dateRange,
  });

  const getLower = e.range_get_lower(e.Bag.rangeField);

  tc.assert<
    tc.IsExact<typeof getLower["__element__"]["__name__"], "std::number">
  >(true);
  expect(getLower.__element__.__name__).toEqual("std::int64");

  const q2 = e.params(
    {
      range: e.range(e.int32),
      rangeArray: e.array(e.range(e.datetime)),
    },
    $ =>
      e.select({
        range: $.range,
        rangeArray: $.rangeArray,
      })
  );

  const res2 = await q2.run(client, {range, rangeArray: [dateRange]});

  tc.assert<
    tc.IsExact<
      typeof res2,
      {range: edgedb.Range<number>; rangeArray: edgedb.Range<Date>[]}
    >
  >(true);

  expect(res2).toEqual({range: range, rangeArray: [dateRange]});

  await e
    .insert(e.Bag, {
      stringsMulti: "test",
      rangeField: range,
    })
    .run(client);

  await e
    .update(e.Bag, () => ({
      set: {
        rangeField: e.range(lowerRange),
      },
    }))
    .run(client);

  const res3 = await e.select(e.Bag.rangeField).run(client);

  tc.assert<tc.IsExact<typeof res3, edgedb.Range<number>[]>>(true);

  expect(res3).toEqual([lowerRange]);

  await e.delete(e.Bag).run(client);
});
