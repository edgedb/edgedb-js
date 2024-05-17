import { StrictMapSet } from "edgedb/dist/reflection";
import debug from "debug";

import { CodeBuffer, CodeFragment, r, t, ts } from "../builders";
import type { GeneratorParams } from "../genutil";
import { frag, quote, splitName } from "../genutil";
import {
  allowsLiterals,
  generateFuncopDef,
  generateFuncopTypes,
} from "./generateFunctionTypes";
import {
  getTypesSpecificity,
  sortFuncopOverloads,
  getImplicitCastableRootTypes,
  expandFuncopAnytypeOverloads,
  findPathOfAnytype,
  FuncopDefOverload,
} from "../funcoputil";
import { $ } from "../genutil";
import { getStringRepresentation } from "./generateObjectTypes";

const log = debug("edgedb:codegen:generateAltOp");

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

interface BaseOperator {
  operatorSymbol: string;
}

/**
 * Prefix operators that take a single value and return a single value
 *
 * @example
 * `std::not`, `std::distinct`, `std::+`, `std::-`
 */
interface PrefixHomogenousOperator extends BaseOperator {
  type: "PrefixHomogenousOperator";
  operand: CodeFragment[];
}

/**
 * Prefix operators that take a single value and return a boolean
 *
 * @example
 * `std::exists`
 */
interface PrefixPredicateOperator extends BaseOperator {
  type: "PrefixPredicateOperator";
  operand: CodeFragment[];
}

/**
 * Binary operators that take two values of the same type and return a value of
 * the same type
 *
 * @example
 * `std::+`, `std::*`, `std::++`
 */
interface InfixHomogenousOperator extends BaseOperator {
  type: "InfixHomogenousOperator";
  lhs: CodeFragment[];
}

/**
 * Binary operators that compare two values and return a boolean
 *
 * @example
 * `std::=`, `std::!=`, `std::>`, `std::<`
 */
// Such as `std::=`, `std::!=`, `std::>`, `std::<`
interface InfixComparisonOperator extends BaseOperator {
  type: "InfixComparisonOperator";
  lhs: CodeFragment[];
  rhs: CodeFragment[];
}

/**
 * Binary operators that compare two container types and return a boolean
 *
 * @example
 * `std::=`, `std::!=`, `std::in`, `std::not in`
 */
interface InfixContainerComparisonOperator extends BaseOperator {
  type: "InfixContainerComparisonOperator";
  lhs: CodeFragment[];
}

/**
 * Binary operators that take two container types and return a value of the same
 * type
 *
 * @example
 * `std::??`, `std::+`, `std::++`
 */
interface InfixContainerHomogenousOperator extends BaseOperator {
  type: "InfixContainerHomogenousOperator";
  lhs: CodeFragment[];
}

/**
 * Ternary operators that take a boolean and two values of the same type and
 * return a value of the same type based on the boolean
 *
 * @example
 * `std::if_else`
 */
interface TernaryHomogenousOperator extends BaseOperator {
  type: "TernaryHomogenousOperator";
  lhs: CodeFragment[];
}

type Operator =
  | PrefixHomogenousOperator
  | PrefixPredicateOperator
  | InfixHomogenousOperator
  | InfixComparisonOperator
  | InfixContainerComparisonOperator
  | InfixContainerHomogenousOperator
  | TernaryHomogenousOperator;

function operatorFromOpDef(
  typeToCodeFragment: (
    type: FuncopDefOverload<$.introspect.OperatorDef>["params"]["positional"][number]
  ) => CodeFragment[],
  opName: string,
  opDef: FuncopDefOverload<$.introspect.OperatorDef>
): Operator {
  log("operatorFromOpDef called with opName:", opName, "and opDef:", opDef);

  const operatorSymbol =
    opName === "std::if_else"
      ? "if_else"
      : splitName(opDef.originalName).name.toLowerCase();
  log("Determined operatorSymbol:", operatorSymbol);

  if (opDef.operator_kind === $.OperatorKind.Prefix) {
    log("Processing Prefix operator");
    log("Return type:", opDef.return_type.name);
    // Prefix
    if (opDef.return_type.name === "bool") {
      // Predicate
      log("Prefix operator is a Predicate");
      return {
        type: "PrefixPredicateOperator",
        operand: typeToCodeFragment(opDef.params.positional[0]),
        operatorSymbol,
      };
    } else {
      // Homogenous
      log("Prefix operator is Homogenous");
      return {
        type: "PrefixHomogenousOperator",
        operand: typeToCodeFragment(opDef.params.positional[0]),
        operatorSymbol,
      };
    }
  } else if (opDef.operator_kind === $.OperatorKind.Infix) {
    // Infix
    log("Processing Infix operator");
    const lhs = opDef.params.positional[0].type;
    log("Infix operator LHS type:", lhs);
    log("Return type:", opDef.return_type.name);
    if (lhs.kind === "scalar") {
      // Scalar
      log("LHS is a scalar type");
      if (opDef.return_type.name === "std::bool") {
        // Comparison
        log("Infix scalar operator is a Comparison");
        return {
          type: "InfixComparisonOperator",
          lhs: typeToCodeFragment(opDef.params.positional[0]),
          rhs: typeToCodeFragment(opDef.params.positional[1]),
          operatorSymbol,
        };
      } else {
        // Homogenous
        log("Infix scalar operator is Homogenous");
        return {
          type: "InfixHomogenousOperator",
          lhs: typeToCodeFragment(opDef.params.positional[0]),
          operatorSymbol,
        };
      }
    } else {
      // Container
      log("LHS is a container type");
      if (opDef.return_type.name === "std::bool") {
        // Comparison
        log("Infix container operator is a Comparison");
        return {
          type: "InfixContainerComparisonOperator",
          lhs: typeToCodeFragment(opDef.params.positional[0]),
          operatorSymbol,
        };
      } else {
        // Homogenous
        log("Infix container operator is Homogenous");
        return {
          type: "InfixContainerHomogenousOperator",
          lhs: typeToCodeFragment(opDef.params.positional[0]),
          operatorSymbol,
        };
      }
    }
  } else {
    // Ternary
    log("Processing Ternary operator");
    log("Return type:", opDef.return_type.name);
    return {
      type: "TernaryHomogenousOperator",
      lhs: typeToCodeFragment(opDef.params.positional[0]),
      operatorSymbol,
    };
  }
}

export function generateOperators({
  dir,
  operators,
  types,
  casts,
}: GeneratorParams) {
  const typeSpecificities = getTypesSpecificity(types, casts);
  const implicitCastableRootTypes = getImplicitCastableRootTypes(casts);
  const code = dir.getPath("alt-operators");

  code.addImportStar("$", "./reflection", { allowFileExt: true });
  code.addImportStar("_", "./imports", { allowFileExt: true });

  const overloadsBuf = new CodeBuffer();

  const overloadDefs: {
    [opKind: string]: { [opSymbol: string]: string[] };
  } = {};
  for (const opKind of Object.values($.OperatorKind)) {
    overloadDefs[opKind] = {};
  }

  const prefixPredicateDefs: StrictMapSet<string, PrefixPredicateOperator> =
    new StrictMapSet();
  const prefixHomogeneousDefs: StrictMapSet<string, PrefixHomogenousOperator> =
    new StrictMapSet();
  const infixHomogeneousDefs: StrictMapSet<string, InfixHomogenousOperator> =
    new StrictMapSet();
  const infixComparisonDefs: StrictMapSet<string, InfixComparisonOperator> =
    new StrictMapSet();
  const infixContainerComparisonDefs: StrictMapSet<
    string,
    InfixContainerComparisonOperator
  > = new StrictMapSet();
  const infixContainerHomogenousDefs: StrictMapSet<
    string,
    InfixContainerHomogenousOperator
  > = new StrictMapSet();
  const ternaryDefs: StrictMapSet<string, TernaryHomogenousOperator> =
    new StrictMapSet();

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

      const anytypes = opDef.anytypes;
      const anytypeParams: string[] = [];

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
      /*
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
      */

      const operator = operatorFromOpDef(getParamType, opName, opDef);
      switch (operator.type) {
        case "PrefixPredicateOperator":
          prefixPredicateDefs.appendAt(opSymbol, operator);
          break;
        case "PrefixHomogenousOperator":
          prefixHomogeneousDefs.appendAt(opSymbol, operator);
          break;
        case "InfixHomogenousOperator":
          infixHomogeneousDefs.appendAt(opSymbol, operator);
          break;
        case "InfixComparisonOperator":
          infixComparisonDefs.appendAt(opSymbol, operator);
          break;
        case "InfixContainerComparisonOperator":
          infixContainerComparisonDefs.appendAt(opSymbol, operator);
          break;
        case "InfixContainerHomogenousOperator":
          infixContainerHomogenousDefs.appendAt(opSymbol, operator);
          break;
        case "TernaryHomogenousOperator":
          ternaryDefs.appendAt(opSymbol, operator);
          break;
      }
    }
  }

  // PrefixPredicateOperators
  overloadsBuf.writeln([t`type PrefixPredicateOperators = {`]);
  overloadsBuf.indented(() => {
    for (const [opSymbol, defs] of prefixPredicateDefs.entries()) {
      overloadsBuf.writeln([t`${quote(opSymbol)}: `]);
      overloadsBuf.indented(() => {
        for (const def of defs) {
          overloadsBuf.writeln([t`| { operand: ${def.operand} }`]);
        }
      });
    }
  });
  overloadsBuf.writeln([t`};`]);

  // PrefixHomogenousOperators
  overloadsBuf.writeln([t`type PrefixHomogeneousOperators = {`]);
  overloadsBuf.indented(() => {
    for (const [opSymbol, defs] of prefixHomogeneousDefs.entries()) {
      overloadsBuf.writeln([t`${quote(opSymbol)}: `]);
      overloadsBuf.indented(() => {
        for (const def of defs) {
          overloadsBuf.writeln([t`| { operand: ${def.operand} }`]);
        }
      });
    }
  });
  overloadsBuf.writeln([t`};`]);

  // InfixHomogenousOperators
  overloadsBuf.writeln([t`type InfixHomogeneousOperators = {`]);
  overloadsBuf.indented(() => {
    for (const [opSymbol, defs] of infixHomogeneousDefs.entries()) {
      overloadsBuf.writeln([t`${quote(opSymbol)}: `]);
      overloadsBuf.indented(() => {
        for (const def of defs) {
          overloadsBuf.writeln([t`| { lhs: ${def.lhs} }`]);
        }
      });
    }
  });
  overloadsBuf.writeln([t`};`]);

  // InfixComparisonOperators
  overloadsBuf.writeln([t`type InfixComparisonOperators = {`]);
  overloadsBuf.indented(() => {
    for (const [opSymbol, defs] of infixComparisonDefs.entries()) {
      overloadsBuf.writeln([t`${quote(opSymbol)}: `]);
      overloadsBuf.indented(() => {
        for (const def of defs) {
          overloadsBuf.writeln([t`| { lhs: ${def.lhs}; rhs: ${def.rhs} }`]);
        }
      });
    }
  });
  overloadsBuf.writeln([t`};`]);

  // InfixContainerComparisonOperators
  overloadsBuf.writeln([t`type InfixContainerComparisonOperators = {`]);
  overloadsBuf.indented(() => {
    for (const [opSymbol, defs] of infixContainerComparisonDefs.entries()) {
      overloadsBuf.writeln([t`${quote(opSymbol)}: `]);
      overloadsBuf.indented(() => {
        for (const def of defs) {
          overloadsBuf.writeln([t`| { lhs: ${def.lhs} }`]);
        }
      });
    }
  });
  overloadsBuf.writeln([t`};`]);

  // InfixContainerHomogenousOperators
  overloadsBuf.writeln([t`type InfixContainerHomogeneousOperators = {`]);
  overloadsBuf.indented(() => {
    for (const [opSymbol, defs] of infixContainerHomogenousDefs.entries()) {
      overloadsBuf.writeln([t`${quote(opSymbol)}: `]);
      overloadsBuf.indented(() => {
        for (const def of defs) {
          overloadsBuf.writeln([t`| { lhs: ${def.lhs} }`]);
        }
      });
    }
  });
  overloadsBuf.writeln([t`};`]);

  // TernaryHomogenousOperators
  overloadsBuf.writeln([t`type TernaryHomogeneousOperators = {`]);
  overloadsBuf.indented(() => {
    for (const [opSymbol, defs] of ternaryDefs.entries()) {
      overloadsBuf.writeln([t`${quote(opSymbol)}: `]);
      overloadsBuf.indented(() => {
        for (const def of defs) {
          overloadsBuf.writeln([t`| { lhs: ${def.lhs} }`]);
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

  code.nl();

  // PrefixHomogeneousOperators
  code.writeln([t`function op<`]);
  code.indented(() => {
    code.writeln([t`Op extends keyof PrefixHomogeneousOperators,`]);
    code.writeln([
      t`Operand extends PrefixHomogeneousOperators[Op]["operand"]`,
    ]);
  });
  code.writeln([t`>(op: Op, operand: Operand): $.$expr_Operator<`]);
  code.indented(() => {
    code.writeln([
      t`$.getPrimitiveBaseType<_.castMaps.literalToTypeSet<Op>["__element__"]>,`,
    ]);
    code.writeln([t`$.cardutil.paramCardinality<Operand>`]);
  });
  code.writeln([t`>;`]);

  // PrefixPredicateOperators
  code.writeln([t`function op<`]);
  code.indented(() => {
    code.writeln([t`Op extends keyof PrefixPredicateOperators,`]);
    code.writeln([t`Operand extends PrefixPredicateOperators[Op]["operand"]`]);
  });
  code.writeln([t`>(op: Op, operand: Operand): $.$expr_Operator<`]);
  code.indented(() => {
    code.writeln([t`_std.$bool,`]);
    code.writeln([t`$.cardutil.paramCardinality<Operand>`]);
  });
  code.writeln([t`>;`]);

  // InfixHomogeneousOperators
  code.writeln([t`function op<`]);
  code.indented(() => {
    code.writeln([t`Op extends keyof InfixHomogeneousOperators,`]);
    code.writeln([t`LHS extends InfixHomogeneousOperators[Op]["lhs"],`]);
    code.writeln([t`RHS extends LHS`]);
  });
  code.writeln([t`>(lhs: LHS, op: Op, rhs: RHS): $.$expr_Operator<`]);
  code.indented(() => {
    code.writeln([
      t`$.getPrimitiveBaseType<_.castMaps.literalToTypeSet<Op>["__element__"]>,`,
    ]);
    code.writeln([
      t`$.cardutil.multiplyCardinalities<$.cardutil.paramCardinality<LHS>, $.cardutil.paramCardinality<RHS>>`,
    ]);
  });
  code.writeln([t`>;`]);

  // InfixComparisonOperators
  code.writeln([t`function op<`]);
  code.indented(() => {
    code.writeln([t`Op extends keyof InfixComparisonOperators,`]);
    code.writeln([t`LHS extends InfixComparisonOperators[Op]["lhs"],`]);
    code.writeln([t`RHS extends LHS`]);
  });
  code.writeln([t`>(lhs: LHS, op: Op, rhs: RHS): $.$expr_Operator<`]);
  code.indented(() => {
    code.writeln([t`_std.$bool,`]);
    code.writeln([
      t`$.cardutil.multiplyCardinalities<$.cardutil.paramCardinality<LHS>, $.cardutil.paramCardinality<RHS>>`,
    ]);
  });
  code.writeln([t`>;`]);

  // InfixContainerHomogenousOperators
  code.writeln([t`function op<`]);
  code.indented(() => {
    code.writeln([t`Op extends keyof InfixContainerHomogeneousOperators,`]);
    code.writeln([
      t`LHS extends InfixContainerHomogeneousOperators[Op]["lhs"],`,
    ]);
    code.writeln([
      t`RHS extends $.TypeSet<$.ArrayType<$.getPrimitiveNonArrayBaseType<LHS["__element__"]["__element__"]>>>`,
    ]);
  });
  code.writeln([t`>(lhs: LHS, op: Op, rhs: LHS): $.$expr_Operator<`]);
  code.indented(() => {
    code.writeln([
      t`$.ArrayType<_.syntax.getSharedParentPrimitive<LHS["__element__"]["__element__"], RHS["__element__"]["__element__"]>>,`,
    ]);
    code.writeln([
      t`$.cardutil.multiplyCardinalities<$.cardutil.paramCardinality<LHS>, $.cardutil.paramCardinality<RHS>>`,
    ]);
  });
  code.writeln([t`>;`]);

  // InfixContainerComparisonOperators
  code.writeln([t`function op<`]);
  code.indented(() => {
    code.writeln([t`Op extends keyof InfixContainerComparisonOperators,`]);
    code.writeln([t`LHS extends InfixContainerComparisonOperators[Op]["lhs"],`]);
    code.writeln([t`RHS extends LHS`]);
  });
  code.writeln([t`>(lhs: LHS, op: Op, rhs: RHS): $.$expr_Operator<`]);
  code.indented(() => {
    code.writeln([t`_std.$bool,`]);
    code.writeln([
      t`$.cardutil.multiplyCardinalities<$.cardutil.paramCardinality<LHS>, $.Cardinality.One>`,
    ]);
  });
  code.writeln([t`>;`]);

  // TernaryHomogeneousOperators
  code.writeln([t`function op<`]);
  code.indented(() => {
    code.writeln([t`Cond extends _.castMaps.orScalarLiteral<$.TypeSet<_std.$bool>>,`]);
    code.writeln([t`LHS extends TernaryHomogeneousOperators["if_else"]["lhs"],`]);
    code.writeln([t`RHS extends LHS`]);
  });
  code.writeln([
    t`>(lhs: LHS, op1: "if", cond: Cond, op2: "else", rhs: RHS): $.$expr_Operator<`,
  ]);
  code.indented(() => {
    code.writeln([
      t`_.syntax.getSharedParentPrimitive<LHS["__element__"], RHS["__element__"]>,`,
    ]);
    code.writeln([
      t`$.cardutil.multiplyCardinalities<$.cardutil.orCardinalities<$.cardutil.paramCardinality<LHS>, $.cardutil.paramCardinality<RHS>>, $.cardutil.paramCardinality<Cond>`,
    ]);
  });
  code.writeln([t`>;`]);

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
