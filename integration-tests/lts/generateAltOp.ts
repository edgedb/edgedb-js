import { createClient } from "edgedb";
import { types as getTypes } from "edgedb/dist/reflection/queries/types";
import {
  CodeBuffer,
  CodeFragment,
  dts,
  r,
  t,
  ts,
} from "../../packages/generate/src/builders";
import type { GeneratorParams } from "../../packages/generate/src/genutil";
import { frag, quote, splitName } from "../../packages/generate/src/genutil";
import {
  allowsLiterals,
  generateFuncopDef,
  generateFuncopTypes,
  generateReturnCardinality,
} from "../../packages/generate/src/edgeql-js/generateFunctionTypes";
import {
  getTypesSpecificity,
  sortFuncopOverloads,
  getImplicitCastableRootTypes,
  expandFuncopAnytypeOverloads,
  findPathOfAnytype,
} from "../../packages/generate/src/funcoputil";
import { $ } from "../../packages/generate/src/genutil";
import { getStringRepresentation } from "../../packages/generate/src/edgeql-js/generateObjectTypes";
import { StrictMap } from "edgedb/dist/reflection";
import { FuncopParam } from "edgedb/dist/reflection/queries";

const client = createClient();

const query = `
with module schema,
    O := (select Operator filter .operator_kind = OperatorKind.Infix and not .internal and not .abstract),
group O {
  name,
  annotations: {
    name,
    value := @value,
  } filter .name in {'std::identifier', 'std::description'},
  params: {
    name,
    kind,
    typemod,
    type_id := .type.id,
    type_name := .type.name,
  } order by @index,
  return_type: {id, name},
  return_typemod,
}
by .name;
`;

export function generateOperatorFunctions({
  dir,
  operators,
  types,
  casts,
}: GeneratorParams) {
  generateFuncopTypes(
    dir,
    types,
    casts,
    operators,
    "Operator",
    "OpExpr",
    false,
    (code, opDef, args, namedArgs, returnType) => {
      // Name
      // code.writeln([t`${quote(opDef.originalName)},`]);
      // OperatorKind
      // code.writeln([t`$.OperatorKind.${opDef.operator_kind},`]);
      // Args
      // code.writeln([t`${args}`]);
      // ReturnType
      code.writeln([t`${returnType}`]);
    },
    (code, opName, opDefs) => {
      code.writeln([r`__name__: ${quote(opDefs[0].originalName)},`]);
      code.writeln([r`__opkind__: kind,`]);
      code.writeln([r`__args__: positionalArgs,`]);
    }
  );
}

const skipOperators = new Set<string>([
  "std::index",
  "std::slice",
  "std::destructure",
]);

export function generateOperators({
  dir,
  operators,
  types,
  casts,
}: GeneratorParams) {
  const typeSpecificities = getTypesSpecificity(types, casts);
  const implicitCastableRootTypes = getImplicitCastableRootTypes(casts);
  const code = dir.getPath("operators");

  code.addImportStar("$", "./reflection", { allowFileExt: true });
  code.addImportStar("_", "./imports", { allowFileExt: true });

  const overloadsBuf = new CodeBuffer();

  const overloadDefs: {
    [opKind: string]: { [opSymbol: string]: string[] };
  } = {};
  for (const opKind of Object.values($.OperatorKind)) {
    overloadDefs[opKind] = {};
  }

  const prefixDefs: StrictMap<
    string,
    { operand: CodeFragment[]; ret: CodeFragment[]; retCard: string }[]
  > = new StrictMap();
  const infixDefs: StrictMap<
    string,
    {
      lhs: CodeFragment[];
      rhs: CodeFragment[];
      ret: CodeFragment[];
      retCard: string;
    }[]
  > = new StrictMap();
  const ternaryDefs: StrictMap<
    string,
    {
      cond: CodeFragment[];
      lhs: CodeFragment[];
      rhs: CodeFragment[];
      ret: CodeFragment[];
      retCard: string;
    }[]
  > = new StrictMap();

  for (const [opName, _opDefs] of operators.entries()) {
    if (skipOperators.has(opName)) continue;

    const opDefs = expandFuncopAnytypeOverloads(
      sortFuncopOverloads(_opDefs, typeSpecificities),
      types,
      casts,
      implicitCastableRootTypes
    );

    let overloadIndex = 0;
    for (const opDef of opDefs) {
      const anytypes = opDef.anytypes;
      const anytypeParams: string[] = [];
      const opSymbol =
        opName === "std::if_else"
          ? "if_else"
          : splitName(opDef.originalName).name.toLowerCase();

      if (opDef.overloadIndex === overloadIndex) {
        if (!overloadDefs[opDef.operator_kind][opSymbol]) {
          overloadDefs[opDef.operator_kind][opSymbol] = [];
        }

        overloadDefs[opDef.operator_kind][opSymbol].push(
          generateFuncopDef(opDef)
        );

        overloadIndex++;
      }

      const getParamType = (
        param: (typeof opDef.params.positional)[number]
      ) => {
        const getParamAnytype = (
          paramTypeName: string,
          paramType: $.introspect.Type
        ) => {
          if (!anytypes) return undefined;
          if (anytypes.kind === "castable") {
            if (paramType.name.includes("anytype")) {
              const path = findPathOfAnytype(paramType.id, types);
              anytypeParams.push(`${paramTypeName}${path}`);
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
        };
        const anytype = getParamAnytype(param.typeName, param.type);

        const paramTypeStr = getStringRepresentation(param.type, {
          types,
          anytype,
          casts: casts.implicitCastFromMap,
        });

        let type = frag`$.TypeSet<${paramTypeStr.staticType}>`;

        if (allowsLiterals(param.type, anytypes)) {
          type = frag`_.castMaps.orScalarLiteral<${type}>`;
          // hasLiterals = true;
        }

        return type;
      };
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
        types.get(opDef.return_type.id),
        {
          types,
          anytype: returnAnytype,
        }
      );
      const returnCardinality = generateReturnCardinality(
        opName,
        opDef.params,
        opDef.return_typemod,
        false,
        anytypes
      );

      if (opDef.operator_kind === $.OperatorKind.Prefix) {
        if (!prefixDefs.has(quote(opSymbol))) {
          prefixDefs.set(quote(opSymbol), []);
        }
        const param = opDef.params.positional[0]!;
        const type = getParamType(param);

        prefixDefs.get(quote(opSymbol))!.push({
          operand: type,
          ret: returnType.staticType,
          retCard: returnCardinality,
        });
      } else if (opDef.operator_kind === $.OperatorKind.Infix) {
        if (!infixDefs.has(quote(opSymbol))) {
          infixDefs.set(quote(opSymbol), []);
        }
        const lhs = getParamType(opDef.params.positional[0]!);
        const rhs = getParamType(opDef.params.positional[1]!);

        infixDefs.get(quote(opSymbol))!.push({
          lhs,
          rhs,
          ret: returnType.staticType,
          retCard: returnCardinality,
        });
      } else if (opDef.operator_kind === $.OperatorKind.Ternary) {
        // XXX: This ternary definition isn't right. We have multiple "operators"
        // within the same "operator" for `if`/`then`/`else` or `if`/`else`.
        if (!ternaryDefs.has(quote(opSymbol))) {
          ternaryDefs.set(quote(opSymbol), []);
        }
        const cond = getParamType(opDef.params.positional[0]!);
        const lhs = getParamType(opDef.params.positional[1]!);
        const rhs = getParamType(opDef.params.positional[2]!);

        ternaryDefs.get(quote(opSymbol))!.push({
          cond,
          lhs,
          rhs,
          ret: returnType.staticType,
          retCard: returnCardinality,
        });
      }
    }

    for (const opDef of opDefs) {
      const { params } = opDef;

      const opSymbol =
        opName === "std::if_else"
          ? "if_else"
          : splitName(opDef.originalName).name.toLowerCase();

      if (opDef.overloadIndex === overloadIndex) {
        if (!overloadDefs[opDef.operator_kind][opSymbol]) {
          overloadDefs[opDef.operator_kind][opSymbol] = [];
        }

        overloadDefs[opDef.operator_kind][opSymbol].push(
          generateFuncopDef(opDef)
        );

        overloadIndex++;
      }

      const operatorForms =
        opName === "std::if_else" ? ["PYTHON", "FUNCTIONAL"] : ["NORMAL"];
      for (const operatorForm of operatorForms) {
        if (opDef.description) {
          overloadsBuf.writeln([
            t`/**
* ${opDef.description.replace(/\*\//g, "")}
*/`,
          ]);
        }

        overloadsBuf.writeln([dts`declare `, t`function op<`]);

        const anytypes = opDef.anytypes;
        const anytypeParams: string[] = [];

        const getParamAnytype = (
          paramTypeName: string,
          paramType: $.introspect.Type
        ) => {
          if (!anytypes) return undefined;
          if (anytypes.kind === "castable") {
            if (paramType.name.includes("anytype")) {
              const path = findPathOfAnytype(paramType.id, types);
              anytypeParams.push(`${paramTypeName}${path}`);
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
        };

        // let hasLiterals = false;
        overloadsBuf.indented(() => {
          for (const param of params.positional) {
            const anytype = getParamAnytype(param.typeName, param.type);

            const paramTypeStr = getStringRepresentation(param.type, {
              types,
              anytype,
              casts: casts.implicitCastFromMap,
            });

            let type = frag`$.TypeSet<${paramTypeStr.staticType}>`;

            if (allowsLiterals(param.type, anytypes)) {
              type = frag`_.castMaps.orScalarLiteral<${type}>`;
              // hasLiterals = true;
            }

            overloadsBuf.writeln([t`${param.typeName} extends ${type},`]);
          }
        });

        overloadsBuf.writeln([t`>(`]);

        overloadsBuf.indented(() => {
          const args = params.positional.map(
            (param) => `${param.internalName}: ${param.typeName}`
          );
          switch (opDef.operator_kind) {
            case $.OperatorKind.Infix:
              overloadsBuf.writeln([
                t`${args[0]}, op: ${quote(opSymbol)}, ${args[1]}`,
              ]);
              break;
            case $.OperatorKind.Prefix:
              overloadsBuf.writeln([t`op: ${quote(opSymbol)}, ${args[0]}`]);
              break;
            case $.OperatorKind.Postfix:
              overloadsBuf.writeln([t`${args[0]}, op: ${quote(opSymbol)}`]);
              break;
            case $.OperatorKind.Ternary:
              if (opName === "std::if_else") {
                if (operatorForm === "PYTHON") {
                  overloadsBuf.writeln([
                    t`${args[0]}, op: "if", ${args[1]}, op2: "else", ${args[2]}`,
                  ]);
                } else {
                  overloadsBuf.writeln([
                    t`op: "if", ${args[1]}, op2: "then", ${args[0]}, op3: "else", ${args[2]}`,
                  ]);
                }
              } else {
                throw new Error(`unknown ternary operator: ${opName}`);
              }
              break;
            default:
              throw new Error(`unknown operator kind: ${opDef.operator_kind}`);
          }
        });

        // const paramTypeNames = params.positional
        //   .map(param => param.typeName)
        //   .join(", ");

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
          types.get(opDef.return_type.id),
          {
            types,
            anytype: returnAnytype,
          }
        );

        overloadsBuf.writeln([t`): $.$expr_Operator<`]);
        overloadsBuf.indented(() => {
          // overloadsBuf.writeln([t`${quote(opSymbol)},`]);
          // overloadsBuf.writeln([t`$.OperatorKind.${opDef.operator_kind},`]);
          // overloadsBuf.writeln([
          //   t`${
          //     hasLiterals
          //       ? `_.castMaps.mapLiteralToTypeSet<[${paramTypeNames}]>`
          //       : `[${paramTypeNames}]`
          //   },`
          // ]);
          overloadsBuf.writeln([
            t`${returnType.staticType}, ${generateReturnCardinality(
              opName,
              params,
              opDef.return_typemod,
              false,
              anytypes
            )}`,
          ]);
        });
        overloadsBuf.writeln([t`>;`]);
      }
    }
  }

  // Write out prefix operator mapped type
  overloadsBuf.writeln([t`type PrefixOperators = {`]);
  overloadsBuf.indented(() => {
    for (const [opSymbol, defs] of prefixDefs.entries()) {
      overloadsBuf.writeln([t`${quote(opSymbol)}: `]);
      overloadsBuf.indented(() => {
        for (const def of defs) {
          overloadsBuf.writeln([
            t`| { operand: ${def.operand}; ret: ${def.ret}; retCard: ${def.retCard} }`,
          ]);
        }
      });
    }
  });
  overloadsBuf.writeln([t`};`]);

  // Write out infix operator mapped type
  overloadsBuf.writeln([t`type InfixOperators = {`]);
  overloadsBuf.indented(() => {
    for (const [opSymbol, defs] of infixDefs.entries()) {
      overloadsBuf.writeln([t`${quote(opSymbol)}: `]);
      overloadsBuf.indented(() => {
        for (const def of defs) {
          overloadsBuf.writeln([
            t`| { lhs: ${def.lhs}; rhs: ${def.rhs}; ret: ${def.ret}; retCard: ${def.retCard} }`,
          ]);
        }
      });
    }
  });
  overloadsBuf.writeln([t`};`]);

  // Write out ternary operator mapped type
  overloadsBuf.writeln([t`type TernaryOperators = {`]);
  overloadsBuf.indented(() => {
    for (const [opSymbol, defs] of ternaryDefs.entries()) {
      overloadsBuf.writeln([t`${quote(opSymbol)}: `]);
      overloadsBuf.indented(() => {
        for (const def of defs) {
          overloadsBuf.writeln([
            t`| { cond: ${def.cond}; lhs: ${def.lhs}; rhs: ${def.rhs}; ret: ${def.ret}; retCard: ${def.retCard} }`,
          ]);
        }
      });
    }
  });
  overloadsBuf.writeln([t`};`]);

  code.nl();
  code.writeln([
    r`const overloadDefs`,
    ts`: {
  [opKind in 'Infix' | 'Prefix' | 'Postfix' | 'Ternary']: {
    [opSymbol: string]: any[]
  }
}`,
    r` = {`,
  ]);
  code.indented(() => {
    for (const opKind of Object.keys(overloadDefs)) {
      code.writeln([r`${opKind}: {`]);
      code.indented(() => {
        for (const symbol of Object.keys(overloadDefs[opKind])) {
          code.writeln([r`${quote(symbol)}: [`]);
          code.indented(() => {
            for (const overloadDef of overloadDefs[opKind][symbol]) {
              code.writeln([r`${overloadDef},`]);
            }
          });
          code.writeln([r`],`]);
        }
      });
      code.writeln([r`},`]);
    }
  });
  code.writeln([r`};`]);
  code.nl();

  code.writeBuf(overloadsBuf);

  // Three operator forms overloads
  code.nl();
  // Prefix
  code.writeln([t`function op<`]);
  code.indented(() => {
    code.writeln([t`Op extends keyof PrefixOperators,`]);
    code.writeln([t`Operand extends PrefixOperators[Op]["operand"]`]);
  });
  code.writeln([
    t`>(op: Op, operand: Operand): $.$expr_Operator<PrefixOperators[Op]["ret"], PrefixOperators[Op]["retCard"]>;`,
  ]);
  // Infix
  code.writeln([t`function op<`]);
  code.indented(() => {
    code.writeln([t`Op extends keyof InfixOperators,`]);
    code.writeln([t`LHS extends InfixOperators[Op]["lhs"],`]);
    code.writeln([t`RHS extends InfixOperators[Op]["rhs"]`]);
  });
  code.writeln([
    t`>(lhs: LHS, op: Op, rhs: RHS): $.$expr_Operator<InfixOperators[Op]["ret"], InfixOperators[Op]["retCard"]>;`,
  ]);
  // Ternary
  code.writeln([t`function op<`]);
  code.indented(() => {
    code.writeln([t`Op extends keyof TernaryOperators,`]);
    code.writeln([t`Cond extends TernaryOperators[Op]["cond"],`]);
    code.writeln([t`LHS extends TernaryOperators[Op]["lhs"],`]);
    code.writeln([t`RHS extends TernaryOperators[Op]["rhs"]`]);
  });
  code.writeln([
    t`>(lhs: LHS, "if", cond: Cond, "else", rhs: RHS): $.$expr_Operator<TernaryOperators[Op]["ret"], TernaryOperators[Op]["retCard"]>;`,
  ]);

  // implementation
  code.writeln([r`function op(...args`, ts`: any[]`, r`) {`]);
  code.indented(() => {
    code.writeln([
      r`let op`,
      ts`: string`,
      r` = "";
  let params`,
      ts`: any[]`,
      r` = [];
  let defs`,
      ts`: any[] | null | undefined`,
      r` = null;
  if (args.length === 2) {
    if (typeof args[0] === "string" && overloadDefs.Prefix[args[0]]) {
      op = args[0];
      params = [args[1]];
      defs = overloadDefs.Prefix[op];
    } else if (typeof args[1] === "string" && overloadDefs.Postfix[args[1]]) {
      op = args[1];
      params = [args[0]];
      defs = overloadDefs.Postfix[op];
    }
  } else if (args.length === 3) {
    if (typeof args[1] === "string") {
      op = args[1];
      params = [args[0], args[2]];
      defs = overloadDefs.Infix[op];
    }
  } else if (args.length === 5) {
    if (typeof args[1] === "string" && typeof args[3] === "string") {
      // Python-style if-else
      op = \`\${args[1]}_\${args[3]}\`;
      params = [args[0], args[2], args[4]];
      defs = overloadDefs.Ternary[op];
    }
  } else if (args.length === 6) {
    // Functional-style if-then-else
    if (typeof args[0] === "string" && typeof args[2] === "string" && typeof args[4] === "string") {
      op = \`\${args[0]}_\${args[4]}\`;
      params = [args[3], args[1], args[5]];
      defs = overloadDefs.Ternary[op];
    }
  }

  if (!defs) {
    throw new Error(\`No operator exists with signature: \${args.map(arg => \`\${arg}\`).join(", ")}\`);
  }`,
    ]);

    code.nl();
    code.writeln([
      r`const {kind, returnType, cardinality, args: resolvedArgs} = _.syntax.$resolveOverload(op, params, _.spec, defs);`,
    ]);
    code.nl();
    code.writeln([r`return _.syntax.$expressionify({`]);
    code.indented(() => {
      code.writeln([r`__kind__: $.ExpressionKind.Operator,`]);
      code.writeln([r`__element__: returnType,`]);
      code.writeln([r`__cardinality__: cardinality,`]);
      code.writeln([r`__name__: op,`]);
      code.writeln([r`__opkind__: kind,`]);
      code.writeln([r`__args__: resolvedArgs,`]);
    });
    code.writeln([r`})`, ts` as any`, r`;`]);
  });
  code.writeln([r`};`]);

  code.addExport("op");
}

type Operator = {
  key: {
    name: string;
  };
  grouping: string[];
  elements: {
    name: string;
    annotations: {
      name: string;
      value: string;
    }[];
    params: {
      name: string;
      kind: string;
      typemod: string;
      type_id: string;
      type_name: string;
    }[];
    return_type: {
      id: string;
      name: string;
    };
    return_typemod: string;
  }[];
};

async function main() {
  const operators = await client.query<Operator>(query);
  const types = await getTypes(client);

  let infixOperators = ts.factory.createTypeLiteralNode([]);

  for (const { elements } of operators) {
    const operatorTypes = elements.reduce((acc, element) => {
      const operatorType = ts.factory.createTypeLiteralNode([
        ts.factory.createPropertySignature(
          undefined,
          ts.factory.createIdentifier("lhs"),
          undefined,
          ts.factory.createTypeReferenceNode(
            ts.factory.createQualifiedName(
              ts.factory.createIdentifier("castMaps"),
              "orScalarLiteral"
            ),
            [
              ts.factory.createTypeReferenceNode(
                ts.factory.createQualifiedName(
                  ts.factory.createIdentifier("$"),
                  "TypeSet"
                ),
                [
                  ts.factory.createTypeReferenceNode(
                    ts.factory.createIdentifier(element.params[0].type_name),
                    undefined
                  ),
                ]
              ),
            ]
          )
        ),
        ts.factory.createPropertySignature(
          undefined,
          ts.factory.createIdentifier("rhs"),
          undefined,
          ts.factory.createTypeReferenceNode(
            ts.factory.createQualifiedName(
              ts.factory.createIdentifier("castMaps"),
              "orScalarLiteral"
            ),
            [
              ts.factory.createTypeReferenceNode(
                ts.factory.createQualifiedName(
                  ts.factory.createIdentifier("$"),
                  "TypeSet"
                ),
                [
                  ts.factory.createTypeReferenceNode(
                    ts.factory.createIdentifier(element.params[1].type_name),
                    undefined
                  ),
                ]
              ),
            ]
          )
        ),
        ts.factory.createPropertySignature(
          undefined,
          ts.factory.createIdentifier("result"),
          undefined,
          ts.factory.createTypeReferenceNode(
            ts.factory.createIdentifier(element.return_type.name),
            undefined
          )
        ),
      ]);

      return ts.factory.createUnionTypeNode([...acc.types, operatorType]);
    }, ts.factory.createUnionTypeNode([]));

    infixOperators = ts.factory.createTypeLiteralNode([
      ...infixOperators.members,
      ts.factory.createPropertySignature(
        undefined,
        ts.factory.createStringLiteral(elements[0].name.split("::").at(-1)!),
        undefined,
        operatorTypes
      ),
    ]);
  }
  const lookupMap = ts.factory.createTypeAliasDeclaration(
    undefined,
    ts.factory.createIdentifier("InfixOperators"),
    undefined,
    infixOperators
  );

  const result = printer.printNode(
    ts.EmitHint.Unspecified,
    lookupMap,
    sourceFile
  );

  fs.writeFileSync("infix-operators.ts", result);
}

main();
