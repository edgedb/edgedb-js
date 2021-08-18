import {BaseExpression, ExpressionKind, MaterialTypeSet} from "../reflection";
import {$expr_Select} from "./select";
import {$expr_For} from "./for";
import {toEdgeQL} from "./toEdgeQL";

export type $expr_Alias<Expr extends BaseExpression = BaseExpression> =
  BaseExpression<{
    __element__: Expr["__element__"];
    __cardinality__: Expr["__cardinality__"];
  }> & {
    __kind__: ExpressionKind.Alias;
    __expr__: Expr;
  };

export function alias<Expr extends BaseExpression>(
  expr: Expr
): $expr_Alias<Expr> {
  return {
    __kind__: ExpressionKind.Alias,
    __element__: expr.__element__,
    __cardinality__: expr.__cardinality__,
    __expr__: expr,
    toEdgeQL,
  };
}

type WithableExpression = $expr_Select | $expr_For; // insert | update | delete

export type $expr_With<
  Refs extends BaseExpression[] = BaseExpression[],
  Expr extends WithableExpression = WithableExpression
> = BaseExpression<Expr> & {
  __kind__: ExpressionKind.With;
  __expr__: Expr;
  __refs__: Refs;
};

function _with<Refs extends BaseExpression[], Expr extends WithableExpression>(
  refs: Refs,
  expr: Expr
): $expr_With<Refs, Expr> {
  return {
    __kind__: ExpressionKind.With,
    __element__: expr.__element__,
    __cardinality__: expr.__cardinality__,
    __refs__: refs,
    __expr__: expr,
    toEdgeQL,
  };
}

export {_with as with};
