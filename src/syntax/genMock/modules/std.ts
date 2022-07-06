import {Duration} from "../../../datatypes/datetime";
import {
  BaseType,
  TypeSet,
  ScalarType,
  ObjectType,
  $expr_PathNode,
  Cardinality,
  scalarTypeWithConstructor,
} from "../../../reflection";

declare function assert_single(input: TypeSet<BaseType>): any;

declare const number: scalarTypeWithConstructor<
  ScalarType<"std::number", number>
>;

export type $Object = ObjectType<"std::Object", any, null>;

export type $FreeObject = ObjectType<"std::FreeObject", any, null>;
declare const FreeObject: $expr_PathNode<
  TypeSet<$FreeObject, Cardinality.Many>,
  null,
  true
>;

export type $bool = ScalarType<"std::bool", boolean>;
export type $number = ScalarType<"std::number", number>;
export type $decimal = ScalarType<"std::decimal", unknown>;
export type $datetime = ScalarType<"std::datetime", Date>;
export type $duration = ScalarType<"std::duration", Duration>;

export default {assert_single, number, FreeObject};
