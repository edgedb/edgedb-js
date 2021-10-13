import {dts, r, t, ts} from "../builders";
import {GeneratorParams} from "../generate";
import {getImplicitCastableRootTypes} from "../util/functionUtils";
import {getStringRepresentation} from "./generateObjectTypes";

export const generateSetImpl = ({dir, types, casts}: GeneratorParams) => {
  const code = dir.getPath("syntax/setImpl");

  const implicitCastableRootTypes = getImplicitCastableRootTypes(casts);

  code.addImport(
    {
      TypeKind: true,
      ExpressionKind: true,
      Cardinality: true,
      cardinalityUtil: true,
      mergeObjectTypes: true,
    },
    "edgedb/dist/reflection"
  );
  code.addImport({getSharedParentScalar: true}, "../castMaps", ["ts", "js"]);
  code.addImport({$expressionify: true}, "./path", ["ts", "js"]);

  code.writeln([
    t`import type {
  ArrayType,
  TypeSet,
  BaseType,
  ObjectTypeSet,
  PrimitiveTypeSet,
  AnyTupleType,
} from "edgedb/dist/reflection";
import type {
  $expr_Set,
  mergeObjectTypesVariadic,
  getTypesFromExprs,
  getTypesFromObjectExprs,
  getCardsFromExprs,
  getSharedParentPrimitiveVariadic,
  getPrimitiveBaseType,
  LooseTypeSet,
} from "./set";`,
  ]);

  code.writeln([
    dts`declare `,
    t`type getSetTypeFromExprs<
  Exprs extends [TypeSet, ...TypeSet[]]
> = LooseTypeSet<
  getSharedParentPrimitiveVariadic<getTypesFromExprs<Exprs>>,
  cardinalityUtil.mergeCardinalitiesVariadic<getCardsFromExprs<Exprs>>
>;`,
  ]);

  code.writeln([
    dts`declare `,
    t`function set<Type extends BaseType>(
  type: Type
): $expr_Set<TypeSet<Type, Cardinality.Empty>>;
`,
    dts`declare `,
    t`function set<
  Expr extends TypeSet
>(expr: Expr): $expr_Set<Expr>;`,
  ]);

  for (const implicitRootTypeId of implicitCastableRootTypes) {
    code.writeln([
      dts`declare `,
      t`function set<
  Expr extends TypeSet<${
    getStringRepresentation(types.get(implicitRootTypeId), {
      types,
      casts: casts.implicitCastFromMap,
    }).staticType
  }>,
  Exprs extends [Expr, ...Expr[]]
>(...exprs: Exprs): $expr_Set<getSetTypeFromExprs<Exprs>>;`,
    ]);

    code.writeln([
      dts`declare `,
      t`function set<
  Expr extends TypeSet<ArrayType<${
    getStringRepresentation(types.get(implicitRootTypeId), {
      types,
      casts: casts.implicitCastFromMap,
    }).staticType
  }>>,
  Exprs extends [Expr, ...Expr[]]
>(...exprs: Exprs): $expr_Set<getSetTypeFromExprs<Exprs>>;`,
    ]);
  }

  code.writeln([
    dts`declare `,
    t`function set<
  Expr extends ObjectTypeSet,
  Exprs extends [Expr, ...Expr[]]
>(
  ...exprs: Exprs
): $expr_Set<
  LooseTypeSet<
    mergeObjectTypesVariadic<getTypesFromObjectExprs<Exprs>>,
    cardinalityUtil.mergeCardinalitiesVariadic<getCardsFromExprs<Exprs>>
  >
>;
`,
    dts`declare `,
    t`function set<
  Expr extends TypeSet<AnyTupleType>,
  Exprs extends [Expr, ...Expr[]]
>(...exprs: Exprs): $expr_Set<getSetTypeFromExprs<Exprs>>;
`,
    dts`declare `,
    t`function set<
  Expr extends PrimitiveTypeSet,
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
>;`,
  ]);

  code.writeln([
    r`function set(..._exprs`,
    ts`: any[]`,
    r`) {
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
    const element`,
    ts`: BaseType`,
    r` = _exprs[0]`,
    ts` as any`,
    r`;
    return $expressionify({
      __kind__: ExpressionKind.Set,
      __element__: element,
      __cardinality__: Cardinality.Empty,
      __exprs__: [],
    })`,
    ts` as any`,
    r`;
  }
  const exprs`,
    ts`: TypeSet[]`,
    r` = _exprs;
  if (exprs.every((expr) => expr.__element__.__kind__ === TypeKind.object)) {
    // merge object types;
    return $expressionify({
      __kind__: ExpressionKind.Set,
      __element__: exprs
        .map((expr) => expr.__element__`,
    ts` as any`,
    r`)
        .reduce(mergeObjectTypes),
      __cardinality__: cardinalityUtil.mergeCardinalitiesVariadic(
        exprs.map((expr) => expr.__cardinality__)`,
    ts` as any`,
    r`
      ),
      __exprs__: exprs,
    })`,
    ts` as any`,
    r`;
  }
  if (exprs.every((expr) => expr.__element__.__kind__ !== TypeKind.object)) {
    return $expressionify({
      __kind__: ExpressionKind.Set,
      __element__: exprs
        .map((expr) => expr.__element__`,
    ts` as any`,
    r`)
        .reduce(getSharedParentScalar),
      __cardinality__: cardinalityUtil.mergeCardinalitiesVariadic(
        exprs.map((expr) => expr.__cardinality__)`,
    ts` as any`,
    r`
      ),
      __exprs__: exprs,
    })`,
    ts` as any`,
    r`;
  }
  throw new Error(
    \`Invalid arguments to set constructor: \${(_exprs`,
    ts` as TypeSet[]`,
    r`)
      .map((expr) => expr.__element__.__name__)
      .join(", ")}\`
  );
}`,
  ]);

  code.addExport("set");
};
