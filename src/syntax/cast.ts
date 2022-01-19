import {
  Expression,
  ExpressionKind,
  BaseType,
  CastableNonArrayType,
  CastableArrayType,
  unwrapCastableType,
  TypeSet,
} from "../reflection";
import {$expressionify} from "./path";

export function cast<
  Target extends CastableNonArrayType | CastableArrayType,
  Expr extends TypeSet
>(target: Target, expr: Expr): $expr_Cast<Target, Expr> {
  return $expressionify({
    __element__: target,
    __cardinality__: expr.__cardinality__,
    __expr__: expr,
    __kind__: ExpressionKind.Cast,
  }) as any;
}

export type $expr_Cast<
  Target extends BaseType = BaseType,
  Expr extends TypeSet = TypeSet
> = Expression<{
  __element__: unwrapCastableType<Target>;
  __cardinality__: Expr["__cardinality__"];
  __kind__: ExpressionKind.Cast;
  __expr__: Expr;
}>;
