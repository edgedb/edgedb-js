import {dts, r, t, ts} from "../builders";
import type {GeneratorParams} from "../genutil";
import {getImplicitCastableRootTypes} from "../funcoputil";
import {getStringRepresentation} from "./generateObjectTypes";

export const generateSetImpl = ({dir, types, casts}: GeneratorParams) => {
  const code = dir.getPath("setImpl");

  const implicitCastableRootTypes = getImplicitCastableRootTypes(casts);

  code.addImportStar("$", "./reflection", {allowFileExt: true});
  code.addImportStar("castMaps", "./castMaps", {
    allowFileExt: true,
    modes: ["ts", "js", "dts"]
  });
  code.addImport({$expressionify: true}, "./path", {
    allowFileExt: true,
    modes: ["ts", "js"]
  });

  code.addImport(
    {
      $expr_Set: true,
      mergeObjectTypesVariadic: true,
      getTypesFromExprs: true,
      getTypesFromObjectExprs: true,
      getCardsFromExprs: true,
      getSharedParentPrimitiveVariadic: true,
      LooseTypeSet: true
    },
    "./set",
    {allowFileExt: true, typeOnly: true}
  );

  code.addImport({getSharedParent: true}, "./set", {
    allowFileExt: true,
    modes: ["ts", "js"]
  });

  code.addImport({literal: true}, "./literal", {
    allowFileExt: true,
    modes: ["ts", "js"]
  });

  code.nl();
  code.writeln([
    dts`declare `,
    t`type getSetTypeFromExprs<
  Exprs extends [$.TypeSet, ...$.TypeSet[]]
> = LooseTypeSet<
  getSharedParentPrimitiveVariadic<getTypesFromExprs<Exprs>>,
  $.cardutil.mergeCardinalitiesVariadic<getCardsFromExprs<Exprs>>
>;`
  ]);
  code.nl();

  code.writeln([dts`declare `, t`function set(): null;`]);

  code.writeln([
    dts`declare `,
    t`function set<
  Expr extends castMaps.orScalarLiteral<$.TypeSet>
>(expr: Expr): $expr_Set<castMaps.literalToTypeSet<Expr>>;`
  ]);

  for (const implicitRootTypeId of implicitCastableRootTypes) {
    code.writeln([
      dts`declare `,
      t`function set<
  Expr extends castMaps.orScalarLiteral<$.TypeSet<${
    getStringRepresentation(types.get(implicitRootTypeId), {
      types,
      casts: casts.implicitCastFromMap
    }).staticType
  }>>,
  Exprs extends [Expr, ...Expr[]]
>(...exprs: Exprs): $expr_Set<getSetTypeFromExprs<castMaps.mapLiteralToTypeSet<Exprs>>>;`
    ]);

    code.writeln([
      dts`declare `,
      t`function set<
  Expr extends $.TypeSet<$.ArrayType<${
    getStringRepresentation(types.get(implicitRootTypeId), {
      types,
      casts: casts.implicitCastFromMap
    }).staticType
  }>>,
  Exprs extends [Expr, ...Expr[]]
>(...exprs: Exprs): $expr_Set<getSetTypeFromExprs<Exprs>>;`
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
    $.cardutil.mergeCardinalitiesVariadic<getCardsFromExprs<Exprs>>
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
    $.cardutil.mergeCardinalitiesVariadic<
      getCardsFromExprs<castMaps.mapLiteralToTypeSet<[Expr, ...Exprs]>>
    >
  >
>;
`,
    dts`declare `,
    t`function set<
  Type extends $.BaseType,
  Expr extends $.TypeSet<$.getPrimitiveBaseType<Type>> | $.BaseTypeToTsType<Type>
>(
  type: Type,
  exprs: Expr[]
): $expr_Set<$.TypeSet<$.getPrimitiveBaseType<Type>, $.Cardinality.Many>>;`
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

  if (($.TypeKind`,
    ts` as any`,
    r`)[_exprs[0]?.__kind__] != null) {
    if (_exprs.length !== 2 || !Array.isArray(_exprs[1])) {
      throw new Error(
        "Invalid args to set constructor. " +
          "First argument is a type expression, so second argument " +
          "is expected to be an array of values."
      );
    }
    return $expressionify({
      __kind__: $.ExpressionKind.Set,
      __element__: _exprs[0],
      __cardinality__: $.Cardinality.Many,
      __exprs__: _exprs[1].map(val =>
        val.__element__ ? val : (literal`,
    ts` as any`,
    r`)(_exprs[0], val)
      )
    });
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
    __cardinality__: $.cardutil.mergeCardinalitiesVariadic(
      exprs.map(expr => expr.__cardinality__)`,
    ts` as any`,
    r`
    ),
    __exprs__: exprs,
  })`,
    ts` as any`,
    r`;

}`
  ]);

  code.addExport("set");
};
