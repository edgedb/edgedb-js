import type {GeneratorParams} from "../generate";
import {
  frag,
  getRef,
  joinFrags,
  quote,
  splitName,
  makeValidIdent,
} from "../util/genutil";
import {CodeBuffer, CodeBuilder, CodeFragment, DirBuilder} from "../builders";

import {FunctionDef, Param, Typemod} from "../queries/getFunctions";
import {getStringRepresentation} from "./generateObjectTypes";
import {introspect, StrictMap} from "../../reflection";
import {
  getTypesSpecificity,
  sortFuncopOverloads,
  getImplicitCastableRootTypes,
  expandFuncopAnytypeOverloads,
  GroupedParams,
  findPathOfAnytype,
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
      code.writeln(frag`${quote(funcDef.name)},`);
      // Args
      code.writeln(args);
      // NamedArgs
      code.writeln(namedArgs);
      // ReturnType
      code.writeln(returnType);
    },
    (code, funcName) => {
      code.writeln(frag`__name__: ${quote(funcName)},`);
      code.writeln(frag`__args__: positionalArgs,`);
      code.writeln(frag`__namedargs__: namedArgs,`);
    }
  );
};

export interface FuncopDef {
  id: string;
  name: string;
  kind?: string;
  description?: string;
  return_type: {id: string; name: string};
  return_typemod: Typemod;
  params: Param[];
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
    const funcDefs = expandFuncopAnytypeOverloads(
      sortFuncopOverloads<F>(_funcDefs, typeSpecificities),
      types,
      casts,
      implicitCastableRootTypes
    );

    const {mod, name} = splitName(funcName);

    const code = dir.getModule(mod);

    code.registerRef(funcName, funcDefs[0].id);
    code.addExport(getRef(funcName, {prefix: ""}), name);

    const overloadsBuf = new CodeBuffer();

    let overloadDefIndex = 1;
    for (const funcDef of funcDefs) {
      const {params} = funcDef;

      const hasParams = params.positional.length + params.named.length > 0;

      const namedParamsOverloads =
        !hasParams ||
        params.positional.length === 0 ||
        params.named.some(
          (param) => !(param.typemod === "OptionalType" || param.hasDefault)
        )
          ? [true]
          : params.named.length > 0
          ? [true, false]
          : [false];

      for (const hasNamedParams of namedParamsOverloads) {
        if (funcDef.description) {
          overloadsBuf.writeln(frag`/**
 * ${funcDef.description.replace(/\*\//g, "")}
 */`);
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
                ...params.positional.map((param) => param.typeName),
              ].join(", ")}>`
            : ""
        };`;

        code.writeln(
          frag`type ${functionTypeName}${
            hasParams ? `<` : ` = _.syntax.$expr_${funcopExprKind}<`
          }`
        );

        overloadsBuf.writeln(
          frag`function ${getRef(funcName, {prefix: ""})}${
            hasParams ? "<" : frag`(): ${functionTypeSig}`
          }`
        );

        const anytypes = funcDef.anytypes;
        const anytypeParams: string[] = [];

        function getParamAnytype(
          paramTypeName: string,
          paramType: introspect.Type,
          optional: boolean
        ) {
          if (!anytypes) return undefined;
          if (anytypes.kind === "castable") {
            if (paramType.name.includes("anytype")) {
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
              : `${anytypes.refName}${anytypes.refPath}`;
          }
        }

        if (hasParams) {
          // param types
          code.indented(() => {
            overloadsBuf.indented(() => {
              // named params
              if (hasNamedParams) {
                code.writeln(frag`NamedArgs extends {`);
                overloadsBuf.writeln(frag`NamedArgs extends {`);

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
                      const line = frag`${quote(param.name)}${
                        param.typemod === "OptionalType" || param.hasDefault
                          ? "?"
                          : ""
                      }: $.TypeSet<${paramType.staticType}>,`;

                      code.writeln(line);
                      overloadsBuf.writeln(line);
                    }
                  });
                });
                code.writeln(frag`},`);
                overloadsBuf.writeln(frag`},`);
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

                const type = frag`$.TypeSet<${paramTypeStr.staticType}>`;

                const line = frag`${param.typeName} extends ${
                  param.kind === "VariadicParam"
                    ? frag`[${type}, ...${type}[]]`
                    : type
                }${
                  optionalUndefined &&
                  (param.typemod === "OptionalType" || param.hasDefault)
                    ? " | undefined"
                    : ""
                },`;

                code.writeln(line);
                overloadsBuf.writeln(line);
              }
            });
          });

          code.writeln(frag`> = _.syntax.$expr_${funcopExprKind}<`);
          overloadsBuf.writeln(frag`>(`);

          // args signature
          overloadsBuf.indented(() => {
            if (hasNamedParams) {
              overloadsBuf.writeln(frag`namedArgs: NamedArgs,`);
            }

            for (const param of params.positional) {
              overloadsBuf.writeln(
                frag`${param.kind === "VariadicParam" ? "..." : ""}${
                  param.internalName
                }${
                  optionalUndefined &&
                  (param.typemod === "OptionalType" || param.hasDefault)
                    ? "?"
                    : ""
                }: ${param.typeName}${
                  param.kind === "VariadicParam" ? "" : ","
                }`
              );
            }
          });

          overloadsBuf.writeln(frag`): ${functionTypeSig}`);
        }

        code.indented(() => {
          const returnAnytype = anytypes
            ? anytypes.kind === "castable"
              ? anytypeParams.length <= 1
                ? anytypeParams[0]
                : anytypeParams.slice(1).reduce((parent, type) => {
                    return `${anytypes.returnAnytypeWrapper}<${parent}, ${type}>`;
                  }, anytypeParams[0])
              : `${anytypes.refName}${anytypes.refPath}`
            : undefined;
          const returnType = getStringRepresentation(
            types.get(funcDef.return_type.id),
            {
              types,
              anytype: returnAnytype,
            }
          );

          typeDefGen(
            code,
            funcDef,
            // args
            frag`[${params.positional
              .map(
                (param) =>
                  `${param.kind === "VariadicParam" ? "..." : ""}${
                    param.typeName
                  }`
              )
              .join(", ")}],`,
            // named args
            frag`${hasParams && hasNamedParams ? "NamedArgs" : "{}"},`,
            // return type
            frag`$.TypeSet<${
              returnType.staticType
            }, ${generateReturnCardinality(
              params,
              funcDef.return_typemod,
              hasNamedParams
            )}>`
          );
        });

        code.writeln(frag`>;`);
      }
    }

    code.writeBuf(overloadsBuf);

    // implementation
    code.writeln(
      frag`function ${getRef(funcName, {prefix: ""})}(...args: any[]) {`
    );

    code.indented(() => {
      code.writeln(
        frag`const {${
          funcDefs[0].kind ? "kind, " : ""
        }returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.resolveOverload(args, _.spec, [`
      );
      code.indented(() => {
        let overloadIndex = 0;
        for (const funcDef of funcDefs) {
          if (funcDef.overloadIndex !== overloadIndex) {
            continue;
          }
          overloadIndex++;

          const {params} = funcDef;

          function getArgSpec(
            param: GroupedParams["named" | "positional"][number]
          ) {
            return `{typeId: ${quote(param.type.id)}, optional: ${(
              param.typemod === "OptionalType" || !!param.hasDefault
            ).toString()}, setoftype: ${(
              param.typemod === "SetOfType"
            ).toString()}, variadic: ${(
              param.kind === "VariadicParam"
            ).toString()}}`;
          }

          const argsDef = params.positional.map((param) => {
            return getArgSpec(param);
          });
          const namedArgsDef = params.named.length
            ? `namedArgs: {${params.named
                .map((param) => {
                  return `${quote(param.name)}: ${getArgSpec(param)}`;
                })
                .join(", ")}}, `
            : "";

          code.writeln(
            frag`{${
              funcDef.kind ? `kind: ${quote(funcDef.kind)}, ` : ""
            }args: [${argsDef.join(
              ", "
            )}], ${namedArgsDef}returnTypeId: ${quote(
              funcDef.return_type.id
            )}${
              funcDef.return_typemod === "SingletonType"
                ? ""
                : `, returnTypemod: ${quote(funcDef.return_typemod)}`
            }},`
          );
        }
      });
      code.writeln(frag`]);`);

      code.writeln(frag`return {`);
      code.indented(() => {
        code.writeln(frag`__kind__: $.ExpressionKind.${funcopExprKind},`);
        code.writeln(frag`__element__: returnType,`);
        code.writeln(frag`__cardinality__: cardinality,`);
        implReturnGen(code, funcName, funcDefs);
        code.writeln(frag`toEdgeQL: _.syntax.toEdgeQL`);
      });
      code.writeln(frag`} as any;`);
    });

    code.writeln(frag`};`);

    code.nl();
  }
}

// default -> cardinality of cartesian product of params actual cardinality
// (or overridden cardinality below)

// param typemods override actual param cardinality:
// - setoftype -> One
// - (optional || hasDefault) -> override lower cardinality of actual to 1

// return typemod:
// - optional -> override return lower cardinality to 0
//    (product with AtMostOne)
// - setoftype -> always Many

function generateReturnCardinality(
  params: GroupedParams,
  returnTypemod: Typemod,
  hasNamedParams: boolean
) {
  if (returnTypemod === "SetOfType") {
    return `$.Cardinality.Many`;
  }

  const paramCardinalities = [
    ...params.positional.map((p) => ({
      ...p,
      genTypeName: p.typeName,
    })),
    ...(hasNamedParams
      ? params.named.map((p) => ({
          ...p,
          genTypeName: `NamedArgs[${quote(p.name)}]`,
        }))
      : []),
  ].map((param) => {
    if (param.typemod === "SetOfType") {
      return `$.Cardinality.One`;
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

  return returnTypemod === "OptionalType"
    ? `$.cardinalityUtil.overrideLowerBound<${cardinality}, 'Zero'>`
    : cardinality;
}
