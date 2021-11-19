import {r, t} from "../builders";
import type {GeneratorParams} from "../generate";
import {quote} from "../util/genutil";
import {generateFuncopTypes} from "./generateFunctionTypes";

export const generateOperatorTypes = ({
  dir,
  operators,
  types,
  casts,
}: GeneratorParams) => {
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
};
