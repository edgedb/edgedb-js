import {
  BaseExpression,
  MaterialType,
  MaterialTypeSet,
  Cardinality,
  ExpressionKind,
  introspect,
  makeType,
  TypeKind,
  ArrayType,
  cardinalityUtil,
  TypeSet,
} from "reflection";
import {toEdgeQL} from "./toEdgeQL";

export type $expr_For<
  IterSet extends MaterialTypeSet = MaterialTypeSet,
  Expr extends BaseExpression = BaseExpression
> = BaseExpression<{
  __element__: Expr["__element__"];
  __cardinality__: Expr["__cardinality__"];
}> & {
  __kind__: ExpressionKind.For;
  __iterSet__: IterSet;
  __forVar__: $expr_ForVar;
  __expr__: Expr;
};

export type $expr_ForVar<
  Type extends MaterialType = MaterialType
> = BaseExpression<{
  __element__: Type;
  __cardinality__: Cardinality.One;
}> & {
  __kind__: ExpressionKind.ForVar;
  __id__: number;
};

let forVarId = 0;

function _for<
  IteratorSet extends MaterialTypeSet,
  Expr extends BaseExpression
>(
  set: IteratorSet,
  expr: (variable: $expr_ForVar<IteratorSet["__element__"]>) => Expr
): $expr_For<IteratorSet, Expr> {
  const forVar: $expr_ForVar<IteratorSet["__element__"]> = {
    __kind__: ExpressionKind.ForVar,
    __id__: forVarId++,
    __element__: set.__element__,
    __cardinality__: Cardinality.One,
    toEdgeQL,
  };

  const returnExpr = expr(forVar);

  return {
    __kind__: ExpressionKind.For,
    __element__: returnExpr.__element__,
    __cardinality__: returnExpr.__cardinality__,
    __iterSet__: set,
    __expr__: returnExpr,
    __forVar__: forVar,
    toEdgeQL,
  };
}

export {_for as for};
