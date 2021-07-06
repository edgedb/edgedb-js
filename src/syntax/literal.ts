import {
  BaseExpression,
  Cardinality,
  ExpressionKind,
  MaterialType,
  TypeSet,
} from "reflection";
import {toEdgeQL} from "./toEdgeQL";

export type $expr_Literal<
  Type extends MaterialType = MaterialType
> = BaseExpression<TypeSet<Type, Cardinality.One>> & {
  __kind__: ExpressionKind.Literal;
  __value__: Type["__tstype__"];
};

export const $expr_Literal = <T extends MaterialType>(
  type: T,
  value: T["__tstype__"]
): $expr_Literal<T> => {
  return {
    __element__: type,
    __cardinality__: Cardinality.One,
    __kind__: ExpressionKind.Literal,
    __value__: value,
    toEdgeQL,
  } as any;
};
