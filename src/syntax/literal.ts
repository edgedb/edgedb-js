import {
  Cardinality,
  ExpressionKind,
  BaseType,
  BaseTypeToTsType,
} from "../reflection";
import {$expr_Literal} from "../reflection/literal";
import {$expressionify} from "./path";

function $expr_Literal<T extends BaseType>(
  type: T,
  value: BaseTypeToTsType<T>
): $expr_Literal<T> {
  return $expressionify({
    __element__: type,
    __cardinality__: Cardinality.One,
    __kind__: ExpressionKind.Literal,
    __value__: value,
  });
}

export {$expr_Literal as literal};
