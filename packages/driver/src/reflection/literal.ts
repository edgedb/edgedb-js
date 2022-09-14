import {Expression, BaseType} from "./typesystem";
import {Cardinality, ExpressionKind} from "./enums";

export type $expr_Literal<Type extends BaseType = BaseType> = Expression<{
  __element__: Type;
  __cardinality__: Cardinality.One;
  __kind__: ExpressionKind.Literal;
  __value__: any;
}>;
