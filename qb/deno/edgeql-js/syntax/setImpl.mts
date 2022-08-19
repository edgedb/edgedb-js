import { $ } from "edgedb";
import * as castMaps from "../castMaps.mjs";
import { $expressionify } from "./path.mjs";
import type { $expr_Set, mergeObjectTypesVariadic, getTypesFromExprs, getTypesFromObjectExprs, getCardsFromExprs, getSharedParentPrimitiveVariadic, LooseTypeSet } from "./set.mjs";
import { getSharedParent } from "./set.mjs";
import type * as _cal from "../modules/cal.mjs";
import type * as _std from "../modules/std.mjs";

type getSetTypeFromExprs<
  Exprs extends [$.TypeSet, ...$.TypeSet[]]
> = LooseTypeSet<
  getSharedParentPrimitiveVariadic<getTypesFromExprs<Exprs>>,
  $.cardinalityUtil.mergeCardinalitiesVariadic<getCardsFromExprs<Exprs>>
>;

function set(): null;
function set<
  Expr extends castMaps.orScalarLiteral<$.TypeSet>
>(expr: Expr): $expr_Set<castMaps.literalToTypeSet<Expr>>;
function set<
  Expr extends castMaps.orScalarLiteral<$.TypeSet<_cal.$relative_durationλICastableTo>>,
  Exprs extends [Expr, ...Expr[]]
>(...exprs: Exprs): $expr_Set<getSetTypeFromExprs<castMaps.mapLiteralToTypeSet<Exprs>>>;
function set<
  Expr extends $.TypeSet<$.ArrayType<_cal.$relative_durationλICastableTo>>,
  Exprs extends [Expr, ...Expr[]]
>(...exprs: Exprs): $expr_Set<getSetTypeFromExprs<Exprs>>;
function set<
  Expr extends castMaps.orScalarLiteral<$.TypeSet<_cal.$local_datetimeλICastableTo>>,
  Exprs extends [Expr, ...Expr[]]
>(...exprs: Exprs): $expr_Set<getSetTypeFromExprs<castMaps.mapLiteralToTypeSet<Exprs>>>;
function set<
  Expr extends $.TypeSet<$.ArrayType<_cal.$local_datetimeλICastableTo>>,
  Exprs extends [Expr, ...Expr[]]
>(...exprs: Exprs): $expr_Set<getSetTypeFromExprs<Exprs>>;
function set<
  Expr extends castMaps.orScalarLiteral<$.TypeSet<_std.$decimalλICastableTo>>,
  Exprs extends [Expr, ...Expr[]]
>(...exprs: Exprs): $expr_Set<getSetTypeFromExprs<castMaps.mapLiteralToTypeSet<Exprs>>>;
function set<
  Expr extends $.TypeSet<$.ArrayType<_std.$decimalλICastableTo>>,
  Exprs extends [Expr, ...Expr[]]
>(...exprs: Exprs): $expr_Set<getSetTypeFromExprs<Exprs>>;
function set<
  Expr extends $.ObjectTypeSet,
  Exprs extends [Expr, ...Expr[]]
>(
  ...exprs: Exprs
): $expr_Set<
  LooseTypeSet<
    mergeObjectTypesVariadic<getTypesFromObjectExprs<Exprs>>,
    $.cardinalityUtil.mergeCardinalitiesVariadic<getCardsFromExprs<Exprs>>
  >
>;
function set<
  Expr extends $.TypeSet<$.AnyTupleType>,
  Exprs extends [Expr, ...Expr[]]
>(...exprs: Exprs): $expr_Set<getSetTypeFromExprs<Exprs>>;
function set<
  Expr extends $.TypeSet<$.BaseType> | castMaps.scalarLiterals,
  Exprs extends castMaps.orScalarLiteral<
    $.TypeSet<$.getPrimitiveBaseType<castMaps.literalToTypeSet<Expr>["__element__"]>>
  >[]
>(
  expr: Expr,
  ...exprs: Exprs
): $expr_Set<
  $.TypeSet<
    $.getPrimitiveBaseType<castMaps.literalToTypeSet<Expr>["__element__"]>,
    $.cardinalityUtil.mergeCardinalitiesVariadic<
      getCardsFromExprs<castMaps.mapLiteralToTypeSet<[Expr, ...Exprs]>>
    >
  >
>;
function set<Expr extends $.TypeSet<$.BaseType> | castMaps.scalarLiterals>(
  ...exprs: Expr[]
): $expr_Set<
  $.TypeSet<
    $.getPrimitiveBaseType<castMaps.literalToTypeSet<Expr>["__element__"]>,
    $.Cardinality.Many
  >
>;
function set(..._exprs: any[]) {
  // if no arg
  // if arg
  //   return empty set
  // if object set
  //   merged objects
  // if primitive
  //   return shared parent of scalars
  if(_exprs.length === 0){
    return null;
  }

  const exprs: $.TypeSet[] = _exprs.map(expr => castMaps.literalToTypeSet(expr));

  return $expressionify({
    __kind__: $.ExpressionKind.Set,
    __element__: exprs
      .map(expr => expr.__element__ as any)
      .reduce(getSharedParent),
    __cardinality__: $.cardinalityUtil.mergeCardinalitiesVariadic(
      exprs.map(expr => expr.__cardinality__) as any
    ),
    __exprs__: exprs,
  }) as any;

}


export { set };
