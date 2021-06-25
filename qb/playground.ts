import * as edgedb from "edgedb";
import * as e from "./generated/example";

const duration = new edgedb.Duration(0, 0, 0, 0, 5, 6, 7, 8, 9, 10);
const localdate = new edgedb.LocalDate(2021, 10, 31);
const localdatetime = new edgedb.LocalDateTime(2021, 10, 31, 21, 45, 30);
const localtime = new edgedb.LocalTime(15, 15, 0);
const uuid = "317fee4c-0da5-45aa-9980-fedac211bfb6";

console.log(e.std.bigint(BigInt("9007199254740991")).toEdgeQL());
console.log(e.std.bool(true).toEdgeQL());
console.log(e.std.bytes("whatever").toEdgeQL());
console.log(e.std.datetime(new Date()).toEdgeQL());
console.log(e.std.decimal("1234.1234n").toEdgeQL());
console.log(e.std.duration(duration).toEdgeQL());
console.log(e.std.float32(144.1235).toEdgeQL());
console.log(e.std.float64(1234.15).toEdgeQL());
console.log(e.std.int16(1234.1234).toEdgeQL());
console.log(e.std.int32(124).toEdgeQL());
console.log(e.std.int64(1234).toEdgeQL());
console.log(e.std.json('"asdf"').toEdgeQL());
console.log(e.std.str(`asdfaf`).toEdgeQL());
console.log(e.std.uuid(uuid).toEdgeQL());
console.log(e.cal.local_date(localdate).toEdgeQL());
console.log(e.cal.local_datetime(localdatetime).toEdgeQL());
console.log(e.cal.local_time(localtime).toEdgeQL());
console.log(e.cal.relative_duration("1 year").toEdgeQL());

// WITH
//   bigint := <std::bigint>9007199254740991n,
//   bool := <std::bool>true,
//   datetime := <std::datetime>'2021-06-25T01:50:00.509Z',
//   decimal := <std::decimal>1234.1234n,
//   duration := <std::duration>'PT5H6M7.00800901S',
//   float32 := <std::float32>144.1235,
//   float64 := <std::float64>1234.15,
//   int16 := <std::int16>1234.1234,
//   int32 := <std::int32>124,
//   int64 := <std::int64>1234,
//   json := <std::json>"asdf",
//   str := <std::str>"asdfaf",
//   uuid := <std::uuid>"317fee4c-0da5-45aa-9980-fedac211bfb6",
//   local_date := <cal::local_date>'2021-10-31',
//   local_datetime := <cal::local_datetime>'2021-10-31T21:45:30',
//   local_time := <cal::local_time>'15:15:00',
//   select (
//     bigint, bool, datetime, decimal, duration, float32, float64, int16, int32, int64, json, str, uuid, local_date, local_datetime, local_time
//   );

//   // relative_duration := <cal::relative_duration>"1 year"
// // , relative_duration
