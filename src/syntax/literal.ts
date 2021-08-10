import {
  BaseExpression,
  Cardinality,
  ExpressionKind,
  MaterialType,
  TypeSet,
} from "reflection";
import {toEdgeQL} from "./toEdgeQL";

export type $expr_Literal<
  Type extends MaterialType = MaterialType,
  TsType extends Type["__tstype__"] = Type["__tstype__"]
> = BaseExpression<TypeSet<Type, Cardinality.One>> & {
  __kind__: ExpressionKind.Literal;
  __value__: TsType;
};

export const $expr_Literal = <
  T extends MaterialType,
  TsType extends T["__tstype__"] = T["__tstype__"]
>(
  type: T,
  value: TsType
): $expr_Literal<T & {__tstype__: TsType}> => {
  return {
    __element__: type,
    __cardinality__: Cardinality.One,
    __kind__: ExpressionKind.Literal,
    __value__: value,
    toEdgeQL,
  } as any;
};

export {$expr_Literal as literal};
