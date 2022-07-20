import type {GeneratorParams} from "../generate";
import {frag, getRef, splitName} from "../util/genutil";
import {dts, r, t, ts} from "../builders";

import {getStringRepresentation} from "./generateObjectTypes";
import {GlobalType} from "../queries/getGlobals";

export const generateGlobals = ({
  dir,
  globals,
  types,
  isDeno,
}: GeneratorParams) => {
  const globalsByMod: {[k: string]: GlobalType[]} = {};
  for (const [_id, g] of globals.entries()) {
    const {mod} = splitName(g.name);
    globalsByMod[mod] = globalsByMod[mod] || [];
    globalsByMod[mod].push(g);
  }

  for (const [mod, gs] of Object.entries(globalsByMod)) {
    const code = dir.getModule(mod, isDeno);
    code.writeln([
      dts`declare `,
      ...frag`const $${mod}__globals`,
      t`: {`,
      ...gs
        .flatMap(g => {
          const {name} = splitName(g.name);
          const targetType = types.get(g.target_id);
          const targetTypeRep = getStringRepresentation(targetType, {types});
          return [
            t`  ${name}: _.syntax.$expr_Global<
              "${g.name}",
              ${targetTypeRep.staticType},
              $.Cardinality.${g.real_cardinality}
              >`,
            t`,`,
          ];
        })
        .slice(0, -1), // slice last comma
      t`}`,
      r` = {`,
      ...gs
        .flatMap(g => {
          const {name} = splitName(g.name);
          return [
            r`  ${name}: _.syntax.makeGlobal(
              "${g.name}",
              $.makeType(_.spec, "${g.target_id}", _.syntax.literal),
              $.Cardinality.${g.real_cardinality})`,
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
      getRef(`$${mod}__globals`, {prefix: ""}),
      "global"
    );
  }
};
