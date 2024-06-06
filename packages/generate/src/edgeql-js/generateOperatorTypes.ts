import { StrictMapSet } from "edgedb/dist/reflection";
import debug from "debug";

import { CodeBuffer, type CodeFragment, r, t, ts } from "../builders";
import type { GeneratorParams } from "../genutil";
import { frag, quote, splitName } from "../genutil";
import {
  allowsLiterals,
  generateFuncopDef,
  generateFuncopTypes,
  generateReturnCardinality,
} from "./generateFunctionTypes";
import {
  getTypesSpecificity,
  sortFuncopOverloads,
  getImplicitCastableRootTypes,
  expandFuncopAnytypeOverloads,
  findPathOfAnytype,
  type FuncopDefOverload,
  type AnytypeDef,
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
    (code, _opDef, _args, _namedArgs, returnType) => {
      // Name
      // code.writeln([t`${quote(opDef.originalName)},`]);
      // OperatorKind
      // code.writeln([t`$.OperatorKind.${opDef.operator_kind},`]);
      // Args
      // code.writeln([t`${args}`]);
      // ReturnType
      code.writeln([t`${returnType}`]);
    },
    (code, _opName, opDefs) => {
      code.writeln([r`__name__: ${quote(opDefs[0].originalName)},`]);
      code.writeln([r`__opkind__: kind,`]);
      code.writeln([r`__args__: positionalArgs,`]);
    },
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
  typemod: $.introspect.FuncopTypemod;
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
  retCard: CodeFragment[];
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
  retCard: CodeFragment[];
}

/**
 * Binary operators that compare two container types and return a boolean
 *
 * @example
 * `std::=`, `std::!=`, `std::in`, `std::not in`
 */
interface InfixContainerComparisonOperator extends BaseOperator {
  type: "InfixContainerComparisonOperator";
  args: CodeFragment[];
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
  args: CodeFragment[];
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
  args: CodeFragment[];
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

// Special Cases
/**
 * std::coalesce
 */
interface CoalesceScalarOperator extends BaseOperator {
  type: "CoalesceScalarOperator";
  lhs: CodeFragment[];
}

interface CoalesceContainerOperator extends BaseOperator {
  type: "CoalesceContainerOperator";
  lhs: CodeFragment[];
}

interface CoalesceObjectOperator extends BaseOperator {
  type: "CoalesceObjectOperator";
  lhs: CodeFragment[];
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
  | TernaryContainerHomogenousOperator

  // Special Cases
  | CoalesceScalarOperator
  | CoalesceContainerOperator
  | CoalesceObjectOperator;

type OverloadArg =
  FuncopDefOverload<$.introspect.OperatorDef>["params"]["positional"][number];

function operatorFromOpDef(
  typeToCodeFragment: (type: OverloadArg) => CodeFragment[],
  opName: string,
  opDef: FuncopDefOverload<$.introspect.OperatorDef>,
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
  if (opName === "std::coalesce") {
    const [lhs] = opDef.params.positional;
    if (opDef.anytypes?.kind === "noncastable") {
      return {
        type: "CoalesceScalarOperator",
        lhs: typeToCodeFragment(lhs),
        operatorSymbol,
      };
    } else if (
      opDef.anytypes?.returnAnytypeWrapper === "_.syntax.mergeObjectTypes"
    ) {
      return {
        type: "CoalesceObjectOperator",
        lhs: typeToCodeFragment(lhs),
        operatorSymbol,
      };
    } else {
      return {
        type: "CoalesceContainerOperator",
        lhs: typeToCodeFragment(lhs),
        operatorSymbol,
      };
    }
  }
  const getArgsFromAnytypes = (
    anytypes: AnytypeDef | null,
    lhsType: OverloadArg,
    rhsType: OverloadArg,
  ): CodeFragment[] => {
    if (anytypes && anytypes.kind === "noncastable") {
      if (anytypes.typeObj.kind === "range") {
        return frag`infixOperandsRangeType<${typeToCodeFragment(lhsType)}>`;
      } else if (anytypes.typeObj.kind === "array") {
        return frag`infixOperandsArrayTypeNonArray<${typeToCodeFragment(
          lhsType,
        )}>`;
      } else if (anytypes.typeObj.kind === "unknown") {
        return frag`infixOperandsBaseType<${typeToCodeFragment(lhsType)}>`;
      }
    }

    return frag`{ lhs: ${typeToCodeFragment(lhsType)}; rhs: ${typeToCodeFragment(rhsType)} }`;
  };

  const getReturnTypeFromArgsAndAnytypes = (
    anytypes: AnytypeDef | null,
    argsFragments: CodeFragment[],
  ): CodeFragment[] => {
    if (anytypes) {
      if (anytypes.kind === "noncastable") {
        if (anytypes.typeObj.kind === "range") {
          return frag`operandsRangeTypeToReturnType<${argsFragments}>`;
        } else if (anytypes.typeObj.kind === "array") {
          return frag`operandsArrayTypeNonArrayToReturnType<${argsFragments}>`;
        } else if (anytypes.typeObj.kind === "unknown") {
          return frag`operandsBaseTypeToReturnType<${argsFragments}>`;
        }
      } else {
        return frag`operandsContainerToReturnType<${argsFragments}>`;
      }
    }

    return argsFragments;
  };

  const anytypeIsBaseType = Boolean(opDef.anytypes?.type[0] === "$.BaseType");

  if (opDef.operator_kind === $.OperatorKind.Prefix) {
    // Prefix
    const [operand] = opDef.params.positional;
    if (opDef.return_type.name === "std::bool") {
      // Predicate
      log("PrefixPredicateOperator operand: %o", operand);
      return {
        type: "PrefixPredicateOperator",
        operand: typeToCodeFragment(operand),
        typemod: operand.typemod,
        operatorSymbol,
      };
    } else {
      // Homogenous
      log("PrefixHomogenousOperator operand: %o", operand);
      return {
        type: "PrefixHomogenousOperator",
        operand: typeToCodeFragment(operand),
        operatorSymbol,
      };
    }
  } else if (opDef.operator_kind === $.OperatorKind.Infix) {
    // Infix
    const [lhsType, rhsType] = opDef.params.positional;
    if (lhsType.type.kind === "scalar") {
      // Scalar
      if (opDef.return_type.name === "std::bool") {
        // Comparison
        const retCard = generateReturnCardinality(
          opName,
          [
            { ...lhsType, genTypeName: "LHS" },
            { ...rhsType, genTypeName: "RHS" },
          ],
          opDef.return_typemod,
          false,
        );
        log("InfixComparisonOperator lhs: %o", lhsType);
        log("InfixComparisonOperator rhs: %o", rhsType);
        log("InfixComparisonOperator retCard: %s", retCard);
        return {
          type:
            lhsType.typemod === "OptionalType"
              ? "InfixOptionalComparisonOperator"
              : "InfixComparisonOperator",
          lhs: typeToCodeFragment(lhsType),
          rhs: typeToCodeFragment(rhsType),
          operatorSymbol,
          retCard: frag`${retCard}`,
        };
      } else {
        // Homogenous
        log("InfixHomogenousOperator lhs: %o", lhsType);
        return {
          type: "InfixHomogenousOperator",
          lhs: typeToCodeFragment(lhsType),
          rhs:
            lhsType.type.id !== rhsType.type.id
              ? typeToCodeFragment(rhsType)
              : null,
          operatorSymbol,
        };
      }
    } else {
      // Container
      if (opDef.return_type.name === "std::bool") {
        // Comparison
        log("InfixContainerComparisonOperator lhs: %o", lhsType);
        log("InfixContainerComparisonOperator rhs: %o", rhsType);
        log(
          "InfixContainerComparisonOperator has rhs: %o",
          rhsType.type.id !== lhsType.type.id,
        );
        const args = getArgsFromAnytypes(opDef.anytypes, lhsType, rhsType);
        return {
          type:
            lhsType.typemod === "OptionalType"
              ? "InfixOptionalContainerComparisonOperator"
              : "InfixContainerComparisonOperator",
          args,
          operatorSymbol,
        };
      } else {
        // Homogenous
        const [lhs, rhs] = opDef.params.positional;
        log(
          "InfixContainerHomogenousOperator lhs: %o",
          opDef.params.positional[0],
        );
        const args = getReturnTypeFromArgsAndAnytypes(
          opDef.anytypes,
          getArgsFromAnytypes(opDef.anytypes, lhs, rhs),
        );
        return {
          type: "InfixContainerHomogenousOperator",
          args,
          operatorSymbol,
        };
      }
    }
  } else if (opDef.operator_kind === $.OperatorKind.Ternary) {
    // Ternary
    const [lhs, _cond, rhs] = opDef.params.positional;
    if (lhs.type.kind === "scalar" || anytypeIsBaseType) {
      // Scalar
      log("TernaryHomogenousOperator lhs: %o", lhs);
      log("TernaryHomogenousOperator rhs: %o", rhs);
      return {
        type: "TernaryHomogenousOperator",
        lhs: typeToCodeFragment(lhs),
        rhs: rhs.type.id !== lhs.type.id ? typeToCodeFragment(rhs) : null,
        operatorSymbol,
      };
    } else {
      // Container
      log("TernaryContainerHomogenousOperator lhs: %o", lhs);
      log("TernaryContainerHomogenousOperator rhs: %o", rhs);
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

  // Special cases
  const coalesceScalarDefs = new StrictMapSet<string, CoalesceScalarOperator>();
  const coalesceContainerDefs = new StrictMapSet<
    string,
    CoalesceContainerOperator
  >();
  const coalesceObjectDefs = new StrictMapSet<string, CoalesceObjectOperator>();

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
      })),
    );

    const opDefs = expandFuncopAnytypeOverloads(
      sortFuncopOverloads(_opDefs, typeSpecificities),
      types,
      casts,
      implicitCastableRootTypes,
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
          generateFuncopDef(opDef),
        );

        overloadIndex++;
      }

      const anytypes = opDef.anytypes;
      const anytypeParams: string[] = [];

      const getParamType = (
        param: (typeof opDef.params.positional)[number],
      ) => {
        const getParamAnytype = (
          paramTypeName: string,
          paramType: $.introspect.Type,
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
        case "CoalesceScalarOperator":
          coalesceScalarDefs.appendAt(opSymbol, operator);
          break;
        case "CoalesceContainerOperator":
          coalesceContainerDefs.appendAt(opSymbol, operator);
          break;
        case "CoalesceObjectOperator":
          coalesceObjectDefs.appendAt(opSymbol, operator);
          break;
      }
    }
  }

  overloadsBuf.writeln([
    t`interface infixOperandsBaseType<LHS extends _.castMaps.orScalarLiteral<$.TypeSet<$.BaseType>>> {`,
  ]);
  overloadsBuf.indented(() => {
    overloadsBuf.writeln([t`lhs: LHS;`]);
    overloadsBuf.writeln([
      t`rhs: _.castMaps.orScalarLiteral<$.TypeSet<$.getPrimitiveBaseType<_.castMaps.literalToTypeSet<LHS>["__element__"]>>>;`,
    ]);
  });
  overloadsBuf.writeln([t`}`]);
  overloadsBuf.nl();

  overloadsBuf.writeln([
    t`interface infixOperandsRangeType<LHS extends $.TypeSet<$.RangeType<_std.$anypoint>>> {`,
  ]);
  overloadsBuf.indented(() => {
    overloadsBuf.writeln([t`lhs: LHS;`]);
    overloadsBuf.writeln([
      t`rhs: $.TypeSet<$.RangeType<$.getPrimitiveBaseType<LHS["__element__"]["__element__"]>>>;`,
    ]);
  });
  overloadsBuf.writeln([t`}`]);
  overloadsBuf.nl();

  overloadsBuf.writeln([
    t`interface infixOperandsArrayTypeNonArray<LHS extends $.TypeSet<$.ArrayType<$.NonArrayType>>> {`,
  ]);
  overloadsBuf.indented(() => {
    overloadsBuf.writeln([t`lhs: LHS;`]);
    overloadsBuf.writeln([
      t`rhs: $.TypeSet<$.ArrayType<$.getPrimitiveNonArrayBaseType<LHS["__element__"]["__element__"]>>>;`,
    ]);
  });
  overloadsBuf.writeln([t`}`]);
  overloadsBuf.nl();

  overloadsBuf.writeln([t`interface operandsBaseTypeToReturnType<`]);
  overloadsBuf.indented(() => {
    overloadsBuf.writeln([t`Args extends {`]);
    overloadsBuf.indented(() => {
      overloadsBuf.writeln([t`lhs: _.castMaps.orScalarLiteral<$.TypeSet<$.BaseType>>;`]);
      overloadsBuf.writeln([t`rhs: any;`]);
    });
    overloadsBuf.writeln([t`},`]);
  });
  overloadsBuf.writeln([t`> {`]);
  overloadsBuf.indented(() => {
    overloadsBuf.writeln([t`ret: $.getPrimitiveBaseType<`]);
    overloadsBuf.indented(() => {
      overloadsBuf.writeln([t`_.castMaps.literalToTypeSet<Args["lhs"]>["__element__"]`]);
    });
    overloadsBuf.writeln([t`>;`]);
    overloadsBuf.writeln([t`lhs: Args["lhs"];`]);
    overloadsBuf.writeln([t`rhs: Args["rhs"];`]);
  });
  overloadsBuf.writeln([t`}`]);
  overloadsBuf.nl();

  overloadsBuf.writeln([t`interface operandsRangeTypeToReturnType<`]);
  overloadsBuf.indented(() => {
    overloadsBuf.writeln([t`Args extends {`]);
    overloadsBuf.indented(() => {
      overloadsBuf.writeln([t`lhs: $.TypeSet<$.RangeType<_std.$anypoint>>;`]);
      overloadsBuf.writeln([t`rhs: any;`]);
    });
    overloadsBuf.writeln([t`},`]);
  });
  overloadsBuf.writeln([t`> {`]);
  overloadsBuf.indented(() => {
    overloadsBuf.writeln([t`ret: $.RangeType<`]);
    overloadsBuf.indented(() => {
      overloadsBuf.writeln([t`$.getPrimitiveBaseType<Args["lhs"]["__element__"]["__element__"]>`]);
    });
    overloadsBuf.writeln([t`>;`]);
    overloadsBuf.writeln([t`lhs: Args["lhs"];`]);
    overloadsBuf.writeln([t`rhs: Args["rhs"];`]);
  });
  overloadsBuf.writeln([t`}`]);
  overloadsBuf.nl();

  overloadsBuf.writeln([t`interface operandsArrayTypeNonArrayToReturnType<`]);
  overloadsBuf.indented(() => {
    overloadsBuf.writeln([t`Args extends {`]);
    overloadsBuf.indented(() => {
      overloadsBuf.writeln([t`lhs: $.TypeSet<$.ArrayType<$.NonArrayType>>;`]);
      overloadsBuf.writeln([t`rhs: any;`]);
    });
    overloadsBuf.writeln([t`},`]);
  });
  overloadsBuf.writeln([t`> {`]);
  overloadsBuf.indented(() => {
    overloadsBuf.writeln([t`ret: $.ArrayType<`]);
    overloadsBuf.indented(() => {
      overloadsBuf.writeln([t`$.getPrimitiveNonArrayBaseType<Args["lhs"]["__element__"]["__element__"]>`]);
    });
    overloadsBuf.writeln([t`>;`]);
    overloadsBuf.writeln([t`lhs: Args["lhs"];`]);
    overloadsBuf.writeln([t`rhs: Args["rhs"];`]);
  });
  overloadsBuf.writeln([t`}`]);
  overloadsBuf.nl();

  overloadsBuf.writeln([t`interface operandsContainerToReturnType<`]);
  overloadsBuf.indented(() => {
    overloadsBuf.writeln([t`Args extends {`]);
    overloadsBuf.indented(() => {
      overloadsBuf.writeln([t`lhs: $.TypeSet;`]);
      overloadsBuf.writeln([t`rhs: $.TypeSet;`]);
    });
    overloadsBuf.writeln([t`},`]);
  });
  overloadsBuf.writeln([t`> {`]);
  overloadsBuf.indented(() => {
    overloadsBuf.writeln([t`ret: _.syntax.getSharedParentPrimitive<`]);
    overloadsBuf.indented(() => {
      overloadsBuf.writeln([t`Args["lhs"]["__element__"],`]);
      overloadsBuf.writeln([t`Args["rhs"]["__element__"]`]);
    });
    overloadsBuf.writeln([t`>;`]);
    overloadsBuf.writeln([t`lhs: Args["lhs"];`]);
    overloadsBuf.writeln([t`rhs: Args["rhs"];`]);
  });
  overloadsBuf.writeln([t`}`]);
  overloadsBuf.nl();

  // PrefixPredicateOperators
  overloadsBuf.writeln([t`interface PrefixParamCardinality<Operand> {`]);
  overloadsBuf.indented(() => {
    overloadsBuf.writeln([t`operand: Operand;`]);
    overloadsBuf.writeln([t`retCard: $.cardutil.paramCardinality<Operand>;`]);
  });
  overloadsBuf.writeln([t`}`]);
  overloadsBuf.writeln([t`interface PrefixPredicateOperators {`]);
  overloadsBuf.indented(() => {
    for (const [opSymbol, defs] of prefixPredicateDefs.entries()) {
      const log = debug(
        `edgedb:codegen:generateOperators:PrefixPredicateOperators:${opSymbol}`,
      );
      overloadsBuf.writeln([t`${quote(opSymbol)}: `]);
      overloadsBuf.indented(() => {
        for (const def of defs) {
          log({ opSymbol, def });
          if (def.typemod === "SetOfType") {
            overloadsBuf.writeln([
              t`| { operand: ${def.operand}; retCard: $.Cardinality.One }`,
            ]);
          } else {
            overloadsBuf.writeln([t`| PrefixParamCardinality<${def.operand}>`]);
          }
        }
      });
    }
  });
  overloadsBuf.writeln([t`}`]);

  // PrefixHomogenousOperators
  overloadsBuf.writeln([t`interface PrefixHomogeneousOperators {`]);
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
  overloadsBuf.writeln([t`}`]);

  // InfixHomogenousOperators
  overloadsBuf.writeln([t`interface InfixHomogeneousOperators {`]);
  overloadsBuf.indented(() => {
    for (const [opSymbol, defs] of infixHomogeneousDefs.entries()) {
      overloadsBuf.writeln([t`${quote(opSymbol)}: `]);
      overloadsBuf.indented(() => {
        for (const def of defs) {
          overloadsBuf.writeln([
            t`| { lhs: ${def.lhs}; rhs: ${def.rhs ?? def.lhs} }`,
          ]);
        }
      });
    }
  });
  overloadsBuf.writeln([t`}`]);

  // InfixComparisonOperators
  overloadsBuf.writeln([t`interface InfixComparisonOperators {`]);
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
  overloadsBuf.writeln([t`interface InfixOptionalComparisonOperators {`]);
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
  overloadsBuf.writeln([t`}`]);

  // InfixContainerComparisonOperators
  overloadsBuf.writeln([t`interface InfixContainerComparisonOperators {`]);
  overloadsBuf.indented(() => {
    for (const [opSymbol, defs] of infixContainerComparisonDefs.entries()) {
      overloadsBuf.writeln([t`${quote(opSymbol)}: `]);
      overloadsBuf.indented(() => {
        for (const def of defs) {
          overloadsBuf.writeln([t`| ${def.args}`]);
        }
      });
    }
  });
  overloadsBuf.writeln([t`}`]);

  // InfixOptionalContainerComparisonOperators
  overloadsBuf.writeln([
    t`interface InfixOptionalContainerComparisonOperators {`,
  ]);
  overloadsBuf.indented(() => {
    for (const [
      opSymbol,
      defs,
    ] of infixOptionalContainerComparisonDefs.entries()) {
      overloadsBuf.writeln([t`${quote(opSymbol)}: `]);
      overloadsBuf.indented(() => {
        for (const def of defs) {
          overloadsBuf.writeln([t`| ${def.args}`]);
        }
      });
    }
  });
  overloadsBuf.writeln([t`}`]);

  // InfixContainerHomogeneousOperators
  overloadsBuf.writeln([t`interface InfixContainerHomogeneousOperators {`]);
  overloadsBuf.indented(() => {
    for (const [opSymbol, defs] of infixContainerHomogenousDefs.entries()) {
      overloadsBuf.writeln([t`${quote(opSymbol)}: `]);
      overloadsBuf.indented(() => {
        for (const def of defs) {
          overloadsBuf.writeln([t`| ${def.args}`]);
        }
      });
    }
  });
  overloadsBuf.writeln([t`}`]);

  // CoalesceOperators
  overloadsBuf.writeln([t`interface CoalesceScalarOperators {`]);
  overloadsBuf.indented(() => {
    for (const [opSymbol, defs] of coalesceScalarDefs.entries()) {
      overloadsBuf.writeln([t`${quote(opSymbol)}: `]);
      overloadsBuf.indented(() => {
        for (const def of defs) {
          overloadsBuf.writeln([t`| { lhs: ${def.lhs} }`]);
        }
      });
    }
  });
  overloadsBuf.writeln([t`}`]);

  overloadsBuf.writeln([t`interface CoalesceContainerOperators {`]);
  overloadsBuf.indented(() => {
    for (const [opSymbol, defs] of coalesceContainerDefs.entries()) {
      overloadsBuf.writeln([t`${quote(opSymbol)}: `]);
      overloadsBuf.indented(() => {
        for (const def of defs) {
          overloadsBuf.writeln([t`| { lhs: ${def.lhs}; rhs: ${def.lhs} }`]);
        }
      });
    }
  });
  overloadsBuf.writeln([t`}`]);

  overloadsBuf.writeln([t`interface buildCoalesceObjectOperator<`]);
  overloadsBuf.indented(() => {
    overloadsBuf.writeln([
      t`LHS extends $.TypeSet<$.ObjectType> = $.TypeSet<$.ObjectType>,`,
    ]);
    overloadsBuf.writeln([
      t`RHS extends $.TypeSet<$.ObjectType> = $.TypeSet<$.ObjectType>,`,
    ]);
    overloadsBuf.writeln([
      t`Ret extends _.syntax.mergeObjectTypes<LHS["__element__"], RHS["__element__"]> = _.syntax.mergeObjectTypes<LHS["__element__"], RHS["__element__"]>,`,
    ]);
  });
  overloadsBuf.writeln([t`> {`]);
  overloadsBuf.indented(() => {
    overloadsBuf.writeln([t`lhs: LHS;`]);
    overloadsBuf.writeln([t`rhs: RHS;`]);
    overloadsBuf.writeln([t`ret: Ret;`]);
  });
  overloadsBuf.writeln([t`}`]);
  overloadsBuf.writeln([t`interface CoalesceObjectOperators {`]);
  overloadsBuf.indented(() => {
    for (const [opSymbol, defs] of coalesceObjectDefs.entries()) {
      overloadsBuf.writeln([t`${quote(opSymbol)}: `]);
      overloadsBuf.indented(() => {
        for (const def of defs) {
          overloadsBuf.writeln([
            t`| buildCoalesceObjectOperator<${def.lhs}, ${def.lhs}>`,
          ]);
        }
      });
    }
  });
  overloadsBuf.writeln([t`}`]);

  // TernaryHomogenousOperators
  overloadsBuf.writeln([t`interface TernaryHomogeneousOperators {`]);
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
  overloadsBuf.writeln([t`}`]);

  // TernaryContainerHomogenousOperators
  overloadsBuf.writeln([t`interface TernaryContainerHomogeneousOperators {`]);
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
  overloadsBuf.writeln([t`}`]);

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

  // Utility type for extracting the correct union member for an operator
  code.writeln([t`type ExtractRHS<T, LHS> =`]);
  code.indented(() => {
    code.writeln([
      t`T extends { lhs: infer LHSType; rhs: infer RHSType } ? LHS extends LHSType ? RHSType : never : never;`,
    ]);
  });

  code.writeln([t`type ExtractReturnCardinality<T, Operand> =`]);
  code.indented(() => {
    code.writeln([
      t`T extends { operand: infer OperandType; retCard: infer ReturnCardinalityType } ? Operand extends OperandType ? ReturnCardinalityType : never : never;`,
    ]);
  });

  code.writeln([t`type ExtractReturn<T, LHS, RHS> =`]);
  code.indented(() => {
    code.writeln([
      t`T extends { lhs: infer LHSType; rhs: infer RHSType; ret: infer RetType } ? LHS extends LHSType ? RHS extends RHSType ? RetType : never : never : never;`,
    ]);
  });

  code.nl();

  // PrefixPredicateOperators
  code.writeln([t`function op<`]);
  code.indented(() => {
    code.writeln([t`Op extends keyof PrefixPredicateOperators,`]);
    code.writeln([t`Operand extends PrefixPredicateOperators[Op]["operand"],`]);
    code.writeln([
      t`ReturnCardinality extends ExtractReturnCardinality<PrefixPredicateOperators[Op], Operand>`,
    ]);
  });
  code.writeln([
    t`>(op: Op, operand: Operand): $.$expr_Operator<_std.$bool, ReturnCardinality>;`,
  ]);

  // InfixComparisonOperators
  code.writeln([t`function op<`]);
  code.indented(() => {
    code.writeln([t`Op extends keyof InfixComparisonOperators,`]);
    code.writeln([
      t`LHS extends InfixComparisonOperators[Op] extends { lhs: infer LHSType } ? LHSType : never,`,
    ]);
    code.writeln([
      t`RHS extends ExtractRHS<InfixComparisonOperators[Op], LHS>`,
    ]);
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
    code.writeln([
      t`LHS extends InfixOptionalComparisonOperators[Op] extends { lhs: infer LHSType } ? LHSType : never,`,
    ]);
    code.writeln([
      t`RHS extends ExtractRHS<InfixOptionalComparisonOperators[Op], LHS>`,
    ]);
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
      t`LHS extends InfixContainerComparisonOperators[Op] extends { lhs: infer LHSType } ? LHSType : never,`,
    ]);
    code.writeln([
      t`RHS extends ExtractRHS<InfixContainerComparisonOperators[Op], LHS>`,
    ]);
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
    code.writeln([
      t`Op extends keyof InfixOptionalContainerComparisonOperators,`,
    ]);
    code.writeln([
      t`LHS extends InfixOptionalContainerComparisonOperators[Op] extends { lhs: infer LHSType } ? LHSType : never,`,
    ]);
    code.writeln([
      t`RHS extends ExtractRHS<InfixOptionalContainerComparisonOperators[Op], LHS>`,
    ]);
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
      t`$.getPrimitiveBaseType<_.castMaps.literalToTypeSet<Operand>["__element__"]>,`,
    ]);
    code.writeln([t`$.cardutil.paramCardinality<Operand>`]);
  });
  code.writeln([t`>;`]);

  // InfixHomogeneousOperators
  code.writeln([t`function op<`]);
  code.indented(() => {
    code.writeln([t`Op extends keyof InfixHomogeneousOperators,`]);
    code.writeln([
      t`LHS extends InfixHomogeneousOperators[Op] extends { lhs: infer LHSType } ? LHSType : never,`,
    ]);
    code.writeln([
      t`RHS extends ExtractRHS<InfixHomogeneousOperators[Op], LHS>`,
    ]);
  });
  code.writeln([t`>(lhs: LHS, op: Op, rhs: RHS): $.$expr_Operator<`]);
  code.indented(() => {
    code.writeln([
      t`$.getPrimitiveBaseType<_.castMaps.literalToTypeSet<LHS>["__element__"]>,`,
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
      t`LHS extends InfixContainerHomogeneousOperators[Op] extends { lhs: infer LHSType } ? LHSType : never,`,
    ]);
    code.writeln([
      t`RHS extends ExtractRHS<InfixContainerHomogeneousOperators[Op], LHS>,`,
    ]);
    code.writeln([
      t`Ret extends ExtractReturn<InfixContainerHomogeneousOperators[Op], LHS, RHS>`,
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

  // CoalesceOperators
  code.writeln([t`function op<`]);
  code.indented(() => {
    code.writeln([t`Op extends keyof CoalesceContainerOperators,`]);
    code.writeln([
      t`LHS extends CoalesceContainerOperators[Op] extends { lhs: infer LHSType } ? LHSType : never,`,
    ]);
    code.writeln([
      t`RHS extends ExtractRHS<CoalesceContainerOperators[Op], LHS>`,
    ]);
  });
  code.writeln([t`>(lhs: LHS, op: Op, rhs: RHS): $.$expr_Operator<`]);
  code.indented(() => {
    code.writeln([
      t`_.syntax.getSharedParentPrimitive<_.castMaps.literalToTypeSet<LHS>["__element__"], RHS["__element__"]>,`,
    ]);
    code.writeln([
      t`$.cardutil.coalesceCardinalities<$.cardutil.paramCardinality<LHS>, $.cardutil.paramCardinality<RHS>>`,
    ]);
  });
  code.writeln([t`>;`]);

  code.writeln([t`function op<`]);
  code.indented(() => {
    code.writeln([t`Op extends keyof CoalesceObjectOperators,`]);
    code.writeln([
      t`LHS extends CoalesceObjectOperators[Op] extends { lhs: infer LHSType } ? LHSType : never,`,
    ]);
    code.writeln([
      t`RHS extends ExtractRHS<CoalesceObjectOperators[Op], LHS>,`,
    ]);
    code.writeln([
      t`Ret extends ExtractReturn<CoalesceObjectOperators[Op], LHS, RHS>`,
    ]);
  });
  code.writeln([t`>(lhs: LHS, op: Op, rhs: RHS): $.$expr_Operator<`]);
  code.indented(() => {
    code.writeln([t`Ret,`]);
    code.writeln([
      t`$.cardutil.coalesceCardinalities<$.cardutil.paramCardinality<LHS>, $.cardutil.paramCardinality<RHS>>`,
    ]);
  });
  code.writeln([t`>;`]);

  code.writeln([t`function op<`]);
  code.indented(() => {
    code.writeln([t`Op extends keyof CoalesceScalarOperators,`]);
    code.writeln([
      t`LHS extends CoalesceScalarOperators[Op] extends { lhs: infer LHSType } ? LHSType : never,`,
    ]);
    code.writeln([
      t`RHS extends _.castMaps.orScalarLiteral<$.TypeSet<$.getPrimitiveBaseType<_.castMaps.literalToTypeSet<LHS>["__element__"]>>>`,
    ]);
  });
  code.writeln([t`>(lhs: LHS, op: Op, rhs: RHS): $.$expr_Operator<`]);
  code.indented(() => {
    code.writeln([
      t`$.getPrimitiveBaseType<_.castMaps.literalToTypeSet<LHS>["__element__"]>,`,
    ]);
    code.writeln([
      t`$.cardutil.coalesceCardinalities<$.cardutil.paramCardinality<LHS>, $.cardutil.paramCardinality<RHS>>`,
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
    code.writeln([
      t`LHS extends TernaryHomogeneousOperators[Op] extends { lhs: infer LHSType } ? LHSType : never,`,
    ]);
    code.writeln([
      t`RHS extends ExtractRHS<TernaryHomogeneousOperators[Op], LHS>`,
    ]);
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
    code.writeln([t`Op extends keyof TernaryContainerHomogeneousOperators,`]);
    code.writeln([
      t`Cond extends _.castMaps.orScalarLiteral<$.TypeSet<_std.$bool>>,`,
    ]);
    code.writeln([
      t`LHS extends TernaryContainerHomogeneousOperators[Op] extends { lhs: infer LHSType } ? LHSType : never,`,
    ]);
    code.writeln([
      t`RHS extends ExtractRHS<TernaryContainerHomogeneousOperators[Op], LHS>,`,
    ]);
    code.writeln([
      t`Ret extends ExtractReturn<TernaryContainerHomogeneousOperators[Op], LHS, RHS>`,
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
