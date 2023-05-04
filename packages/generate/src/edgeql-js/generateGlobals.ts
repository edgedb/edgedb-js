import type { GeneratorParams } from "../genutil";
import { frag, getRef, splitName } from "../genutil";
import { dts, r, t, ts } from "../builders";

import { getStringRepresentation } from "./generateObjectTypes";
import type { $ } from "../genutil";

export const generateGlobals = ({ dir, globals, types }: GeneratorParams) => {
  const globalsByMod: { [k: string]: $.introspect.Global[] } = {};
  for (const [_id, g] of globals.entries()) {
    const { mod } = splitName(g.name);
    globalsByMod[mod] = globalsByMod[mod] || [];
    globalsByMod[mod].push(g);
  }

  for (const [mod, gs] of Object.entries(globalsByMod)) {
    const code = dir.getModule(mod);
    code.writeln([
      dts`declare `,
      ...frag`const $${mod}__globals`,
      t`: {`,
      ...gs
        .flatMap((g) => {
          const { name } = splitName(g.name);
          const targetType = types.get(g.target_id);
          const targetTypeRep = getStringRepresentation(targetType, { types });
          return [
            t`  ${name}: _.syntax.$expr_Global<
              // "${g.name}",
              ${targetTypeRep.staticType},
              $.Cardinality.${g.card}
              >`,
            t`,`,
          ];
        })
        .slice(0, -1), // slice last comma
      t`}`,
      r` = {`,
      ...gs
        .flatMap((g) => {
          const { name } = splitName(g.name);
          return [
            r`  ${name}: _.syntax.makeGlobal(
              "${g.name}",
              $.makeType(_.spec, "${g.target_id}", _.syntax.literal),
              $.Cardinality.${g.card})`,
            ts` as any`,
            r`,`,
          ];
        })
        .slice(0, -1), // slice last comma
      r`};`,
    ]);

    code.nl();
    code.registerRef(`$${mod}__globals`);
    code.addToDefaultExport(
      getRef(`$${mod}__globals`, { prefix: "" }),
      "global"
    );
  }
};
