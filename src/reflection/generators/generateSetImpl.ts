import {dts, r, t, ts} from "../builders";
import {GeneratorParams} from "../generate";
import {getImplicitCastableRootTypes} from "../util/functionUtils";
import {getStringRepresentation} from "./generateObjectTypes";

export const generateSetImpl = ({dir, types, casts, isDeno}: GeneratorParams) => {
  const code = dir.getPath("syntax/setImpl");

  const implicitCastableRootTypes = getImplicitCastableRootTypes(casts);
  const edgedb =
    isDeno ? "https://deno.land/x/edgedb/mod.ts" : "edgedb";

  code.addImport(
    {
      $: true,
    },
    edgedb,
    {allowFileExt: false}
  );
  code.addImportStar("castMaps", "../castMaps", {
    allowFileExt: true,
    modes: ["ts", "js", "dts"],
  });
  code.addImport({$expressionify: true}, "./path", {
    allowFileExt: true,
    modes: ["ts", "js"],
  });

  code.addImport(
    {
      $expr_Set: true,
      mergeObjectTypesVariadic: true,
      getTypesFromExprs: true,
      getTypesFromObjectExprs: true,
      getCardsFromExprs: true,
      getSharedParentPrimitiveVariadic: true,
      LooseTypeSet: true,
    },
    "./set",
    {allowFileExt: true, typeOnly: true}
  );

  code.addImport({getSharedParent: true}, "./set", {
    allowFileExt: true,
    modes: ["ts", "js"],
  });

  code.nl();
  code.writeln([
    dts`declare `,
    t`type getSetTypeFromExprs<
  Exprs extends [$.TypeSet, ...$.TypeSet[]]
> = LooseTypeSet<
  getSharedParentPrimitiveVariadic<getTypesFromExprs<Exprs>>,
  $.cardinalityUtil.mergeCardinalitiesVariadic<getCardsFromExprs<Exprs>>
>;`,
  ]);
  code.nl();

  code.writeln([dts`declare `, t`function set(): null;`]);

  code.writeln([
    dts`declare `,
    t`function set<
  Expr extends castMaps.orScalarLiteral<$.TypeSet>
>(expr: Expr): $expr_Set<castMaps.literalToTypeSet<Expr>>;`,
  ]);

  for (const implicitRootTypeId of implicitCastableRootTypes) {
    code.writeln([
      dts`declare `,
      t`function set<
  Expr extends castMaps.orScalarLiteral<$.TypeSet<${
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
  Expr extends $.TypeSet<$.ArrayType<${
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
`,
    dts`declare `,
    t`function set<
  Expr extends $.TypeSet<$.AnyTupleType>,
  Exprs extends [Expr, ...Expr[]]
>(...exprs: Exprs): $expr_Set<getSetTypeFromExprs<Exprs>>;
`,
    dts`declare `,
    t`function set<
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
`,
    dts`declare `,
    t`function set<Expr extends $.TypeSet<$.BaseType> | castMaps.scalarLiterals>(
  ...exprs: Expr[]
): $expr_Set<
  $.TypeSet<
    $.getPrimitiveBaseType<castMaps.literalToTypeSet<Expr>["__element__"]>,
    $.Cardinality.Many
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
    ts`: $.TypeSet[]`,
    r` = _exprs.map(expr => castMaps.literalToTypeSet(expr));

  return $expressionify({
    __kind__: $.ExpressionKind.Set,
    __element__: exprs
      .map(expr => expr.__element__`,
    ts` as any`,
    r`)
      .reduce(getSharedParent),
    __cardinality__: $.cardinalityUtil.mergeCardinalitiesVariadic(
      exprs.map(expr => expr.__cardinality__)`,
    ts` as any`,
    r`
    ),
    __exprs__: exprs,
  })`,
    ts` as any`,
    r`;

}`,
  ]);

  code.addExport("set");
};
