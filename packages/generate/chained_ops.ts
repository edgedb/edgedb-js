import type {ScalarType, TypeSet} from "./typesystem";
import type {$number, $str} from "./modules/std";
import type {$expr_Operator} from "./funcops";
import type {cardutil} from "./cardinality";

export type $ops<Set extends TypeSet> = Set["__element__"] extends ScalarType
  ? _scalarOps<Set>
  : {};

type _scalarOps<Set extends TypeSet> =
  Set["__element__"]["__name__"] extends "std::number"
    ? {
        plus<T extends TypeSet<$number>>(
          val: T
        ): $expr_Operator<
          $number,
          cardutil.multiplyCardinalities<
            Set["__cardinality__"],
            T["__cardinality__"]
          >
        >;
      }
    : Set["__element__"]["__name__"] extends "std::str"
    ? {
        concat<T extends TypeSet<$str>>(
          val: T
        ): $expr_Operator<
          $str,
          cardutil.multiplyCardinalities<
            Set["__cardinality__"],
            T["__cardinality__"]
          >
        >;
      }
    : {};
