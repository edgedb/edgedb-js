import type {GeneratorParams} from "../generate";
import {
  frag,
  getRef,
  joinFrags,
  quote,
  splitName,
  makeValidIdent,
} from "../util/genutil";

import {FunctionDef, Typemod} from "../queries/getFunctions";
import {getStringRepresentation} from "./generateObjectTypes";
import {introspect} from "reflection";

export const generateFunctionTypes = async ({
  dir,
  functions,
  types,
}: GeneratorParams) => {
  for (const [funcName, funcDefs] of functions.entries()) {
    const {mod, name} = splitName(funcName);

    const code = dir.getModule(mod);

    code.registerRef(funcName, funcDefs[0].id);
    code.addExport(getRef(funcName, {prefix: ""}), name);

    for (const funcDef of funcDefs) {
      const params = groupParams(funcDef.params);

      const hasParams = funcDef.params.length > 0;

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
          code.writeln(frag`/**
 * ${funcDef.description.replace(/\*\//g, "")}
 */`);
        }

        code.writeln(
          frag`function ${getRef(funcName, {prefix: ""})}${
            hasParams ? "<" : "(): _.syntax.$expr_Function<"
          }`
        );

        let anytype: string | undefined = undefined;

        if (hasParams) {
          // param types
          code.indented(() => {
            // named params
            if (hasNamedParams) {
              code.writeln(frag`NamedArgs extends {`);
              code.indented(() => {
                for (const param of params.named) {
                  const paramType = getStringRepresentation(
                    types.get(param.type.id),
                    {
                      types,
                      anytype,
                    }
                  );
                  code.writeln(
                    frag`${quote(param.name)}${
                      param.typemod === "OptionalType" || param.hasDefault
                        ? "?"
                        : ""
                    }: $.TypeSet<${paramType.staticType}>,`
                  );
                }
              });
              code.writeln(frag`},`);
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
              const paramTypeStr = getStringRepresentation(paramType, {
                types,
                anytype,
              });

              const type = frag`$.TypeSet<${paramTypeStr.staticType}>`;

              code.writeln(
                frag`$${param.internalName} extends ${
                  param.kind === "VariadicParam"
                    ? frag`[${type}, ...${type}[]]`
                    : type
                },`
              );

              if (!anytype && param.type.name.includes("anytype")) {
                const path = findPathOfAnytype(param.type.id, types);
                if (!path) {
                  throw new Error(`Cannot find anytype in ${param.name}`);
                }
                anytype = `$${param.internalName}${path}`;
              }
            }
          });

          code.writeln(frag`>(`);

          // args signature
          code.indented(() => {
            if (hasNamedParams) {
              code.writeln(frag`namedArgs: NamedArgs,`);
            }

            for (const param of params.positional) {
              code.writeln(
                frag`${
                  param.kind === "VariadicParam" ? "..." : ""
                }${param.internalName.slice(1)}${
                  param.typemod === "OptionalType" || param.hasDefault
                    ? "?"
                    : ""
                }: $${param.internalName}${
                  param.kind === "VariadicParam" ? "" : ","
                }`
              );
            }
          });

          code.writeln(frag`): _.syntax.$expr_Function<`);
        }

        code.indented(() => {
          // Name
          code.writeln(frag`${quote(funcDef.name)},`);
          // Args
          code.writeln(
            frag`[${params.positional
              .map(
                (param) =>
                  `${param.kind === "VariadicParam" ? "..." : ""}$${
                    param.internalName
                  }`
              )
              .join(", ")}],`
          );
          // NamedArgs
          code.writeln(
            frag`${hasParams && hasNamedParams ? "NamedArgs" : "{}"},`
          );
          // ReturnType
          const returnType = getStringRepresentation(
            types.get(funcDef.return_type.id),
            {
              types,
              anytype,
            }
          );
          code.writeln(
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

    // implementation
    code.writeln(
      frag`function ${getRef(funcName, {prefix: ""})}(...args: any[]) {`
    );

    code.indented(() => {
      code.writeln(
        frag`const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.resolveOverload(args, _.spec, [`
      );
      code.indented(() => {
        for (const funcDef of funcDefs) {
          const params = groupParams(funcDef.params);

          function getArgSpec(param: FunctionDef["params"][number]) {
            return `{typeId: ${quote(
              param.kind === "VariadicParam"
                ? (types.get(param.type.id) as introspect.ArrayType)
                    .array_element_id
                : param.type.id
            )}, optional: ${(
              param.typemod === "OptionalType" || param.hasDefault
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
            frag`{args: [${argsDef.join(
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
        code.writeln(frag`__kind__: $.ExpressionKind.Function,`);
        code.writeln(frag`__element__: returnType,`);
        code.writeln(frag`__cardinality__: cardinality,`);
        code.writeln(frag`__name__: ${quote(funcName)},`);
        code.writeln(frag`__args__: positionalArgs,`);
        code.writeln(frag`__namedargs__: namedArgs,`);
        code.writeln(frag`toEdgeQL: _.syntax.toEdgeQL`);
      });
      code.writeln(frag`} as any;`);
    });

    code.writeln(frag`};`);

    code.nl();
  }
};

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
          internalName: "$" + makeValidIdent({id: `${i}`, name: param.name}),
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
// - optional -> override return lower cardinality to 0 (product with AtMostOne)
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
      genTypeName: `$${p.internalName}`,
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
      return `$.cardinalityUtil.optionalParamCardinality<${param.genTypeName}>`;
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
