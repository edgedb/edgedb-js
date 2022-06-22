import {
  Expression,
  ExpressionKind,
  BaseType,
  TypeSet,
  Cardinality,
} from "../reflection/index";
import {$expressionify} from "./path";
import type {orScalarLiteral} from "@generated/castMaps";
import {literalToTypeSet} from "@generated/castMaps";

export function cast<Target extends BaseType>(
  target: Target,
  arg: null
): $expr_Cast<Target, TypeSet<Target, Cardinality.Empty>>;
export function cast<Target extends BaseType, Expr extends TypeSet>(
  target: Target,
  expr: orScalarLiteral<Expr>
): $expr_Cast<Target, Expr>;
export function cast(target: BaseType, expr: any) {
  const cleanedExpr = expr === null ? null : literalToTypeSet(expr);
  return $expressionify({
    __element__: target,
    __cardinality__:
      cleanedExpr === null ? Cardinality.Empty : cleanedExpr.__cardinality__,
    __expr__: cleanedExpr,
    __kind__: ExpressionKind.Cast,
  }) as any;
}

export type $expr_Cast<
  Target extends BaseType = BaseType,
  Expr extends TypeSet = TypeSet
> = Expression<{
  __element__: Target;
  __cardinality__: Expr["__cardinality__"];
  __kind__: ExpressionKind.Cast;
  __expr__: Expr | null;
}>;
