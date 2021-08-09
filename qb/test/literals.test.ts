import * as edgedb from "edgedb/src/index.node";
import e, {literal, $Array, $NamedTuple, $Tuple} from "../generated/example";

test("literals", () => {
  const duration = new edgedb.Duration(0, 0, 0, 0, 5, 6, 7, 8, 9, 10);
  const localdate = new edgedb.LocalDate(2021, 10, 31);
  const localdatetime = new edgedb.LocalDateTime(2021, 10, 31, 21, 45, 30);
  const localtime = new edgedb.LocalTime(15, 15, 0);
  const uuid = "317fee4c-0da5-45aa-9980-fedac211bfb6";

  expect(e.std.bigint(BigInt("9007199254740991")).toEdgeQL()).toEqual(
    `<std::bigint>9007199254740991n`
  );
  expect(e.std.bool(true).toEdgeQL()).toEqual(`<std::bool>true`);
  expect(e.std.bytes("whatever").toEdgeQL()).toEqual(`<std::bytes>"whatever"`);
  expect(
    e.std.datetime(new Date("2021-06-25T02:01:13.681Z")).toEdgeQL()
  ).toEqual(`<std::datetime>'2021-06-25T02:01:13.681Z'`);
  expect(e.std.decimal("1234.1234n").toEdgeQL()).toEqual(
    `<std::decimal>"1234.1234n"`
  );
  expect(e.std.duration(duration).toEdgeQL()).toEqual(
    `<std::duration>'PT5H6M7.00800901S'`
  );
  expect(e.std.float32(144.1235).toEdgeQL()).toEqual(`<std::float32>144.1235`);
  expect(e.std.float64(1234.15).toEdgeQL()).toEqual(`<std::float64>1234.15`);
  expect(e.std.int16(1234.1234).toEdgeQL()).toEqual(`<std::int16>1234.1234`);
  expect(e.std.int32(124).toEdgeQL()).toEqual(`<std::int32>124`);

  expect(e.std.int64(1234).toEdgeQL()).toEqual(`<std::int64>1234`);
  expect(e.std.json('"asdf"').toEdgeQL()).toEqual(`<std::json>"\\"asdf\\""`);
  expect(e.std.str(`asdfaf`).toEdgeQL()).toEqual(`<std::str>"asdfaf"`);
  expect(e.std.str(`string " with ' all \` quotes`).toEdgeQL()).toEqual(
    `<std::str>"string \\" with ' all \` quotes"`
  );
  expect(e.std.uuid(uuid).toEdgeQL()).toEqual(
    `<std::uuid>"317fee4c-0da5-45aa-9980-fedac211bfb6"`
  );
  expect(e.cal.local_date(localdate).toEdgeQL()).toEqual(
    `<cal::local_date>'2021-10-31'`
  );
  expect(e.cal.local_datetime(localdatetime).toEdgeQL()).toEqual(
    `<cal::local_datetime>'2021-10-31T21:45:30'`
  );
  expect(e.cal.local_time(localtime).toEdgeQL()).toEqual(
    `<cal::local_time>'15:15:00'`
  );
  // not available in beta2
  // expect(e.cal.relative_duration("1 year").toEdgeQL()).toEqual(
  //   `<cal::relative_duration>'1 year'`
  // );
});

test("collection type literals", () => {
  const literalArray = literal($Array(e.str), ["adsf"]);
  expect(literalArray.toEdgeQL()).toEqual(
    `<array<std::str>>[<std::str>"adsf"]`
  );
  const literalNamedTuple = literal($NamedTuple({str: e.str}), {
    str: "asdf",
  });
  expect(literalNamedTuple.toEdgeQL()).toEqual(
    `<tuple<str: std::str>>( str := <std::str>"asdf" )`
  );
  const literalTuple = literal($Tuple([e.str, e.int64]), ["asdf", 1234]);
  expect(literalTuple.toEdgeQL()).toEqual(
    `<tuple<std::str, std::int64>>( <std::str>"asdf", <std::int64>1234 )`
  );
});
