import {
  BaseExpression,
  ExpressionKind,
  TypeSet,
  Expression,
} from "../reflection";
import {$expr_Select, $runtimeExpr_Select} from "./select";
import {$expr_For, $runtimeExpr_For} from "./for";
import {$expr_Insert} from "./insert";
import {$expr_Update} from "./update";
import {$expressionify} from "./path";

export type $expr_Alias<Expr extends TypeSet = TypeSet> = Expression<{
  __element__: Expr["__element__"];
  __cardinality__: Expr["__cardinality__"];
  __kind__: ExpressionKind.Alias;
}>;

export type $runtimeExpr_Alias = $expr_Alias & {
  __expr__: BaseExpression;
};

export function alias<Expr extends BaseExpression>(
  expr: Expr
): $expr_Alias<Expr> {
  return $expressionify({
    __kind__: ExpressionKind.Alias,
    __element__: expr.__element__,
    __cardinality__: expr.__cardinality__,
    __expr__: expr,
  });
}

export type WithableExpression = TypeSet & {
  __kind__:
    | ExpressionKind.Select
    | ExpressionKind.For
    | ExpressionKind.Insert
    | ExpressionKind.Update;
};
// | $expr_Select
// | $expr_For
// | $expr_Insert
// | $expr_Update;

export type WithableRuntimeExpression =
  | $runtimeExpr_Select
  | $runtimeExpr_For
  | $expr_Insert
  | $expr_Update;

export type $expr_With<Expr extends WithableExpression = WithableExpression> =
  Expression<{
    __element__: Expr["__element__"];
    __cardinality__: Expr["__cardinality__"];
    __kind__: ExpressionKind.With;
  }>;

export type $runtimeExpr_With = $expr_With & {
  __expr__: WithableRuntimeExpression;
  __refs__: BaseExpression[];
};

function _with<Refs extends BaseExpression[], Expr extends WithableExpression>(
  refs: Refs,
  expr: Expr
): $expr_With<Expr> {
  return $expressionify({
    __kind__: ExpressionKind.With,
    __element__: expr.__element__,
    __cardinality__: expr.__cardinality__,
    __refs__: refs,
    __expr__: expr as any,
  });
}

export {_with as with};
