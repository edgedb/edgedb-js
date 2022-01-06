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

declare const jsnumber: scalarTypeWithConstructor<
  ScalarType<"std::jsnumber", number>
>;

export type $FreeObject = ObjectType<"std::FreeObject", any, null>;
declare const FreeObject: $expr_PathNode<
  TypeSet<$FreeObject, Cardinality.Many>,
  null,
  true
>;

export type $bool = ScalarType<"std::bool", boolean>;

export type $jsnumber = ScalarType<"std::jsnumber", number>;

export default {assert_single, jsnumber, FreeObject};
