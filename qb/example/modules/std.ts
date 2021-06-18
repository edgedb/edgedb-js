import type * as scalarBase from "../scalarBase";
import * as edgedb from "edgedb";
import {reflection as $} from "edgedb";
import type * as schemaTypes from "./schema";
import {spec as __spec__} from "../__spec__";

const ANYSCALAR_SYMBOL: unique symbol = Symbol("std::anyscalar")
export interface Anyscalar  {
  [ANYSCALAR_SYMBOL]: true;
}

const ANYENUM_SYMBOL: unique symbol = Symbol("std::anyenum");
export interface Anyenum<TsType = unknown, Name extends string = string, Values extends [string, ...string[]] = [string, ...string[]]> extends Anyscalar, scalarBase.Materialtype<TsType, Name, never, never, never> {
  [ANYENUM_SYMBOL]: true;
  __values: Values;
}

const ANYREAL_SYMBOL: unique symbol = Symbol("std::anyreal")
export interface Anyreal extends Anyscalar  {
  [ANYREAL_SYMBOL]: true;
}

const ANYFLOAT_SYMBOL: unique symbol = Symbol("std::anyfloat")
export interface Anyfloat extends Anyreal  {
  [ANYFLOAT_SYMBOL]: true;
}

const ANYINT_SYMBOL: unique symbol = Symbol("std::anyint")
export interface Anyint extends Anyreal  {
  [ANYINT_SYMBOL]: true;
}

const ANYNUMERIC_SYMBOL: unique symbol = Symbol("std::anynumeric")
export interface Anynumeric extends Anyreal  {
  [ANYNUMERIC_SYMBOL]: true;
}

const BIGINT_SYMBOL: unique symbol = Symbol("std::bigint");
export interface Bigint extends Anynumeric, Anyint, scalarBase.Materialtype<BigInt, "std::bigint", never, never, never> {
  [BIGINT_SYMBOL]: true;
}
export const Bigint: Bigint = {
  __name: "std::bigint",
} as any;

const BOOL_SYMBOL: unique symbol = Symbol("std::bool");
export interface Bool extends Anyscalar, scalarBase.Materialtype<boolean, "std::bool", never, never, never> {
  [BOOL_SYMBOL]: true;
}
export const Bool: Bool = {
  __name: "std::bool",
} as any;

const BYTES_SYMBOL: unique symbol = Symbol("std::bytes");
export interface Bytes extends Anyscalar, scalarBase.Materialtype<unknown, "std::bytes", never, never, never> {
  [BYTES_SYMBOL]: true;
}
export const Bytes: Bytes = {
  __name: "std::bytes",
} as any;

const DATETIME_SYMBOL: unique symbol = Symbol("std::datetime");
export interface Datetime extends Anyscalar, scalarBase.Materialtype<Date, "std::datetime", never, never, never> {
  [DATETIME_SYMBOL]: true;
}
export const Datetime: Datetime = {
  __name: "std::datetime",
} as any;

const DECIMAL_SYMBOL: unique symbol = Symbol("std::decimal");
export interface Decimal extends Anynumeric, scalarBase.Materialtype<unknown, "std::decimal", never, never, never> {
  [DECIMAL_SYMBOL]: true;
}
export const Decimal: Decimal = {
  __name: "std::decimal",
} as any;

const DURATION_SYMBOL: unique symbol = Symbol("std::duration");
export interface Duration extends Anyscalar, scalarBase.Materialtype<edgedb.Duration, "std::duration", never, never, never> {
  [DURATION_SYMBOL]: true;
}
export const Duration: Duration = {
  __name: "std::duration",
} as any;

const FLOAT32_SYMBOL: unique symbol = Symbol("std::float32");
export interface Float32 extends Anyfloat, scalarBase.Materialtype<number, "std::float32", never, never, never> {
  [FLOAT32_SYMBOL]: true;
}
export const Float32: Float32 = {
  __name: "std::float32",
} as any;

const FLOAT64_SYMBOL: unique symbol = Symbol("std::float64");
export interface Float64 extends Anyfloat, scalarBase.Materialtype<number, "std::float64", never, never, never> {
  [FLOAT64_SYMBOL]: true;
}
export const Float64: Float64 = {
  __name: "std::float64",
} as any;

const INT16_SYMBOL: unique symbol = Symbol("std::int16");
export interface Int16 extends Anyint, scalarBase.Materialtype<number, "std::int16", never, never, never> {
  [INT16_SYMBOL]: true;
}
export const Int16: Int16 = {
  __name: "std::int16",
} as any;

const INT32_SYMBOL: unique symbol = Symbol("std::int32");
export interface Int32 extends Anyint, scalarBase.Materialtype<number, "std::int32", never, never, never> {
  [INT32_SYMBOL]: true;
}
export const Int32: Int32 = {
  __name: "std::int32",
} as any;

const INT64_SYMBOL: unique symbol = Symbol("std::int64");
export interface Int64 extends Anyint, scalarBase.Materialtype<number, "std::int64", never, never, never> {
  [INT64_SYMBOL]: true;
}
export const Int64: Int64 = {
  __name: "std::int64",
} as any;

const JSON_SYMBOL: unique symbol = Symbol("std::json");
export interface Json extends Anyscalar, scalarBase.Materialtype<string, "std::json", never, never, never> {
  [JSON_SYMBOL]: true;
}
export const Json: Json = {
  __name: "std::json",
} as any;

const SEQUENCE_SYMBOL: unique symbol = Symbol("std::sequence")
export interface Sequence extends Int64  {
  [SEQUENCE_SYMBOL]: true;
}

const STR_SYMBOL: unique symbol = Symbol("std::str");
export interface Str extends Anyscalar, scalarBase.Materialtype<string, "std::str", never, never, never> {
  [STR_SYMBOL]: true;
}
export const Str: Str = {
  __name: "std::str",
} as any;

const UUID_SYMBOL: unique symbol = Symbol("std::uuid");
export interface Uuid extends Anyscalar, scalarBase.Materialtype<string, "std::uuid", never, never, never> {
  [UUID_SYMBOL]: true;
}
export const Uuid: Uuid = {
  __name: "std::uuid",
} as any;

export interface BaseObject {
  id: $.PropertyDesc<string, $.Cardinality.One>;
  __type__: $.LinkDesc<schemaTypes.Type, $.Cardinality.One>;
}

export interface Object extends BaseObject {
}

export const BaseObject = $.objectType<BaseObject>(
  __spec__,
  "std::BaseObject",
);

export const Object = $.objectType<Object>(
  __spec__,
  "std::Object",
);
