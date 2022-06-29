import {
  Expression,
  ExpressionKind,
  BaseType,
  Cardinality,
} from "../reflection/index";
import {$expressionify} from "./path";

export function makeGlobal<
  Name extends string,
  Type extends BaseType,
  Card extends Cardinality
>(name: Name, type: Type, card: Card): $expr_Global<Name, Type, Card> {
  return $expressionify({
    __name__: name,
    __element__: type,
    __cardinality__: card,
    __kind__: ExpressionKind.Global,
  });
}

export type $expr_Global<
  Name extends string = string,
  Type extends BaseType = BaseType,
  Card extends Cardinality = Cardinality
> = Expression<{
  __name__: Name;
  __element__: Type;
  __cardinality__: Card;
  __kind__: ExpressionKind.Global;
}>;
