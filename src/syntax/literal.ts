import {
  BaseExpression,
  Expression,
  Cardinality,
  ExpressionKind,
  MaterialType,
  TypeSet,
} from "reflection";
import {$expressionify} from "./path";
import {toEdgeQL} from "./toEdgeQL";

export type $expr_Literal<Type extends MaterialType = MaterialType> =
  Expression<{
    __element__: Type;
    __cardinality__: Cardinality.One;
    __kind__: ExpressionKind.Literal;
    __value__: Type["__tstype__"];
  }>;

export const $expr_Literal = <T extends MaterialType>(
  type: T,
  value: T["__tstype__"]
): $expr_Literal<T> => {
  return $expressionify({
    __element__: type,
    __cardinality__: Cardinality.One,
    __kind__: ExpressionKind.Literal,
    __value__: value,
  });
};

export {$expr_Literal as literal};
