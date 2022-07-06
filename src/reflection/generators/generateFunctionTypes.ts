import type {GeneratorParams} from "../generate";
import {frag, getRef, quote, splitName} from "../util/genutil";
import {
  all,
  CodeBuffer,
  CodeBuilder,
  CodeFragment,
  DirBuilder,
  dts,
  r,
  t,
  ts,
} from "../builders";

import {Param, Typemod} from "../queries/getFunctions";
import {getStringRepresentation} from "./generateObjectTypes";
import {introspect, StrictMap} from "../../reflection";
import {
  getTypesSpecificity,
  sortFuncopOverloads,
  getImplicitCastableRootTypes,
  expandFuncopAnytypeOverloads,
  GroupedParams,
  findPathOfAnytype,
  AnytypeDef,
  FuncopDefOverload,
} from "../util/functionUtils";
import {Casts} from "../queries/getCasts";

export const generateFunctionTypes = ({
  dir,
  functions,
  types,
  casts,
}: GeneratorParams) => {
  generateFuncopTypes(
    dir,
    types,
    casts,
    functions,
    "Function",
    "FuncExpr",
    true,
    (code, funcDef, args, namedArgs, returnType) => {
      // Name
      code.writeln([t`${quote(funcDef.name)},`]);
      // Args
      code.writeln([t`${args}`]);
      // NamedArgs
      code.writeln([t`${namedArgs}`]);
      // ReturnType
      code.writeln([t`${returnType}`]);
    },
    (code, funcName) => {
      code.writeln([r`__name__: ${quote(funcName)},`]);
      code.writeln([r`__args__: positionalArgs,`]);
      code.writeln([r`__namedargs__: namedArgs,`]);
    }
  );
};

export function allowsLiterals(
  type: introspect.Type,
  anytypes: AnytypeDef | null
): boolean {
  return (
    (type.name === "anytype" && anytypes?.kind === "noncastable") ||
    type.kind === "scalar"
  );
}

export interface FuncopDef {
  id: string;
  name: string;
  kind?: string;
  description?: string;
  return_type: {id: string; name: string};
  return_typemod: Typemod;
  params: Param[];
  preserves_optionality?: boolean;
}

export function generateFuncopTypes<F extends FuncopDef>(
  dir: DirBuilder,
  types: introspect.Types,
  casts: Casts,
  funcops: StrictMap<string, F[]>,
  funcopExprKind: string,
  typeDefSuffix: string,
  optionalUndefined: boolean,
  typeDefGen: (
    code: CodeBuilder,
    def: F,
    args: CodeFragment[],
    namedArgs: CodeFragment[],
    returnType: CodeFragment[]
  ) => void,
  implReturnGen: (
    code: CodeBuilder,
    funcopName: string,
    funcopDefs: F[]
  ) => void
) {
  const typeSpecificities = getTypesSpecificity(types, casts);
  const implicitCastableRootTypes = getImplicitCastableRootTypes(casts);

  for (const [funcName, _funcDefs] of funcops.entries()) {
    const {mod, name} = splitName(funcName);

    const code = dir.getModule(mod);

    code.registerRef(funcName, _funcDefs[0].id);
    code.addToDefaultExport(getRef(funcName, {prefix: ""}), name);

    // edgeql stdlib has a constructor function with the same name as the
    // literal constructor and type constuctor for 'range', so replace
    // generated function with implementation from ./syntax
    if (funcName === "std::range") {
      code.writeln([dts`declare `, all`const range = _.syntax.$range;`]);
      code.nl();
      continue;
    }

    const funcDefs = expandFuncopAnytypeOverloads(
      sortFuncopOverloads<F>(_funcDefs, typeSpecificities),
      types,
      casts,
      implicitCastableRootTypes
    );

    const overloadsBuf = new CodeBuffer();

    let overloadDefIndex = 1;
    for (const funcDef of funcDefs) {
      const {params} = funcDef;

      const hasParams = params.positional.length + params.named.length > 0;

      const namedParamsOverloads =
        !hasParams ||
        params.positional.length === 0 ||
        params.named.some(
          param => !(param.typemod === "OptionalType" || param.hasDefault)
        )
          ? [true]
          : params.named.length > 0
          ? [true, false]
          : [false];

      for (const hasNamedParams of namedParamsOverloads) {
        if (funcDef.description) {
          overloadsBuf.writeln([
            t`/**
 * ${funcDef.description.replace(/\*\//g, "")}
 */`,
          ]);
        }

        const functionTypeName = frag`${getRef(funcName, {
          prefix: "",
        })}λ${typeDefSuffix}${
          overloadDefIndex++ > 1 ? String(overloadDefIndex - 1) : ""
        }`;

        const functionTypeSig = frag`${functionTypeName}${
          hasParams
            ? `<${[
                ...(hasNamedParams ? ["NamedArgs"] : []),
                ...params.positional.map(param => param.typeName),
              ].join(", ")}>`
            : ""
        };`;

        code.writeln([
          dts`declare `,
          t`type ${functionTypeName}${
            hasParams ? `<` : ` = $.$expr_${funcopExprKind}<`
          }`,
        ]);

        overloadsBuf.writeln([
          dts`declare `,
          t`function ${getRef(funcName, {prefix: ""})}${
            hasParams ? "<" : frag`(): ${functionTypeSig}`
          }`,
        ]);

        const anytypes = funcDef.anytypes;
        const anytypeParams: string[] = [];

        function getParamAnytype(
          paramTypeName: string,
          paramType: introspect.Type,
          optional: boolean
        ) {
          if (!anytypes) return undefined;
          if (anytypes.kind === "castable") {
            if (
              paramType.name.includes("anytype") ||
              paramType.name.includes("anypoint")
            ) {
              const path = findPathOfAnytype(paramType.id, types);
              anytypeParams.push(
                optional
                  ? `${paramTypeName} extends $.TypeSet ? ${paramTypeName}${path} : undefined`
                  : `${paramTypeName}${path}`
              );
            }
            return anytypes.type;
          } else {
            return anytypes.refName === paramTypeName
              ? anytypes.type
              : `$.getPrimitive${
                  anytypes.type[0] === "$.NonArrayType" ? "NonArray" : ""
                }BaseType<${
                  allowsLiterals(anytypes.typeObj, anytypes)
                    ? `_.castMaps.literalToTypeSet<${anytypes.refName}>`
                    : anytypes.refName
                }${anytypes.refPath}>`;
          }
        }

        let hasNamedLiterals = false;
        let hasPositionalLiterals = false;

        if (hasParams) {
          // param types
          code.indented(() => {
            overloadsBuf.indented(() => {
              // named params
              if (hasNamedParams) {
                code.writeln([t`NamedArgs extends {`]);
                overloadsBuf.writeln([t`NamedArgs extends {`]);

                code.indented(() => {
                  overloadsBuf.indented(() => {
                    for (const param of params.named) {
                      const anytype = getParamAnytype(
                        param.typeName,
                        param.type,
                        param.typemod === "OptionalType" || !!param.hasDefault
                      );

                      const paramType = getStringRepresentation(param.type, {
                        types,
                        anytype,
                        casts: casts.implicitCastFromMap,
                      });
                      let typeStr = frag`$.TypeSet<${paramType.staticType}>`;
                      if (allowsLiterals(param.type, anytypes)) {
                        typeStr = frag`_.castMaps.orScalarLiteral<${typeStr}>`;
                        hasNamedLiterals = true;
                      }
                      const line = t`${quote(param.name)}${
                        param.typemod === "OptionalType" || param.hasDefault
                          ? "?"
                          : ""
                      }: ${typeStr},`;

                      code.writeln([line]);
                      overloadsBuf.writeln([line]);
                    }
                  });
                });
                code.writeln([t`},`]);
                overloadsBuf.writeln([t`},`]);
              }

              // positional + variadic params
              for (const param of params.positional) {
                const anytype = getParamAnytype(
                  param.typeName,
                  param.type,
                  optionalUndefined &&
                    (param.typemod === "OptionalType" || !!param.hasDefault)
                );

                const paramTypeStr = getStringRepresentation(param.type, {
                  types,
                  anytype,
                  casts: casts.implicitCastFromMap,
                });

                let type = frag`$.TypeSet<${paramTypeStr.staticType}>`;

                if (allowsLiterals(param.type, anytypes)) {
                  type = frag`_.castMaps.orScalarLiteral<${type}>`;
                  hasPositionalLiterals = true;
                }

                const line = t`${param.typeName} extends ${
                  param.kind === "VariadicParam"
                    ? frag`[${type}, ...${type}[]]`
                    : type
                }${
                  optionalUndefined &&
                  (param.typemod === "OptionalType" || param.hasDefault)
                    ? " | undefined"
                    : ""
                },`;

                code.writeln([line]);
                overloadsBuf.writeln([line]);
              }
            });
          });

          code.writeln([t`> = $.$expr_${funcopExprKind}<`]);
          overloadsBuf.writeln([t`>(`]);

          // args signature
          overloadsBuf.indented(() => {
            if (hasNamedParams) {
              overloadsBuf.writeln([t`namedArgs: NamedArgs,`]);
            }

            for (const param of params.positional) {
              overloadsBuf.writeln([
                t`${param.kind === "VariadicParam" ? "..." : ""}${
                  param.internalName
                }${
                  optionalUndefined &&
                  (param.typemod === "OptionalType" || param.hasDefault)
                    ? "?"
                    : ""
                }: ${param.typeName}${
                  param.kind === "VariadicParam" ? "" : ","
                }`,
              ]);
            }
          });

          overloadsBuf.writeln([t`): ${functionTypeSig}`]);
        }

        code.indented(() => {
          const returnAnytype = anytypes
            ? anytypes.kind === "castable"
              ? anytypeParams.length <= 1
                ? anytypeParams[0]
                : anytypeParams.slice(1).reduce((parent, type) => {
                    return `${anytypes.returnAnytypeWrapper}<${parent}, ${type}>`;
                  }, anytypeParams[0])
              : `$.getPrimitive${
                  anytypes.type[0] === "$.NonArrayType" ? "NonArray" : ""
                }BaseType<${
                  allowsLiterals(anytypes.typeObj, anytypes)
                    ? `_.castMaps.literalToTypeSet<${anytypes.refName}>`
                    : anytypes.refName
                }${anytypes.refPath}>`
            : undefined;
          const returnType = getStringRepresentation(
            types.get(funcDef.return_type.id),
            {
              types,
              anytype: returnAnytype,
            }
          );

          const positionalParams = params.positional
            .map(
              param =>
                `${param.kind === "VariadicParam" ? "..." : ""}${
                  param.typeName
                }`
            )
            .join(", ");

          typeDefGen(
            code,
            funcDef,
            // args
            hasPositionalLiterals
              ? frag`_.castMaps.mapLiteralToTypeSet<[${positionalParams}]>,`
              : frag`[${positionalParams}],`,
            // named args
            frag`${
              hasParams && hasNamedParams
                ? hasNamedLiterals
                  ? "_.castMaps.mapLiteralToTypeSet<NamedArgs>"
                  : "NamedArgs"
                : "{}"
            },`,
            // return type
            frag`$.TypeSet<${
              returnType.staticType
            }, ${generateReturnCardinality(
              funcName,
              params,
              funcDef.return_typemod,
              hasNamedParams,
              anytypes,
              funcDef.preserves_optionality
            )}>`
          );
        });

        code.writeln([t`>;`]);
      }
    }

    code.writeBuf(overloadsBuf);

    // implementation
    code.writeln([
      r`function ${getRef(funcName, {prefix: ""})}(...args`,
      ts`: any[]`,
      r`) {`,
    ]);

    code.indented(() => {
      code.writeln([
        r`const {${
          funcDefs[0].kind ? "kind, " : ""
        }returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('${funcName}', args, _.spec, [`,
      ]);
      code.indented(() => {
        let overloadIndex = 0;
        for (const funcDef of funcDefs) {
          if (funcDef.overloadIndex !== overloadIndex) {
            continue;
          }
          overloadIndex++;

          code.writeln([r`${generateFuncopDef(funcDef)},`]);
        }
      });
      code.writeln([r`]);`]);

      code.writeln([r`return _.syntax.$expressionify({`]);
      code.indented(() => {
        code.writeln([r`__kind__: $.ExpressionKind.${funcopExprKind},`]);
        code.writeln([r`__element__: returnType,`]);
        code.writeln([r`__cardinality__: cardinality,`]);
        implReturnGen(code, funcName, funcDefs);
      });
      code.writeln([r`})`, ts` as any`, r`;`]);
    });

    code.writeln([r`};`]);

    code.nl();
  }
}

export function generateFuncopDef(funcopDef: FuncopDefOverload<FuncopDef>) {
  const {params} = funcopDef;

  function getArgSpec(param: GroupedParams["named" | "positional"][number]) {
    return `{typeId: ${quote(param.type.id)}, optional: ${(
      param.typemod === "OptionalType" || !!param.hasDefault
    ).toString()}, setoftype: ${(
      param.typemod === "SetOfType"
    ).toString()}, variadic: ${(param.kind === "VariadicParam").toString()}}`;
  }

  const argsDef = params.positional.map(param => {
    return getArgSpec(param);
  });
  const namedArgsDef = params.named.length
    ? `namedArgs: {${params.named
        .map(param => {
          return `${quote(param.name)}: ${getArgSpec(param)}`;
        })
        .join(", ")}}, `
    : "";

  return `{${
    funcopDef.kind ? `kind: ${quote(funcopDef.kind)}, ` : ""
  }args: [${argsDef.join(", ")}], ${namedArgsDef}returnTypeId: ${quote(
    funcopDef.return_type.id
  )}${
    funcopDef.return_typemod === "SingletonType"
      ? ""
      : `, returnTypemod: ${quote(funcopDef.return_typemod)}`
  }${funcopDef.preserves_optionality ? `, preservesOptionality: true` : ""}}`;
}

// default -> cardinality of cartesian product of params actual cardinality
// (or overridden cardinality below)

// param typemods override actual param cardinality:
// - setoftype -> One
//     (unless preservesOptionality -> override upper cardinality to 1)
// - (optional || hasDefault) -> override lower cardinality of actual to 1

// return typemod:
// - optional -> override return lower cardinality to 0
//    (product with AtMostOne) (ignored if preservesOptionality)
// - setoftype -> always Many

export function generateReturnCardinality(
  name: string,
  params: GroupedParams,
  returnTypemod: Typemod,
  hasNamedParams: boolean,
  anytypes: AnytypeDef | null,
  preservesOptionality: boolean = false
) {
  if (
    returnTypemod === "SetOfType" &&
    name !== "std::if_else" &&
    name !== "std::assert_exists"
  ) {
    return `$.Cardinality.Many`;
  }

  const cardinalities = [
    ...params.positional.map(p => ({
      ...p,
      genTypeName: allowsLiterals(p.type, anytypes)
        ? `_.castMaps.${
            p.kind === "VariadicParam" ? "mapL" : "l"
          }iteralToTypeSet<${p.typeName}>`
        : p.typeName,
    })),
    ...(hasNamedParams
      ? params.named.map(p => ({
          ...p,
          genTypeName: allowsLiterals(p.type, anytypes)
            ? `_.castMaps.literalToTypeSet<NamedArgs[${quote(p.name)}]>`
            : `NamedArgs[${quote(p.name)}]`,
        }))
      : []),
  ];

  if (name === "std::if_else") {
    return (
      `$.cardinalityUtil.multiplyCardinalities<` +
      `$.cardinalityUtil.orCardinalities<` +
      `${cardinalities[0].genTypeName}["__cardinality__"],` +
      ` ${cardinalities[2].genTypeName}["__cardinality__"]` +
      `>, ${cardinalities[1].genTypeName}["__cardinality__"]>`
    );
  }
  if (name === "std::assert_exists") {
    return `$.cardinalityUtil.overrideLowerBound<${cardinalities[0].genTypeName}["__cardinality__"], "One">`;
  }

  const paramCardinalities = cardinalities.map(param => {
    if (param.typemod === "SetOfType") {
      if (preservesOptionality) {
        return `$.cardinalityUtil.overrideUpperBound<${param.genTypeName}["__cardinality__"], "One">`;
      } else {
        return `$.Cardinality.One`;
      }
    }

    if (param.typemod === "OptionalType" || param.hasDefault) {
      const _alias = `$.cardinalityUtil.optionalParamCardinality`;
      return `${_alias}<${param.genTypeName}>`;
    }

    if (param.kind === "VariadicParam") {
      return `$.cardinalityUtil.multiplyCardinalitiesVariadic<$.cardinalityUtil.paramArrayCardinality<${param.genTypeName}>>`;
    }

    return `${param.genTypeName}["__cardinality__"]`;
  });

  const cardinality = paramCardinalities.length
    ? paramCardinalities.length > 1
      ? paramCardinalities
          .slice(1)
          .reduce(
            (cards, card) =>
              `$.cardinalityUtil.multiplyCardinalities<${cards}, ${card}>`,
            paramCardinalities[0]
          )
      : paramCardinalities[0]
    : "$.Cardinality.One";

  return returnTypemod === "OptionalType" && !preservesOptionality
    ? `$.cardinalityUtil.overrideLowerBound<${cardinality}, 'Zero'>`
    : cardinality;
}
