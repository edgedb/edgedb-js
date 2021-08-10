import {GeneratorParams} from "../generate";
import {getImplicitCastableRootTypes} from "../util/functionUtils";
import {frag} from "../util/genutil";
import {getStringRepresentation} from "./generateObjectTypes";

export const generateSetImpl = ({dir, types, casts}: GeneratorParams) => {
  const code = dir.getPath("syntax/setImpl.ts");

  const implicitCastableRootTypes = getImplicitCastableRootTypes(casts);

  code.addImport(`import {
  ArrayType,
  makeSet,
  MaterialType,
  ObjectTypeExpression,
  PrimitiveExpression,
  TypeSet,
  TypeKind,
  BaseExpression,
  ExpressionKind,
  cardinalityUtil,
  mergeObjectTypes,
  Cardinality,
  AnyTupleType,
} from "edgedb/src/reflection";

import {getSharedParentScalar} from "../castMaps";
import {$pathify} from "./path";
import {toEdgeQL} from "./toEdgeQL";

import {
  $expr_Set,
  mergeObjectTypesVariadic,
  getTypesFromExprs,
  getTypesFromObjectExprs,
  getCardsFromExprs,
  getSharedParentPrimitiveVariadic,
} from "./set";
`);

  code.writeln(frag`type getSetTypeFromExprs<Exprs extends [BaseExpression, ...BaseExpression[]]> =
makeSet<
  getSharedParentPrimitiveVariadic<getTypesFromExprs<Exprs>>,
  cardinalityUtil.mergeCardinalitiesVariadic<getCardsFromExprs<Exprs>>
>;

export function set<Type extends MaterialType>(
  type: Type
): $expr_Set<makeSet<Type, Cardinality.Empty>>;
export function set<
  Expr extends BaseExpression<TypeSet<_std.$str>>,
  Exprs extends [Expr, ...Expr[]]
>(...exprs: Exprs): $expr_Set<getSetTypeFromExprs<Exprs>>;`);

  for (const implicitRootTypeId of implicitCastableRootTypes) {
    code.writeln(frag`export function set<
  Expr extends BaseExpression<TypeSet<${
    getStringRepresentation(types.get(implicitRootTypeId), {
      types,
      casts: casts.implicitCastFromMap,
    }).staticType
  }>>,
  Exprs extends [Expr, ...Expr[]]
>(...exprs: Exprs): $expr_Set<getSetTypeFromExprs<Exprs>>;`);
    code.writeln(frag`export function set<
  Expr extends BaseExpression<TypeSet<ArrayType<${
    getStringRepresentation(types.get(implicitRootTypeId), {
      types,
      casts: casts.implicitCastFromMap,
    }).staticType
  }>>>,
  Exprs extends [Expr, ...Expr[]]
>(...exprs: Exprs): $expr_Set<getSetTypeFromExprs<Exprs>>;`);
  }

  code.writeln(frag`export function set<
  Expr extends ObjectTypeExpression,
  Exprs extends [Expr, ...Expr[]]
>(
  ...exprs: Exprs
): $expr_Set<
  makeSet<
    mergeObjectTypesVariadic<getTypesFromObjectExprs<Exprs>>,
    cardinalityUtil.mergeCardinalitiesVariadic<getCardsFromExprs<Exprs>>
  >
>;
export function set<
  Expr extends BaseExpression<TypeSet<AnyTupleType>>,
  Exprs extends [Expr, ...Expr[]]
>(...exprs: Exprs): $expr_Set<getSetTypeFromExprs<Exprs>>;
export function set<Expr extends PrimitiveExpression, Exprs extends Expr[]>(
  expr: Expr,
  ...exprs: Exprs
): $expr_Set<
  makeSet<
    Expr["__element__"],
    cardinalityUtil.mergeCardinalitiesVariadic<
      getCardsFromExprs<[Expr, ...Exprs]>
    >
  >
>;`);

  code.writeln([
    `export function set(..._exprs: any[]) {
  // if arg
  //   return empty set
  // if object set
  //   merged objects
  // if primitive
  //   return shared parent of scalars
  if (
    _exprs.length === 1 &&
    Object.values(TypeKind).includes(_exprs[0].__kind__)
  ) {
    const element: MaterialType = _exprs[0] as any;
    return $pathify({
      __kind__: ExpressionKind.Set,
      __element__: element,
      __cardinality__: Cardinality.Empty,
      toEdgeQL,
      __exprs__: [],
    }) as any;
  }
  const exprs: BaseExpression[] = _exprs;
  if (exprs.every((expr) => expr.__element__.__kind__ === TypeKind.object)) {
    // merge object types;
    return $pathify({
      __kind__: ExpressionKind.Set,
      __element__: exprs
        .map((expr) => expr.__element__ as any)
        .reduce(mergeObjectTypes),
      __cardinality__: cardinalityUtil.mergeCardinalitiesVariadic(
        exprs.map((expr) => expr.__cardinality__) as any
      ),
      toEdgeQL,
      __exprs__: exprs,
    }) as any;
  }
  if (exprs.every((expr) => expr.__element__.__kind__ !== TypeKind.object)) {
    return {
      __kind__: ExpressionKind.Set,
      __element__: exprs
        .map((expr) => expr.__element__ as any)
        .reduce(getSharedParentScalar),
      __cardinality__: cardinalityUtil.mergeCardinalitiesVariadic(
        exprs.map((expr) => expr.__cardinality__) as any
      ),
      toEdgeQL,
      __exprs__: exprs,
    } as $expr_Set;
  }
  throw new Error(
    ${
      "`Invalid arguments to set constructor: ${(_exprs as BaseExpression[])\n" +
      "      .map((expr) => expr.__element__.__name__)\n" +
      '      .join(", ")}`'
    }
  );
}`,
  ]);
};
