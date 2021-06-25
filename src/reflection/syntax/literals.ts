import {
  Duration,
  LocalDate,
  LocalDateTime,
  LocalTime,
} from "../../datatypes/datetime";
import {Cardinality, makeSet, MaterialType, TypeKind} from "../typesystem";

const valueToEdgeQL: (type: MaterialType, val: any) => string = (
  type,
  val
) => {
  let stringRep;
  if (typeof val === "string") {
    stringRep = `'${val}'`;
  } else if (typeof val === "number") {
    stringRep = `${val.toString()}`;
  } else if (typeof val === "boolean") {
    stringRep = `${val.toString()}`;
  } else if (typeof val === "bigint") {
    stringRep = `${val.toString()}n`;
  } else if (Array.isArray(val)) {
    if (type.__kind__ === TypeKind.array) {
      stringRep = `[${val.map(valueToEdgeQL).join(", ")}]`;
    } else if (type.__kind__ === TypeKind.unnamedtuple) {
      stringRep = `( ${val.map(valueToEdgeQL).join(", ")} )`;
    } else {
      throw new Error(`Invalid value for type ${type.__name__}`);
    }
  } else if (val instanceof Date) {
    stringRep = `'${val.toISOString()}'`;
  } else if (val instanceof LocalDate) {
    stringRep = `'${val.toString()}'`;
  } else if (val instanceof LocalDateTime) {
    stringRep = `'${val.toString()}'`;
  } else if (val instanceof LocalTime) {
    stringRep = `'${val.toString()}'`;
  } else if (val instanceof Duration) {
    stringRep = `'${val.toString()}'`;
  } else if (typeof val === "object") {
    if (type.__kind__ === TypeKind.namedtuple) {
      stringRep = `( ${Object.entries(val).map(
        ([key, value]) =>
          `${key} := ${valueToEdgeQL(type.__shape__[key], value)}`
      )} )`;
    } else {
      throw new Error(`Invalid value for type ${type.__name__}`);
    }
  } else {
    throw new Error(`Invalid value for type ${type.__name__}`);
  }
  return `<${type.__name__}>${stringRep}`;
};

export const Literal = <T extends MaterialType>(
  type: T,
  value: T["__tstype__"]
): makeSet<T, Cardinality.One> & {
  __value__: T["__tstype__"];
  toEdgeQL(): string;
} => {
  return {
    __element__: type,
    __cardinality__: Cardinality.One,
    __value__: value,
    toEdgeQL() {
      return valueToEdgeQL(this.__element__, this.__value__);
    },
  };
};
