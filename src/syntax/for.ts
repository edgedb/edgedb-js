import {
  BaseExpression,
  Expression,
  MaterialType,
  TypeSet,
  Cardinality,
  ExpressionKind,
  cardinalityUtil,
} from "../reflection";
import {$expressionify} from "./path";

export type $expr_For<ReturnType extends TypeSet = TypeSet> = Expression<{
  __element__: ReturnType["__element__"];
  __cardinality__: ReturnType["__cardinality__"];
  __kind__: ExpressionKind.For;
}>;

export type $runtimeExpr_For = $expr_For & {
  __iterSet__: TypeSet;
  __forVar__: $expr_ForVar;
  __expr__: BaseExpression;
};

export type $expr_ForVar<Type extends MaterialType = MaterialType> =
  Expression<{
    __element__: Type;
    __cardinality__: Cardinality.One;
    __kind__: ExpressionKind.ForVar;
  }>;

function _for<IteratorSet extends TypeSet, Expr extends BaseExpression>(
  set: IteratorSet,
  expr: (variable: $expr_ForVar<IteratorSet["__element__"]>) => Expr
): $expr_For<{
  __element__: Expr["__element__"];
  __cardinality__: cardinalityUtil.multiplyCardinalities<
    IteratorSet["__cardinality__"],
    Expr["__cardinality__"]
  >;
}> {
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
  }) as $runtimeExpr_For as any;
}

export {_for as for};
