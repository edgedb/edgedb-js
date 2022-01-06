import {
  Cardinality,
  ExpressionKind,
  BaseType,
  BaseTypeToTsType,
  unwrapCastableType,
} from "../reflection";
import {$expr_Literal} from "../reflection/literal";
import {$expressionify} from "./path";

function $expr_Literal<T extends BaseType>(
  type: T,
  value: BaseTypeToTsType<unwrapCastableType<T>>
): $expr_Literal<unwrapCastableType<T>> {
  return $expressionify({
    __element__: type,
    __cardinality__: Cardinality.One,
    __kind__: ExpressionKind.Literal,
    __value__: value,
  }) as any;
}

export {$expr_Literal as literal};
