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
      $mergeObjectTypes: true,
    },
    "edgedb/dist/reflection/index",
    true
  );
  code.addStarImport("castMaps", "../castMaps", true, ["ts", "js", "dts"]);
  code.addImport({$expressionify: true}, "./path", true, ["ts", "js"]);

  code.writeln([
    t`import type {
  ArrayType,
  TypeSet,
  BaseType,
  ObjectTypeSet,
  PrimitiveTypeSet,
  AnyTupleType,
  getPrimitiveBaseType,
} from "edgedb/dist/reflection";
import type {
  $expr_Set,
  mergeObjectTypesVariadic,
  getTypesFromExprs,
  getTypesFromObjectExprs,
  getCardsFromExprs,
  getSharedParentPrimitiveVariadic,
  LooseTypeSet,
} from "./set";`,
  ]);

  code.nl();
  code.writeln([
    dts`declare `,
    t`type getSetTypeFromExprs<
  Exprs extends [TypeSet, ...TypeSet[]]
> = LooseTypeSet<
  getSharedParentPrimitiveVariadic<getTypesFromExprs<Exprs>>,
  cardinalityUtil.mergeCardinalitiesVariadic<getCardsFromExprs<Exprs>>
>;`,
  ]);
  code.nl();

  code.writeln([dts`declare `, t`function set(): null;`]);

  code.writeln([
    dts`declare `,
    t`function set<
  Expr extends castMaps.orScalarLiteral<TypeSet>
>(expr: Expr): $expr_Set<castMaps.literalToTypeSet<Expr>>;`,
  ]);

  for (const implicitRootTypeId of implicitCastableRootTypes) {
    code.writeln([
      dts`declare `,
      t`function set<
  Expr extends castMaps.orScalarLiteral<TypeSet<${
    getStringRepresentation(types.get(implicitRootTypeId), {
      types,
      casts: casts.implicitCastFromMap,
    }).staticType
  }>>,
  Exprs extends [Expr, ...Expr[]]
>(...exprs: Exprs): $expr_Set<getSetTypeFromExprs<castMaps.mapLiteralToTypeSet<Exprs>>>;`,
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
  Expr extends TypeSet<BaseType> | castMaps.scalarLiterals,
  Exprs extends castMaps.orScalarLiteral<
    TypeSet<getPrimitiveBaseType<castMaps.literalToTypeSet<Expr>["__element__"]>>
  >[]
>(
  expr: Expr,
  ...exprs: Exprs
): $expr_Set<
  TypeSet<
    getPrimitiveBaseType<castMaps.literalToTypeSet<Expr>["__element__"]>,
    cardinalityUtil.mergeCardinalitiesVariadic<
      getCardsFromExprs<castMaps.mapLiteralToTypeSet<[Expr, ...Exprs]>>
    >
  >
>;
`,
    dts`declare `,
    t`function set<Expr extends TypeSet<BaseType> | castMaps.scalarLiterals>(
  ...exprs: Expr[]
): $expr_Set<
  TypeSet<
    getPrimitiveBaseType<castMaps.literalToTypeSet<Expr>["__element__"]>,
    Cardinality.Many
  >
>;`,
  ]);

  code.writeln([
    r`function set(..._exprs`,
    ts`: any[]`,
    r`) {
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

  const exprs`,
    ts`: TypeSet[]`,
    r` = _exprs.map(expr => castMaps.literalToTypeSet(expr));
  if (exprs.every((expr) => expr.__element__.__kind__ === TypeKind.object)) {
    // merge object types;
    return $expressionify({
      __kind__: ExpressionKind.Set,
      __element__: exprs
        .map((expr) => expr.__element__`,
    ts` as any`,
    r`)
        .reduce($mergeObjectTypes),
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
        .reduce(castMaps.getSharedParentScalar),
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
