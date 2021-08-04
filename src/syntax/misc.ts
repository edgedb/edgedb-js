import {TypeSet, setToTsType} from "reflection";

export {
  ArrayType as $Array,
  TupleType as $Tuple,
  NamedTupleType as $NamedTuple,
} from "reflection";

export type $infer<A extends TypeSet> = setToTsType<A>;
