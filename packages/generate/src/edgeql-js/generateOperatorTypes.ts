import {CodeBuffer, dts, r, t, ts} from "../builders";
import type {GeneratorParams} from "../generate";
import {frag, quote, splitName} from "../genutil";
import {
  allowsLiterals,
  generateFuncopDef,
  generateFuncopTypes,
  generateReturnCardinality
} from "./generateFunctionTypes";
import {
  getTypesSpecificity,
  sortFuncopOverloads,
  getImplicitCastableRootTypes,
  expandFuncopAnytypeOverloads,
  findPathOfAnytype
} from "../funcoputil";
import {$} from "../genutil";
import {getStringRepresentation} from "./generateObjectTypes";

export function generateOperatorFunctions({
  dir,
  operators,
  types,
  casts
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
      code.writeln([t`${quote(opDef.originalName)},`]);
      // OperatorKind
      code.writeln([t`$.OperatorKind.${opDef.operator_kind},`]);
      // Args
      code.writeln([t`${args}`]);
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
  "std::destructure"
]);

export function generateOperators({
  dir,
  operators,
  types,
  casts
}: GeneratorParams) {
  const typeSpecificities = getTypesSpecificity(types, casts);
  const implicitCastableRootTypes = getImplicitCastableRootTypes(casts);
  const code = dir.getPath("operators");

  // code.addImport({$: true}, edgedb);
  code.addImportStar("$", "./reflection", {allowFileExt: true});
  code.addImportStar("_", "./imports", {allowFileExt: true});

  const overloadsBuf = new CodeBuffer();

  const overloadDefs: {
    [opKind: string]: {[opSymbol: string]: string[]};
  } = {};
  for (const opKind of Object.values($.OperatorKind)) {
    overloadDefs[opKind] = {};
  }

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
      const {params} = opDef;

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

      if (opDef.description) {
        overloadsBuf.writeln([
          t`/**
* ${opDef.description.replace(/\*\//g, "")}
*/`
        ]);
      }

      overloadsBuf.writeln([dts`declare `, t`function op<`]);

      const anytypes = opDef.anytypes;
      const anytypeParams: string[] = [];

      function getParamAnytype(
        paramTypeName: string,
        paramType: $.introspect.Type
      ) {
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
      }

      let hasLiterals = false;
      overloadsBuf.indented(() => {
        for (const param of params.positional) {
          const anytype = getParamAnytype(param.typeName, param.type);

          const paramTypeStr = getStringRepresentation(param.type, {
            types,
            anytype,
            casts: casts.implicitCastFromMap
          });

          let type = frag`$.TypeSet<${paramTypeStr.staticType}>`;

          if (allowsLiterals(param.type, anytypes)) {
            type = frag`_.castMaps.orScalarLiteral<${type}>`;
            hasLiterals = true;
          }

          overloadsBuf.writeln([t`${param.typeName} extends ${type},`]);
        }
      });

      overloadsBuf.writeln([t`>(`]);

      overloadsBuf.indented(() => {
        const args = params.positional.map(
          param => `${param.internalName}: ${param.typeName}`
        );
        switch (opDef.operator_kind) {
          case $.OperatorKind.Infix:
            overloadsBuf.writeln([
              t`${args[0]}, op: ${quote(opSymbol)}, ${args[1]}`
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
              overloadsBuf.writeln([
                t`${args[0]}, op: "if", ${args[1]}, op2: "else", ${args[2]}`
              ]);
            } else {
              throw new Error(`unknown ternary operator: ${opName}`);
            }
            break;
          default:
            throw new Error(`unknown operator kind: ${opDef.operator_kind}`);
        }
      });

      const paramTypeNames = params.positional
        .map(param => param.typeName)
        .join(", ");

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
          anytype: returnAnytype
        }
      );

      overloadsBuf.writeln([t`): $.$expr_Operator<`]);
      overloadsBuf.indented(() => {
        overloadsBuf.writeln([t`${quote(opSymbol)},`]);
        overloadsBuf.writeln([t`$.OperatorKind.${opDef.operator_kind},`]);
        overloadsBuf.writeln([
          t`${
            hasLiterals
              ? `_.castMaps.mapLiteralToTypeSet<[${paramTypeNames}]>`
              : `[${paramTypeNames}]`
          },`
        ]);
        overloadsBuf.writeln([
          t`$.TypeSet<${returnType.staticType}, ${generateReturnCardinality(
            opName,
            params,
            opDef.return_typemod,
            false,
            anytypes
          )}>`
        ]);
      });
      overloadsBuf.writeln([t`>;`]);
    }
  }

  code.nl();
  code.writeln([
    r`const overloadDefs`,
    ts`: {
  [opKind in 'Infix' | 'Prefix' | 'Postfix' | 'Ternary']: {
    [opSymbol: string]: any[]
  }
}`,
    r` = {`
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
      ts`: any[] | null`,
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
      op = \`\${args[1]}_\${args[3]}\`;
      params = [args[0], args[2], args[4]];
      defs = overloadDefs.Ternary[op];
    }
  }

  if (!defs) {
    throw new Error(\`No operator exists with signature: \${args.map(arg => \`\${arg}\`).join(", ")}\`);
  }`
    ]);

    code.nl();
    code.writeln([
      r`const {kind, returnType, cardinality, args: resolvedArgs} = _.syntax.$resolveOverload(op, params, _.spec, defs);`
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
