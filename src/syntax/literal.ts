import {
  BaseExpression,
  Expression,
  Cardinality,
  ExpressionKind,
  MaterialType,
  TypeSet,
  BaseTypeToTsType,
} from "reflection";
import {$expressionify} from "./path";

export type $expr_Literal<Type extends MaterialType = MaterialType> =
  Expression<{
    __element__: Type;
    __cardinality__: Cardinality.One;
    __kind__: ExpressionKind.Literal;
    __value__: any;
  }>;

export const $expr_Literal = <T extends MaterialType>(
  type: T,
  value: BaseTypeToTsType<T>
): $expr_Literal<T> => {
  return $expressionify({
    __element__: type,
    __cardinality__: Cardinality.One,
    __kind__: ExpressionKind.Literal,
    __value__: value,
  });
};

export {$expr_Literal as literal};
