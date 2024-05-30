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
 * `std::distinct`, `std::+`, `std::-`
 */
interface PrefixHomogenousOperator extends BaseOperator {
  type: "PrefixHomogenousOperator";
  operand: CodeFragment[];
}

/**
 * Prefix operators that take a single value and return a boolean
 *
 * @example
 * `std::not`, `std::exists`
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
  rhs: CodeFragment[] | null;
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
 * Binary operators that compare two possibly empty values and return a boolean
 *
 * @example
 * `std::?=`, `std::?!=`
 */
interface InfixOptionalComparisonOperator extends BaseOperator {
  type: "InfixOptionalComparisonOperator";
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
  rhs: CodeFragment[] | null;
}

/**
 * Binary operators that compare two potentially empty container types and return a
 * boolean
 *
 * @example
 * `std::?=`, `std::?!=`
 */
interface InfixOptionalContainerComparisonOperator extends BaseOperator {
  type: "InfixOptionalContainerComparisonOperator";
  lhs: CodeFragment[];
  rhs: CodeFragment[] | null;
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
  rhs: CodeFragment[] | null;
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
  rhs: CodeFragment[] | null;
}

/**
 * Ternary operators that take a boolean and two container types and return a
 * value of the same type based on the boolean
 *
 * @example
 * `std::if_else`
 */
interface TernaryContainerHomogenousOperator extends BaseOperator {
  type: "TernaryContainerHomogenousOperator";
  lhs: CodeFragment[];
  rhs: CodeFragment[] | null;
}

type Operator =
  | PrefixHomogenousOperator
  | PrefixPredicateOperator
  | InfixHomogenousOperator
  | InfixComparisonOperator
  | InfixOptionalComparisonOperator
  | InfixContainerComparisonOperator
  | InfixOptionalContainerComparisonOperator
  | InfixContainerHomogenousOperator
  | TernaryHomogenousOperator
  | TernaryContainerHomogenousOperator;

function operatorFromOpDef(
  typeToCodeFragment: (
    type: FuncopDefOverload<$.introspect.OperatorDef>["params"]["positional"][number]
  ) => CodeFragment[],
  opName: string,
  opDef: FuncopDefOverload<$.introspect.OperatorDef>
): Operator {
  const operatorSymbol =
    opName === "std::if_else"
      ? "if_else"
      : splitName(opDef.originalName).name.toLowerCase();
  const log = debug(`edgedb:codegen:operatorFromOpDef:${opName}`);
  log({
    opName,
    operatorSymbol,
    returnType: opDef.return_type.name,
    anytypes: opDef.anytypes,
  });
  const anytypeIsBaseType = Boolean(opDef.anytypes?.type[0] === "$.BaseType");

  if (opDef.operator_kind === $.OperatorKind.Prefix) {
    // Prefix
    const [operand] = opDef.params.positional;
    if (opDef.return_type.name === "std::bool") {
      // Predicate
      log("PrefixPredicateOperator operand: ", operand);
      return {
        type: "PrefixPredicateOperator",
        operand: typeToCodeFragment(operand),
        operatorSymbol,
      };
    } else {
      // Homogenous
      log("PrefixHomogenousOperator operand: ", operand);
      return {
        type: "PrefixHomogenousOperator",
        operand: typeToCodeFragment(operand),
        operatorSymbol,
      };
    }
  } else if (opDef.operator_kind === $.OperatorKind.Infix) {
    // Infix
    const [lhs, rhs] = opDef.params.positional;
    if (lhs.type.kind === "scalar") {
      // Scalar
      if (opDef.return_type.name === "std::bool") {
        // Comparison
        log("InfixComparisonOperator lhs: ", lhs);
        log("InfixComparisonOperator rhs: ", rhs);
        return {
          type:
            lhs.typemod === "OptionalType"
              ? "InfixOptionalComparisonOperator"
              : "InfixComparisonOperator",
          lhs: typeToCodeFragment(lhs),
          rhs: typeToCodeFragment(rhs),
          operatorSymbol,
        };
      } else {
        // Homogenous
        log("InfixHomogenousOperator lhs: ", lhs);
        return {
          type: "InfixHomogenousOperator",
          lhs: typeToCodeFragment(lhs),
          rhs: lhs.type.id !== rhs.type.id ? typeToCodeFragment(rhs) : null,
          operatorSymbol,
        };
      }
    } else {
      // Container
      if (opDef.return_type.name === "std::bool") {
        // Comparison
        log("InfixContainerComparisonOperator lhs: ", lhs);
        log("InfixContainerComparisonOperator rhs: ", rhs);
        log(
          "InfixContainerComparisonOperator has rhs: ",
          rhs.type.id !== lhs.type.id
        );
        return {
          type:
            lhs.typemod === "OptionalType"
              ? "InfixOptionalContainerComparisonOperator"
              : "InfixContainerComparisonOperator",
          lhs: typeToCodeFragment(lhs),
          rhs: rhs.type.id !== lhs.type.id ? typeToCodeFragment(rhs) : null,
          operatorSymbol,
        };
      } else {
        // Homogenous
        const [lhs, rhs] = opDef.params.positional;
        log(
          "InfixContainerHomogenousOperator lhs: ",
          opDef.params.positional[0]
        );
        return {
          type: "InfixContainerHomogenousOperator",
          lhs: typeToCodeFragment(lhs),
          rhs: rhs.type.id !== lhs.type.id ? typeToCodeFragment(rhs) : null,
          operatorSymbol,
        };
      }
    }
  } else if (opDef.operator_kind === $.OperatorKind.Ternary) {
    // Ternary
    const [lhs, _cond, rhs] = opDef.params.positional;
    if (lhs.type.kind === "scalar" || anytypeIsBaseType) {
      // Scalar
      log("TernaryHomogenousOperator lhs: ", lhs);
      log("TernaryHomogenousOperator rhs: ", rhs);
      return {
        type: "TernaryHomogenousOperator",
        lhs: typeToCodeFragment(lhs),
        rhs: rhs.type.id !== lhs.type.id ? typeToCodeFragment(rhs) : null,
        operatorSymbol,
      };
    } else {
      // Container
      log("TernaryContainerHomogenousOperator lhs: ", lhs);
      log("TernaryContainerHomogenousOperator rhs: ", rhs);
      return {
        type: "TernaryContainerHomogenousOperator",
        lhs: typeToCodeFragment(lhs),
        rhs: rhs.type.id !== lhs.type.id ? typeToCodeFragment(rhs) : null,
        operatorSymbol,
      };
    }
  } else {
    throw new Error(`Unknown operator kind: ${opDef.operator_kind}`);
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

  const prefixPredicateDefs = new StrictMapSet<
    string,
    PrefixPredicateOperator
  >();
  const prefixHomogeneousDefs = new StrictMapSet<
    string,
    PrefixHomogenousOperator
  >();
  const infixHomogeneousDefs = new StrictMapSet<
    string,
    InfixHomogenousOperator
  >();
  const infixComparisonDefs = new StrictMapSet<
    string,
    InfixComparisonOperator
  >();
  const infixOptionalComparisonDefs = new StrictMapSet<
    string,
    InfixOptionalComparisonOperator
  >();
  const infixContainerComparisonDefs = new StrictMapSet<
    string,
    InfixContainerComparisonOperator
  >();
  const infixOptionalContainerComparisonDefs = new StrictMapSet<
    string,
    InfixOptionalContainerComparisonOperator
  >();
  const infixContainerHomogenousDefs = new StrictMapSet<
    string,
    InfixContainerHomogenousOperator
  >();
  const ternaryDefs = new StrictMapSet<string, TernaryHomogenousOperator>();
  const ternaryContainerDefs = new StrictMapSet<
    string,
    TernaryContainerHomogenousOperator
  >();

  for (const [opName, _opDefs] of operators.entries()) {
    if (skipOperators.has(opName)) continue;
    const log = debug(`edgedb:codegen:generateOperators:${opName}`);
    log(
      _opDefs.map((opDef) => ({
        return_type: opDef.return_type,
        return_typemod: opDef.return_typemod,
        params0: opDef.params[0].type,
        params0_typemod: opDef.params[0].typemod,
        params1: opDef.params[1]?.type,
        params1_typemod: opDef.params[1]?.typemod,
        params2: opDef.params[2]?.type,
        params2_typemod: opDef.params[2]?.typemod,
      }))
    );

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
        case "InfixOptionalComparisonOperator":
          infixOptionalComparisonDefs.appendAt(opSymbol, operator);
          break;
        case "InfixContainerComparisonOperator":
          infixContainerComparisonDefs.appendAt(opSymbol, operator);
          break;
        case "InfixOptionalContainerComparisonOperator":
          infixOptionalContainerComparisonDefs.appendAt(opSymbol, operator);
          break;
        case "InfixContainerHomogenousOperator":
          infixContainerHomogenousDefs.appendAt(opSymbol, operator);
          break;
        case "TernaryHomogenousOperator":
          ternaryDefs.appendAt(opSymbol, operator);
          break;
        case "TernaryContainerHomogenousOperator":
          ternaryContainerDefs.appendAt(opSymbol, operator);
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
          overloadsBuf.writeln([t`| { lhs: ${def.lhs}; rhs: ${def.rhs ?? def.lhs} }`]);
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

  // InfixOptionalComparisonOperators
  overloadsBuf.writeln([t`type InfixOptionalComparisonOperators = {`]);
  overloadsBuf.indented(() => {
    for (const [opSymbol, defs] of infixOptionalComparisonDefs.entries()) {
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
  overloadsBuf.writeln([t`type ArgSetOf<LHS, RHS = LHS> =`]);
  overloadsBuf.indented(() => {
    overloadsBuf.writeln([
      t`LHS extends $.TypeSet<$.RangeType<any>> ? { lhs: LHS; rhs: $.TypeSet<$.RangeType<$.getPrimitiveBaseType<LHS["__element__"]["__element__"]>>> }`,
    ]);
    overloadsBuf.writeln([
      t`: LHS extends $.TypeSet<$.MultiRangeType<any>> ? { lhs: LHS; rhs: $.TypeSet<$.MultiRangeType<$.getPrimitiveBaseType<LHS["__element__"]["__element__"]>>> }`,
    ]);
    overloadsBuf.writeln([
      t`: LHS extends $.TypeSet<$.ArrayType<any>> ? { lhs: LHS; rhs: $.TypeSet<$.ArrayType<$.getPrimitiveNonArrayBaseType<LHS["__element__"]["__element__"]>>> }`,
    ]);
    overloadsBuf.writeln([
      t`: LHS extends _.castMaps.orScalarLiteral<$.TypeSet<$.BaseType>> ? { lhs: LHS; rhs:_.castMaps.orScalarLiteral<$.TypeSet<$.getPrimitiveBaseType<_.castMaps.literalToTypeSet<LHS>["__element__"]>>> }`,
    ]);
    overloadsBuf.writeln([t`: { lhs: LHS; rhs: RHS };`]);
  });
  overloadsBuf.writeln([t`type InfixContainerComparisonOperators = {`]);
  overloadsBuf.indented(() => {
    for (const [opSymbol, defs] of infixContainerComparisonDefs.entries()) {
      overloadsBuf.writeln([t`${quote(opSymbol)}: `]);
      overloadsBuf.indented(() => {
        for (const def of defs) {
          if (def.rhs) {
            overloadsBuf.writeln([t`| ArgSetOf<${def.lhs}, ${def.rhs}>`]);
          } else {
            overloadsBuf.writeln([t`| ArgSetOf<${def.lhs}>`]);
          }
        }
      });
    }
  });
  overloadsBuf.writeln([t`};`]);

  // InfixOptionalContainerComparisonOperators
  overloadsBuf.writeln([t`type InfixOptionalContainerComparisonOperators = {`]);
  overloadsBuf.indented(() => {
    for (const [
      opSymbol,
      defs,
    ] of infixOptionalContainerComparisonDefs.entries()) {
      overloadsBuf.writeln([t`${quote(opSymbol)}: `]);
      overloadsBuf.indented(() => {
        for (const def of defs) {
          if (def.rhs) {
            overloadsBuf.writeln([t`| ArgSetOf<${def.lhs}, ${def.rhs}>`]);
          } else {
            overloadsBuf.writeln([t`| ArgSetOf<${def.lhs}>`]);
          }
        }
      });
    }
  });
  overloadsBuf.writeln([t`};`]);

  // InfixContainerHomogeneousOperators
  overloadsBuf.writeln([t`type ArgSetAndReturnOf<LHS, RHS = LHS> =`]);
  overloadsBuf.indented(() => {
    overloadsBuf.writeln([
      t`LHS extends $.TypeSet<$.RangeType<any>> ? { lhs: LHS; rhs: $.TypeSet<$.RangeType<$.getPrimitiveBaseType<LHS["__element__"]["__element__"]>>>; ret: $.RangeType<$.getPrimitiveBaseType<LHS["__element__"]["__element__"]>> }`,
    ]);
    overloadsBuf.writeln([
      t`: LHS extends $.TypeSet<$.MultiRangeType<any>> ? { lhs: LHS; rhs: $.TypeSet<$.MultiRangeType<$.getPrimitiveBaseType<LHS["__element__"]["__element__"]>>>; ret: $.MultiRangeType<$.getPrimitiveBaseType<LHS["__element__"]["__element__"]>> }`,
    ]);
    overloadsBuf.writeln([
      t`: LHS extends $.TypeSet<$.ArrayType<any>> ? { lhs: LHS; rhs: $.TypeSet<$.ArrayType<$.getPrimitiveNonArrayBaseType<LHS["__element__"]["__element__"]>>>; ret: $.ArrayType<$.getPrimitiveNonArrayBaseType<LHS["__element__"]["__element__"]>> }`,
    ]);
    overloadsBuf.writeln([
      t`: LHS extends _.castMaps.orScalarLiteral<$.TypeSet<$.BaseType>> ? { lhs: LHS; rhs:_.castMaps.orScalarLiteral<$.TypeSet<$.getPrimitiveBaseType<_.castMaps.literalToTypeSet<LHS>["__element__"]>>>; ret: $.getPrimitiveBaseType<_.castMaps.literalToTypeSet<LHS>["__element__"]> }`,
    ]);
    overloadsBuf.writeln([
      t`: LHS extends $.TypeSet<$.BaseType> ? RHS extends $.TypeSet<$.BaseType> ? { lhs: LHS; rhs: RHS; ret: $.getPrimitiveBaseType<LHS["__element__"]> } : never`,
    ]);
    overloadsBuf.writeln([t`: never;`]);
  });
  overloadsBuf.writeln([t`type InfixContainerHomogeneousOperators = {`]);
  overloadsBuf.indented(() => {
    for (const [opSymbol, defs] of infixContainerHomogenousDefs.entries()) {
      overloadsBuf.writeln([t`${quote(opSymbol)}: `]);
      overloadsBuf.indented(() => {
        for (const def of defs) {
          if (def.rhs) {
            overloadsBuf.writeln([
              t`| ArgSetAndReturnOf<${def.lhs}, ${def.rhs}>`,
            ]);
          } else {
            overloadsBuf.writeln([t`| ArgSetAndReturnOf<${def.lhs}>`]);
          }
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
          if (def.rhs) {
            overloadsBuf.writeln([t`| { lhs: ${def.lhs}; rhs: ${def.rhs} }`]);
          } else {
            overloadsBuf.writeln([t`| { lhs: ${def.lhs}; rhs: ${def.lhs} }`]);
          }
        }
      });
    }
  });
  overloadsBuf.writeln([t`};`]);

  // TernaryContainerHomogenousOperators
  overloadsBuf.writeln([t`type TernaryContainerHomogeneousOperators = {`]);
  overloadsBuf.indented(() => {
    for (const [opSymbol, defs] of ternaryContainerDefs.entries()) {
      overloadsBuf.writeln([t`${quote(opSymbol)}: `]);
      overloadsBuf.indented(() => {
        for (const def of defs) {
          if (def.rhs) {
            overloadsBuf.writeln([
              t`| ArgSetAndReturnOf<${def.lhs}, ${def.rhs}>`,
            ]);
          } else {
            overloadsBuf.writeln([t`| ArgSetAndReturnOf<${def.lhs}>`]);
          }
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

  // InfixComparisonOperators
  code.writeln([t`function op<`]);
  code.indented(() => {
    code.writeln([t`Op extends keyof InfixComparisonOperators,`]);
    code.writeln([t`LHS extends InfixComparisonOperators[Op]["lhs"],`]);
    code.writeln([t`RHS extends InfixComparisonOperators[Op]["rhs"]`]);
  });
  code.writeln([t`>(lhs: LHS, op: Op, rhs: RHS): $.$expr_Operator<`]);
  code.indented(() => {
    code.writeln([t`_std.$bool,`]);
    code.writeln([
      t`$.cardutil.multiplyCardinalities<$.cardutil.paramCardinality<LHS>, $.cardutil.paramCardinality<RHS>>`,
    ]);
  });
  code.writeln([t`>;`]);

  // InfixOptionalComparisonOperators
  code.writeln([t`function op<`]);
  code.indented(() => {
    code.writeln([t`Op extends keyof InfixOptionalComparisonOperators,`]);
    code.writeln([t`LHS extends InfixOptionalComparisonOperators[Op]["lhs"],`]);
    code.writeln([t`RHS extends InfixOptionalComparisonOperators[Op]["rhs"]`]);
  });
  code.writeln([t`>(lhs: LHS, op: Op, rhs: RHS): $.$expr_Operator<`]);
  code.indented(() => {
    code.writeln([t`_std.$bool,`]);
    code.writeln([
      t`$.cardutil.multiplyCardinalities<$.cardutil.optionalParamCardinality<LHS>, $.cardutil.optionalParamCardinality<RHS>>`,
    ]);
  });
  code.writeln([t`>;`]);

  // InfixContainerComparisonOperators
  code.writeln([t`function op<`]);
  code.indented(() => {
    code.writeln([t`Op extends keyof InfixContainerComparisonOperators,`]);
    code.writeln([
      t`LHS extends InfixContainerComparisonOperators[Op]["lhs"],`,
    ]);
    code.writeln([t`RHS extends InfixContainerComparisonOperators[Op]["rhs"]`]);
  });
  code.writeln([t`>(lhs: LHS, op: Op, rhs: RHS): $.$expr_Operator<`]);
  code.indented(() => {
    code.writeln([t`_std.$bool,`]);
    code.writeln([
      t`$.cardutil.multiplyCardinalities<$.cardutil.paramCardinality<LHS>, $.cardutil.paramCardinality<RHS>>`,
    ]);
  });
  code.writeln([t`>;`]);

  // InfixOptionalContainerComparisonOperators
  code.writeln([t`function op<`]);
  code.indented(() => {
    code.writeln([t`Op extends keyof InfixOptionalContainerComparisonOperators,`]);
    code.writeln([
      t`LHS extends InfixOptionalContainerComparisonOperators[Op]["lhs"],`,
    ]);
    code.writeln([t`RHS extends InfixOptionalContainerComparisonOperators[Op]["rhs"]`]);
  });
  code.writeln([t`>(lhs: LHS, op: Op, rhs: RHS): $.$expr_Operator<`]);
  code.indented(() => {
    code.writeln([t`_std.$bool,`]);
    code.writeln([
      t`$.cardutil.multiplyCardinalities<$.cardutil.optionalParamCardinality<LHS>, $.cardutil.optionalParamCardinality<RHS>>`,
    ]);
  });
  code.writeln([t`>;`]);

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

  // InfixHomogeneousOperators
  code.writeln([t`function op<`]);
  code.indented(() => {
    code.writeln([t`Op extends keyof InfixHomogeneousOperators,`]);
    code.writeln([t`LHS extends InfixHomogeneousOperators[Op]["lhs"],`]);
    code.writeln([t`RHS extends InfixHomogeneousOperators[Op]["rhs"]`]);
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

  // InfixContainerHomogenousOperators
  code.writeln([t`function op<`]);
  code.indented(() => {
    code.writeln([t`Op extends keyof InfixContainerHomogeneousOperators,`]);
    code.writeln([
      t`LHS extends InfixContainerHomogeneousOperators[Op]["lhs"],`,
    ]);
    code.writeln([
      t`RHS extends InfixContainerHomogeneousOperators[Op]["rhs"],`,
    ]);
    code.writeln([
      t`Ret extends InfixContainerHomogeneousOperators[Op]["ret"]`,
    ]);
  });
  code.writeln([t`>(lhs: LHS, op: Op, rhs: RHS): $.$expr_Operator<`]);
  code.indented(() => {
    code.writeln([t`Ret,`]);
    code.writeln([
      t`$.cardutil.multiplyCardinalities<$.cardutil.paramCardinality<LHS>, $.cardutil.paramCardinality<RHS>>`,
    ]);
  });
  code.writeln([t`>;`]);

  // TernaryHomogeneousOperators
  code.writeln([t`function op<`]);
  code.indented(() => {
    code.writeln([t`Op extends keyof TernaryHomogeneousOperators,`]);
    code.writeln([
      t`Cond extends _.castMaps.orScalarLiteral<$.TypeSet<_std.$bool>>,`,
    ]);
    code.writeln([t`LHS extends TernaryHomogeneousOperators[Op]["lhs"],`]);
    code.writeln([t`RHS extends TernaryHomogeneousOperators[Op]["rhs"]`]);
  });
  code.writeln([
    t`>(lhs: LHS, op1: "if", cond: Cond, op2: "else", rhs: RHS): $.$expr_Operator<`,
  ]);
  code.indented(() => {
    code.writeln([
      t`$.getPrimitiveBaseType<_.castMaps.literalToTypeSet<LHS>["__element__"]>,`,
    ]);
    code.writeln([
      t`$.cardutil.multiplyCardinalities<$.cardutil.orCardinalities<$.cardutil.paramCardinality<LHS>, $.cardutil.paramCardinality<RHS>>, $.cardutil.paramCardinality<Cond>>`,
    ]);
  });
  code.writeln([t`>;`]);

  // TernaryContainerHomogeneousOperators
  code.writeln([t`function op<`]);
  code.indented(() => {
    code.writeln([
      t`Cond extends _.castMaps.orScalarLiteral<$.TypeSet<_std.$bool>>,`,
    ]);
    code.writeln([
      t`LHS extends TernaryContainerHomogeneousOperators["if_else"]["lhs"],`,
    ]);
    code.writeln([
      t`RHS extends TernaryContainerHomogeneousOperators["if_else"]["rhs"],`,
    ]);
    code.writeln([
      t`Ret extends TernaryContainerHomogeneousOperators["if_else"]["ret"]`,
    ]);
  });
  code.writeln([
    t`>(lhs: LHS, op1: "if", cond: Cond, op2: "else", rhs: RHS): $.$expr_Operator<`,
  ]);
  code.indented(() => {
    code.writeln([t`Ret,`]);
    code.writeln([
      t`$.cardutil.multiplyCardinalities<$.cardutil.orCardinalities<$.cardutil.paramCardinality<LHS>, $.cardutil.paramCardinality<RHS>>, $.cardutil.paramCardinality<Cond>>`,
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
