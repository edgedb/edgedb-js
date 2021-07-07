import {TypeSet, setToTsType} from "reflection";

export {
  ArrayType as $Array,
  UnnamedTupleType as $UnnamedTuple,
  NamedTupleType as $NamedTuple,
} from "reflection";

export type $infer<A extends TypeSet> = setToTsType<A>;
