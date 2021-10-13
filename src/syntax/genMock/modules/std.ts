import {
  BaseType,
  TypeSet,
  ScalarType,
  ObjectType,
  $expr_PathNode,
  Cardinality,
} from "../../../reflection";

declare function assert_single(input: TypeSet<BaseType>): any;

declare const int64: ScalarType<"std::int64", number>;

export type $FreeObject = ObjectType<"std::FreeObject", any, null>;
declare const FreeObject: $expr_PathNode<
  TypeSet<$FreeObject, Cardinality.Many>,
  null,
  true
>;

export type $bool = ScalarType<"std::bool", boolean>;

type $int16 = ScalarType<"std::int16", number>;
type $int32 = ScalarType<"std::int32", number>;
type $int64 = ScalarType<"std::int64", number>;
type $bigint = ScalarType<"std::bigint", BigInt>;

export type $anyint = $int16 | $int32 | $int64 | $bigint;

export default {assert_single, int64, FreeObject};
