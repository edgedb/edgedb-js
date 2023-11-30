import {CodeBuffer} from "../builders";
import {$, frag, GeneratorParams, splitName} from "../genutil";
import {
  getTypesSpecificity,
  sortFuncopOverloads,
  getImplicitCastableRootTypes,
  expandFuncopAnytypeOverloads
  // findPathOfAnytype
} from "../funcoputil";
import {getStringRepresentation} from "./generateObjectTypes";
import {generateReturnCardinality} from "./generateFunctionTypes";

const skipOperators = new Set<string>([
  "std::index",
  "std::slice",
  "std::destructure"
]);

export function generateChainedOperators({
  dir,
  operators,
  types,
  casts
}: GeneratorParams) {
  const typeSpecificities = getTypesSpecificity(types, casts);
  const implicitCastableRootTypes = getImplicitCastableRootTypes(casts);
  const code = dir.getPath("chainedOps");

  code.addImportStar("$", "./reflection", {
    allowFileExt: true,
    typeOnly: true
  });
  code.addImportStar("_", "./imports", {allowFileExt: true, typeOnly: true});

  code.nl();
  code.writeln(
    [`type $chainedOps<Set extends $.TypeSet> =`],
    [
      `  Set["__element__"] extends $.ScalarType ? _scalarOps<Set['__element__']['__name__'], Set>`
    ],
    [`  : Set["__element__"] extends $.EnumType ? _enumOps<Set>`],
    [`  : {}`]
  );
  code.nl();

  const scalarOpsMap = new Map<
    string,
    {buf: CodeBuffer; names: Map<string, string>}
  >();
  function getScalarOpOutput(typeName: string) {
    if (!scalarOpsMap.has(typeName)) {
      scalarOpsMap.set(typeName, {buf: new CodeBuffer(), names: new Map()});
    }
    return scalarOpsMap.get(typeName)!;
  }
  const enumOps = {
    buf: new CodeBuffer(),
    names: new Map<string, string>()
  };
  const anytypeOps = {
    buf: new CodeBuffer(),
    names: new Map<string, string>()
  };

  for (const [opName, _opDefs] of operators.entries()) {
    if (skipOperators.has(opName) || opName === "std::if_else") continue;

    const opDefs = expandFuncopAnytypeOverloads(
      sortFuncopOverloads(_opDefs, typeSpecificities),
      types,
      casts,
      implicitCastableRootTypes
    );

    const opIdentName = splitName(opName).name.replace(/_./g, match =>
      match[1].toUpperCase()
    );
    const opSymbol =
      opName === "std::if_else"
        ? "if_else"
        : splitName(_opDefs[0].originalName).name.toLowerCase();

    for (const opDef of opDefs) {
      const params = opDef.params.positional;

      const rootType = params[0].type;
      if (rootType.kind === "scalar") {
        const returnType = getStringRepresentation(
          types.get(opDef.return_type.id),
          {
            types
            // anytype: returnAnytype
          }
        );

        let returnCard = generateReturnCardinality(
          opName,
          opDef.params,
          opDef.return_typemod,
          false,
          opDef.anytypes
        ).replace(params[0].typeName, "Set");

        if (opDef.operator_kind === $.OperatorKind.Infix) {
          returnCard = returnCard.replace(params[1]?.typeName ?? "", "T");
        }

        if (params[0].type.name.includes("anyenum")) {
          const method = frag`<T extends $.TypeSet<Set['__element__']>>(val: T): $.$expr_Operator<${returnType.staticType}, ${returnCard}>;`;

          enumOps.buf.writeln(frag`${opIdentName}${method}`);
          enumOps.names.set(opIdentName, opSymbol);
        } else {
          const {buf: opBuf, names: opNames} = getScalarOpOutput(
            params[0].type.name
          );

          const paramTypeStr =
            opDef.operator_kind === $.OperatorKind.Infix
              ? getStringRepresentation(params[1].type, {
                  types,
                  // anytype,
                  casts: casts.implicitCastFromMap
                })
              : null;

          const method = frag`${
            paramTypeStr
              ? frag`<T extends _.castMaps.orScalarLiteral<$.TypeSet<${paramTypeStr.staticType}>>>(val: T`
              : "("
          }): $.$expr_Operator<${returnType.staticType}, ${returnCard}>;`;

          opBuf.indented(() => {
            opBuf.writeln(frag`${opIdentName}${method}`);
            // if (opIdentName !== opSymbol) {
            //   opBuf.writeln(frag`["${opSymbol}"]${method}`);
            // }
          });
          opNames.set(opIdentName, opSymbol);
        }
      } else if (
        rootType.name === "anytype" &&
        opDef.anytypes?.kind === "noncastable"
      ) {
        const returnType = getStringRepresentation(
          types.get(opDef.return_type.id),
          {
            types
            // anytype: returnAnytype
          }
        );

        let returnCard = generateReturnCardinality(
          opName,
          opDef.params,
          opDef.return_typemod,
          false,
          opDef.anytypes
        ).replace(params[0].typeName, "Set");

        if (opDef.operator_kind === $.OperatorKind.Infix) {
          returnCard = returnCard.replace(params[1]?.typeName ?? "", "T");
        }

        const method = frag`${
          opDef.operator_kind === $.OperatorKind.Infix
            ? frag`<T extends _.castMaps.orScalarLiteral<$.TypeSet<$.getPrimitiveBaseType<Set['__element__']>>>>(val: T`
            : "("
        }): $.$expr_Operator<${returnType.staticType}, ${returnCard}>;`;

        anytypeOps.buf.writeln(frag`${opIdentName}${method}`);
      }
    }
  }

  const namesBuf = new CodeBuffer();
  namesBuf.writeln([`const opNames = {`], [`  scalar: {`]);

  code.writeln([
    `type _scalarOps<TypeName extends string, Set extends $.TypeSet> = `
  ]);
  for (const [typename, {buf, names}] of scalarOpsMap.entries()) {
    code.indented(() => {
      code.writeln([`TypeName extends "${typename}" ? {`]);
      code.writeBuf(buf);
      code.writeln([`} : `]);
    });

    namesBuf.writeln([
      `    "${typename}": {${[...names.entries()]
        .map(([name, sym]) => `"${name}": "${sym}"`)
        .join(", ")}},`
    ]);
  }
  code.writeln([`never;`]);
  code.nl();

  code.writeln([`type _enumOps<Set extends $.TypeSet> = {`]);
  code.indented(() => code.writeBuf(enumOps.buf));
  code.writeln([`};`]);
  code.nl();

  namesBuf.writeln(
    [`  },`],
    [
      `  enum: {${[...enumOps.names.entries()]
        .map(([name, sym]) => `"${name}": "${sym}"`)
        .join(", ")}},`
    ],
    [`};`]
  );

  code.writeln([`type _anytypeOps<Set extends $.TypeSet> = {`]);
  code.indented(() => code.writeBuf(anytypeOps.buf));
  code.writeln([`};`]);
  code.nl();

  code.writeBuf(namesBuf);

  code.addExport("$chainedOps", {typeOnly: true});
  code.addExport("opNames");
}
