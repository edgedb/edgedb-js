import * as edgedb from "edgedb";
import e from "../dbschema/edgeql";

test("literals", () => {
  const duration = new edgedb.Duration(0, 0, 0, 0, 5, 6, 7, 8, 9, 10);
  const localdate = new edgedb.LocalDate(2021, 10, 31);
  const localdatetime = new edgedb.LocalDateTime(2021, 10, 31, 21, 45, 30);
  const localtime = new edgedb.LocalTime(15, 15, 0);
  const relduration = new edgedb.RelativeDuration(1, 2, 3);
  const uuid = "317fee4c-0da5-45aa-9980-fedac211bfb6";

  expect(e.std.bigint(BigInt("9007199254740991")).toEdgeQL()).toEqual(
    `<std::bigint>9007199254740991n`
  );
  expect(e.std.bool(true).toEdgeQL()).toEqual(`true`);
  expect(
    e.std.bytes(Buffer.from(`whatever\nðñòóôõö÷øùúûüýþÿ`)).toEdgeQL()
  ).toEqual(
    `b'whatever\\n\\xc3\\xb0\\xc3\\xb1\\xc3\\xb2\\xc3\\xb3\\xc3\\xb4\\xc3` +
      `\\xb5\\xc3\\xb6\\xc3\\xb7\\xc3\\xb8\\xc3\\xb9\\xc3\\xba\\xc3\\xbb` +
      `\\xc3\\xbc\\xc3\\xbd\\xc3\\xbe\\xc3\\xbf'`
  );
  expect(
    e.std.datetime(new Date("2021-06-25T02:01:13.681Z")).toEdgeQL()
  ).toEqual(`<std::datetime>'2021-06-25T02:01:13.681Z'`);
  expect(e.std.decimal("1234.1234n").toEdgeQL()).toEqual(
    `<std::decimal>"1234.1234n"`
  );
  expect(e.std.duration(duration).toEdgeQL()).toEqual(
    `<std::duration>'PT5H6M7.00800901S'`
  );
  expect(e.std.number(144.1235).toEdgeQL()).toEqual(`144.1235`);
  expect(e.std.number(1234.15).toEdgeQL()).toEqual(`1234.15`);
  expect(e.std.number(1234.1234).toEdgeQL()).toEqual(`1234.1234`);
  expect(e.std.number(124).toEdgeQL()).toEqual(`124`);
  expect(e.std.number("9223372036854775807").toEdgeQL()).toEqual(
    `9223372036854775807`
  );

  expect(e.std.json("asdf").toEdgeQL()).toEqual(`to_json("\\"asdf\\"")`);
  expect(
    e.std.json({a: 123, b: "some string", c: [true, false]}).toEdgeQL()
  ).toEqual(
    `to_json("{\\"a\\":123,\\"b\\":\\"some string\\",\\"c\\":[true,false]}")`
  );

  expect(e.std.str(`asdfaf`).toEdgeQL()).toEqual(`"asdfaf"`);
  expect(e.std.str(`string " with ' all \` quotes`).toEdgeQL()).toEqual(
    `"string \\" with ' all \` quotes"`
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
  expect(e.cal.relative_duration(relduration).toEdgeQL()).toEqual(
    `<cal::relative_duration>'P1Y2M21D'`
  );
});

test("collection type literals", () => {
  const literalArray = e.literal(e.array(e.str), ["adsf"]);
  expect(literalArray.toEdgeQL()).toEqual(`["adsf"]`);
  const literalNamedTuple = e.literal(e.tuple({str: e.str}), {
    str: "asdf",
  });
  expect(literalNamedTuple.toEdgeQL()).toEqual(`( str := "asdf" )`);
  const literalTuple = e.literal(e.tuple([e.str, e.number]), ["asdf", 1234]);
  expect(literalTuple.toEdgeQL()).toEqual(`( "asdf", 1234 )`);
});
