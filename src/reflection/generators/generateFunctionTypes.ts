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
import {introspect, StrictMap} from "reflection";
import {
  getTypesSpecificity,
  sortFuncopOverloads,
  getImplicitRootTypes,
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
  const implicitRootTypes = getImplicitRootTypes(casts);

  for (const [funcName, _funcDefs] of funcops.entries()) {
    const funcDefs = sortFuncopOverloads<F>(
      _funcDefs,
      typeSpecificities
    ).flatMap((funcDef, overloadIndex) => {
      const overload = {
        ...funcDef,
        overloadIndex,
        params: groupParams(funcDef.params),
        anytype: null as
          | {kind: "castable"; paramType: CodeFragment[]}
          | {
              kind: "noncastable";
              paramName: string;
              paramPath: string;
            }
          | null,
      };

      const anytypeSourceParam = overload.params.positional.find((param) =>
        param.type.name.includes("anytype")
      );
      if (anytypeSourceParam) {
        const sourcePath = findPathOfAnytype(
          anytypeSourceParam.type.id,
          types
        );
        if (!sourcePath) {
          throw new Error(`Cannot find anytype in ${anytypeSourceParam.name}`);
        }

        return [
          ...implicitRootTypes.map((rootTypeId) => ({
            ...overload,
            anytype: {
              kind: "castable" as const,
              paramType: getStringRepresentation(types.get(rootTypeId), {
                types,
                casts: casts.implicitCastFromMap,
              }).staticType,
            },
          })),
          {
            ...overload,
            anytype: {
              kind: "noncastable" as const,
              paramName: anytypeSourceParam.name,
              paramPath: `${anytypeSourceParam.typeName}${sourcePath}`,
            },
          },
        ];
      } else {
        return [overload];
      }
    });

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

        const anytypes: string[] = [];

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
                      const anytype = funcDef.anytype
                        ? funcDef.anytype.kind === "castable"
                          ? funcDef.anytype.paramType
                          : funcDef.anytype.paramPath
                        : undefined;

                      const paramType = getStringRepresentation(
                        types.get(param.type.id),
                        {
                          types,
                          anytype,
                          casts: casts.implicitCastFromMap,
                        }
                      );
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
                let paramType = types.get(param.type.id);
                if (param.kind === "VariadicParam") {
                  if (paramType.kind !== "array") {
                    throw new Error("Variadic param not array type");
                  }
                  paramType = types.get(paramType.array_element_id);
                }
                const anytype = funcDef.anytype
                  ? funcDef.anytype.kind === "castable"
                    ? funcDef.anytype.paramType
                    : funcDef.anytype.paramName === param.name
                    ? undefined
                    : funcDef.anytype.paramPath
                  : undefined;
                const paramTypeStr = getStringRepresentation(paramType, {
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

                if (
                  param.type.name.includes("anytype") &&
                  funcDef.anytype?.kind === "castable"
                ) {
                  const path = findPathOfAnytype(param.type.id, types);
                  if (!path) {
                    throw new Error(`Cannot find anytype in ${param.name}`);
                  }
                  anytypes.push(`${param.typeName}${path}`);
                }
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
          const returnAnytype = funcDef.anytype
            ? funcDef.anytype.kind === "castable"
              ? anytypes.length <= 1
                ? anytypes[0]
                : anytypes.slice(1).reduce((parent, type) => {
                    return `_.syntax.getSharedParentPrimitive<${parent}, ${type}>`;
                  }, anytypes[0])
              : funcDef.anytype.paramPath
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

          function getArgSpec(param: FunctionDef["params"][number]) {
            return `{typeId: ${quote(
              param.kind === "VariadicParam"
                ? (types.get(param.type.id) as introspect.ArrayType)
                    .array_element_id
                : param.type.id
            )}, optional: ${(
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

function groupParams(params: FunctionDef["params"]) {
  return {
    positional: params
      .filter(
        (param) =>
          param.kind === "PositionalParam" || param.kind === "VariadicParam"
      )
      .map((param, i) => {
        return {
          ...param,
          internalName: makeValidIdent({id: `${i}`, name: param.name}),
          typeName: `P${i + 1}`,
        };
      }),
    named: params.filter((param) => param.kind === "NamedOnlyParam"),
  };
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
  params: ReturnType<typeof groupParams>,
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

function findPathOfAnytype(
  typeId: string,
  types: introspect.Types
): string | null {
  const type = types.get(typeId);

  if (type.name === "anytype") {
    return '["__element__"]';
  }
  if (type.kind === "array") {
    const elPath = findPathOfAnytype(type.array_element_id, types);
    if (elPath) {
      return `["__element__"]${elPath}`;
    }
  } else if (type.kind === "tuple") {
    const isNamed = type.tuple_elements[0].name !== "0";
    for (const {name, target_id} of type.tuple_elements) {
      const elPath = findPathOfAnytype(target_id, types);
      if (elPath) {
        return `[${isNamed ? quote(name) : name}]${elPath}`;
      }
    }
  }

  return null;
}
