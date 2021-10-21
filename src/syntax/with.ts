import {
  Expression,
  ExpressionKind,
  QueryableExpression,
  TypeSet,
} from "../reflection";
import {$expr_Select} from "./select";
import {$expr_For} from "./for";
import {$expr_Insert} from "./insert";
import {$expr_Update} from "./update";
import {$expressionify} from "./path";
import {$queryify} from "./query";

export type $expr_Alias<Expr extends TypeSet = TypeSet> = Expression<{
  __element__: Expr["__element__"];
  __cardinality__: Expr["__cardinality__"];
  __kind__: ExpressionKind.Alias;
  __expr__: Expr;
}>;

export function alias<Expr extends Expression>(expr: Expr): $expr_Alias<Expr> {
  return $expressionify({
    __kind__: ExpressionKind.Alias,
    __element__: expr.__element__,
    __cardinality__: expr.__cardinality__,
    __expr__: expr,
  });
}

export type WithableExpression =
  | $expr_Select
  | $expr_For
  | $expr_Insert
  | $expr_Update;

export type $expr_With<
  Refs extends TypeSet[] = TypeSet[],
  Expr extends WithableExpression = WithableExpression
> = QueryableExpression<{
  __element__: Expr["__element__"];
  __cardinality__: Expr["__cardinality__"];
  __kind__: ExpressionKind.With;
  __expr__: Expr;
  __refs__: Refs;
}>;

function _with<Refs extends Expression[], Expr extends WithableExpression>(
  refs: Refs,
  expr: Expr
): $expr_With<Refs, Expr> {
  return $expressionify(
    $queryify({
      __kind__: ExpressionKind.With,
      __element__: expr.__element__,
      __cardinality__: expr.__cardinality__,
      __refs__: refs,
      __expr__: expr as any,
    })
  ) as any;
}

export {_with as with};
