import {GeneratorParams} from "../generate";
import {getImplicitCastableRootTypes} from "../util/functionUtils";
import {frag} from "../util/genutil";
import {getStringRepresentation} from "./generateObjectTypes";

export const generateSetImpl = ({dir, types, casts}: GeneratorParams) => {
  const code = dir.getPath("syntax/setImpl.ts");

  const implicitCastableRootTypes = getImplicitCastableRootTypes(casts);

  code.addImport(`import {
  ArrayType,
  TypeSet,
  MaterialType,
  ObjectTypeExpression,
  PrimitiveExpression,
  TypeKind,
  BaseExpression,
  Expression,
  ExpressionKind,
  cardinalityUtil,
  mergeObjectTypes,
  Cardinality,
  AnyTupleType,
} from "edgedb/src/reflection";

import {getSharedParentScalar} from "../castMaps";
import {$expressionify} from "./path";

import {
  $expr_Set,
  mergeObjectTypesVariadic,
  getTypesFromExprs,
  getTypesFromObjectExprs,
  getCardsFromExprs,
  getSharedParentPrimitiveVariadic,
  getPrimitiveBaseType,
  LooseTypeSet
} from "./set";
`);

  code.writeln(frag`type getSetTypeFromExprs<
  Exprs extends [TypeSet, ...TypeSet[]]
> = LooseTypeSet<
  getSharedParentPrimitiveVariadic<getTypesFromExprs<Exprs>>,
  cardinalityUtil.mergeCardinalitiesVariadic<getCardsFromExprs<Exprs>>
>;

export function set<Type extends MaterialType>(
  type: Type
): $expr_Set<TypeSet<Type, Cardinality.Empty>>;
export function set<
  Expr extends TypeSet
>(expr: Expr): $expr_Set<Expr>;`);

  for (const implicitRootTypeId of implicitCastableRootTypes) {
    code.writeln(frag`export function set<
  Expr extends TypeSet<${
    getStringRepresentation(types.get(implicitRootTypeId), {
      types,
      casts: casts.implicitCastFromMap,
    }).staticType
  }>,
  Exprs extends [Expr, ...Expr[]]
>(...exprs: Exprs): $expr_Set<getSetTypeFromExprs<Exprs>>;`);
    code.writeln(frag`export function set<
  Expr extends TypeSet<ArrayType<${
    getStringRepresentation(types.get(implicitRootTypeId), {
      types,
      casts: casts.implicitCastFromMap,
    }).staticType
  }>>,
  Exprs extends [Expr, ...Expr[]]
>(...exprs: Exprs): $expr_Set<getSetTypeFromExprs<Exprs>>;`);
  }

  code.writeln(frag`export function set<
  Expr extends ObjectTypeExpression,
  Exprs extends [Expr, ...Expr[]]
>(
  ...exprs: Exprs
): $expr_Set<
  LooseTypeSet<
    mergeObjectTypesVariadic<getTypesFromObjectExprs<Exprs>>,
    cardinalityUtil.mergeCardinalitiesVariadic<getCardsFromExprs<Exprs>>
  >
>;
export function set<
  Expr extends TypeSet<AnyTupleType>,
  Exprs extends [Expr, ...Expr[]]
>(...exprs: Exprs): $expr_Set<getSetTypeFromExprs<Exprs>>;
export function set<
  Expr extends PrimitiveExpression,
  Exprs extends
    TypeSet<getPrimitiveBaseType<Expr["__element__"]>>[]
>(
  expr: Expr,
  ...exprs: Exprs
): $expr_Set<
  TypeSet<
    getPrimitiveBaseType<Expr["__element__"]>,
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
    return $expressionify({
      __kind__: ExpressionKind.Set,
      __element__: element,
      __cardinality__: Cardinality.Empty,
      __exprs__: [],
    }) as any;
  }
  const exprs: TypeSet[] = _exprs;
  if (exprs.every((expr) => expr.__element__.__kind__ === TypeKind.object)) {
    // merge object types;
    return $expressionify({
      __kind__: ExpressionKind.Set,
      __element__: exprs
        .map((expr) => expr.__element__ as any)
        .reduce(mergeObjectTypes),
      __cardinality__: cardinalityUtil.mergeCardinalitiesVariadic(
        exprs.map((expr) => expr.__cardinality__) as any
      ),
      __exprs__: exprs,
    }) as any;
  }
  if (exprs.every((expr) => expr.__element__.__kind__ !== TypeKind.object)) {
    return $expressionify({
      __kind__: ExpressionKind.Set,
      __element__: exprs
        .map((expr) => expr.__element__ as any)
        .reduce(getSharedParentScalar),
      __cardinality__: cardinalityUtil.mergeCardinalitiesVariadic(
        exprs.map((expr) => expr.__cardinality__) as any
      ),
      __exprs__: exprs,
    }) as any;
  }
  throw new Error(
    ${
      "`Invalid arguments to set constructor: ${(_exprs as TypeSet[])\n" +
      "      .map((expr) => expr.__element__.__name__)\n" +
      '      .join(", ")}`'
    }
  );
}`,
  ]);
};
