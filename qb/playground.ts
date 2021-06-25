// tslint:disable:no-console
import * as edgedb from "edgedb";
import * as e from "./generated/example";

const duration = new edgedb.Duration(0, 0, 0, 0, 5, 6, 7, 8, 9, 10);
const localdate = new edgedb.LocalDate(2021, 10, 31);
const localdatetime = new edgedb.LocalDateTime(2021, 10, 31, 21, 45, 30);
const localtime = new edgedb.LocalTime(15, 15, 0);
const uuid = "317fee4c-0da5-45aa-9980-fedac211bfb6";

console.log(e.bigint(BigInt("9007199254740991")).toEdgeQL());
console.log(e.bool(true).toEdgeQL());
console.log(e.bytes("whatever").toEdgeQL());
console.log(e.datetime(new Date()).toEdgeQL());
console.log(e.decimal("1234.1234n").toEdgeQL());
console.log(e.duration(duration).toEdgeQL());
console.log(e.float32(144.1235).toEdgeQL());
console.log(e.float64(1234.15).toEdgeQL());
console.log(e.int16(1234.1234).toEdgeQL());
console.log(e.int32(124).toEdgeQL());
console.log(e.int64(1234).toEdgeQL());
console.log(e.json('"asdf"').toEdgeQL());
console.log(e.str(`asdfaf`).toEdgeQL());
console.log(e.uuid(uuid).toEdgeQL());
console.log(e.cal.local_date(localdate).toEdgeQL());
console.log(e.cal.local_datetime(localdatetime).toEdgeQL());
console.log(e.cal.local_time(localtime).toEdgeQL());
console.log(e.cal.relative_duration("1 year").toEdgeQL());

console.log(e.sys);

console.log(e.Literal(e.Array("asdf", e.Str), ["adsf"]).toEdgeQL());
console.log(
  e.Literal(e.NamedTuple("asdf", {str: e.Str}), {str: "asdf"}).toEdgeQL()
);
console.log(
  e
    .Literal(e.UnnamedTuple("asdf", [e.Str, e.Int64]), ["asdf", 1234])
    .toEdgeQL()
);
