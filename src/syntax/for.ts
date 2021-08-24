import {
  BaseExpression,
  Expression,
  MaterialType,
  MaterialTypeSet,
  Cardinality,
  ExpressionKind,
  cardinalityUtil,
} from "reflection";
import {$expressionify} from "./path";

export type $expr_For<
  IterSet extends MaterialTypeSet = MaterialTypeSet,
  Expr extends BaseExpression = BaseExpression
> = Expression<{
  __element__: Expr["__element__"];
  __cardinality__: cardinalityUtil.multiplyCardinalities<
    IterSet["__cardinality__"],
    Expr["__cardinality__"]
  >;
  __kind__: ExpressionKind.For;
  __iterSet__: IterSet;
  __forVar__: $expr_ForVar;
  __expr__: Expr;
}>;

export type $expr_ForVar<Type extends MaterialType = MaterialType> =
  Expression<{
    __element__: Type;
    __cardinality__: Cardinality.One;
    __kind__: ExpressionKind.ForVar;
  }>;

function _for<
  IteratorSet extends MaterialTypeSet,
  Expr extends BaseExpression
>(
  set: IteratorSet,
  expr: (variable: $expr_ForVar<IteratorSet["__element__"]>) => Expr
): $expr_For<IteratorSet, Expr> {
  const forVar = $expressionify({
    __kind__: ExpressionKind.ForVar,
    __element__: set.__element__,
    __cardinality__: Cardinality.One,
  }) as $expr_ForVar<IteratorSet["__element__"]>;

  const returnExpr = expr(forVar);

  return $expressionify({
    __kind__: ExpressionKind.For,
    __element__: returnExpr.__element__,
    __cardinality__: cardinalityUtil.multiplyCardinalities(
      set.__cardinality__,
      returnExpr.__cardinality__
    ),
    __iterSet__: set,
    __expr__: returnExpr,
    __forVar__: forVar,
  }) as $expr_For<IteratorSet, Expr>;
}

export {_for as for};
