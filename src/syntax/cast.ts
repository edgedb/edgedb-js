import {
  BaseExpression,
  Expression,
  ExpressionKind,
  makeSet,
  MaterialType,
} from "reflection";
import {$pathify} from "./path";
import {toEdgeQL} from "./toEdgeQL";

export function cast<Target extends MaterialType, Expr extends BaseExpression>(
  target: Target,
  expr: Expr
): $expr_Cast<Target, Expr> {
  return $pathify({
    __element__: target,
    __cardinality__: expr.__cardinality__,
    __expr__: expr,
    __kind__: ExpressionKind.Cast,
    toEdgeQL,
  }) as any;
}

export type $expr_Cast<
  Target extends MaterialType = MaterialType,
  Expr extends BaseExpression = BaseExpression
> = Expression<{
  __element__: Target;
  __cardinality__: Expr["__cardinality__"];
  __kind__: ExpressionKind.Cast;
  __expr__: Expr;
}>;
