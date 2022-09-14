import {Expression, BaseType} from "./typesystem.ts";
import {Cardinality, ExpressionKind} from "./enums.ts";

export type $expr_Literal<Type extends BaseType = BaseType> = Expression<{
  __element__: Type;
  __cardinality__: Cardinality.One;
  __kind__: ExpressionKind.Literal;
  __value__: any;
}>;
