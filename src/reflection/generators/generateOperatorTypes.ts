import type {GeneratorParams} from "../generate";
import {frag, quote} from "../util/genutil";

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
      code.writeln(frag`${quote(opDef.originalName)},`);
      // OperatorKind
      code.writeln(frag`$.OperatorKind.${opDef.operator_kind},`);
      // ReturnType
      code.writeln(returnType);
    },
    (code, opName, opDefs) => {
      code.writeln(frag`__name__: ${quote(opDefs[0].originalName)},`);
      code.writeln(frag`__opkind__: kind,`);
      code.writeln(frag`__args__: positionalArgs,`);
    }
  );
};
