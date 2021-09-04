import {Expression, ExpressionKind, BaseType} from "../reflection";
import {$expressionify} from "./path";

export function cast<Target extends BaseType, Expr extends Expression>(
  target: Target,
  expr: Expr
): $expr_Cast<Target, Expr> {
  return $expressionify({
    __element__: target,
    __cardinality__: expr.__cardinality__,
    __expr__: expr,
    __kind__: ExpressionKind.Cast,
  });
}

export type $expr_Cast<
  Target extends BaseType = BaseType,
  Expr extends Expression = Expression
> = Expression<{
  __element__: Target;
  __cardinality__: Expr["__cardinality__"];
  __kind__: ExpressionKind.Cast;
  __expr__: Expr;
}>;
