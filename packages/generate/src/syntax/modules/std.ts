import type { Duration } from "edgedb";
import type {
  BaseType,
  TypeSet,
  ScalarType,
  ObjectType,
  scalarTypeWithConstructor,
} from "../typesystem.js";

import type { $expr_PathNode } from "../path.js";
import type { Cardinality } from "edgedb/dist/reflection/index.js";
declare function assert_single(input: TypeSet<BaseType>): any;

declare const number: scalarTypeWithConstructor<
  ScalarType<"std::number", number>
>;

export type $Object = ObjectType<"std::Object", any, null>;

export type $FreeObject = ObjectType<"std::FreeObject", any, null>;
declare const FreeObject: $expr_PathNode<
  TypeSet<$FreeObject, Cardinality.Many>
  // null,
  // true
>;

export type $FreeObjectλShape = any;
export type $str = ScalarType<"std::str", string>;

export type $bool = ScalarType<"std::bool", boolean>;
export type $number = ScalarType<"std::number", number>;
export type $decimal = ScalarType<"std::decimal", string>;
export type $datetime = ScalarType<"std::datetime", Date>;
export type $duration = ScalarType<"std::duration", Duration>;

export default { assert_single, number, FreeObject };
