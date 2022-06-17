import type {GeneratorParams} from "../generate";
import {
  frag,
  getRef,
  // getRef,
  // getRef, quote,
  splitName,
} from "../util/genutil";
import {
  // CodeBuffer,
  // CodeBuilder,
  // CodeFragment,
  // DirBuilder,
  dts,
  r,
  t,
  ts,
  // all,
} from "../builders";

// import {Param, Typemod} from "../queries/getFunctions";
import {getStringRepresentation} from "./generateObjectTypes";
import {GlobalType} from "../queries/getGlobals";
// import {introspect, StrictMap} from "../../reflection";
// import {
//   getTypesSpecificity,
//   sortFuncopOverloads,
//   getImplicitCastableRootTypes,
//   expandFuncopAnytypeOverloads,
//   GroupedParams,
//   findPathOfAnytype,
//   AnytypeDef,
//   FuncopDefOverload,
// } from "../util/functionUtils";
// import {Casts} from "../queries/getCasts";

export const generateGlobals = ({dir, globals, types}: GeneratorParams) => {
  const globalsByMod: {[k: string]: GlobalType[]} = {};
  for (const [_id, g] of globals.entries()) {
    const {mod} = splitName(g.name);
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
        .flatMap(g => {
          const {name} = splitName(g.name);
          const targetType = types.get(g.target_id);
          const targetTypeRep = getStringRepresentation(targetType, {types});
          return [
            t`  ${name}: _.syntax.$expr_Global<"${g.name}", ${targetTypeRep.staticType}, $.Cardinality.${g.real_cardinality}>`,
            t`,`,
          ];
        })
        .slice(0, -1), // slice last comma,
      t`}`,
      r` = {`,
      ...gs
        .flatMap(g => {
          const {name} = splitName(g.name);
          return [
            r`  ${name}: _.syntax.makeGlobal("${g.name}", $.makeType(_.spec, "${g.target_id}", _.syntax.literal), $.Cardinality.${g.real_cardinality})`,
            ts` as any`,
            r`,`,
            // all`;`,
          ];
        })
        .slice(0, -1), // slice last comma
      r`};`,
    ]);

    /**
     *
     * const global_name: $.$expr_Global<"global_name", Type, Card> = $.makeGlobal("global_name", type, card);
     */
    // code.writeln([
    //   dts`declare `,
    //   r`const ${ref} = ${joinFrags(children, " | ")};`,
    // ]);
    // code.writeln([
    //   r`declare `,
    //   t`type ${ref} = ${joinFrags(children, " | ")};`,
    // ]);

    // const targetTypeName = `${name}_type`;
    // const targetType = types.get(g.target_id);
    // const targetTypeRep = getStringRepresentation(targetType, {types});
    // code.writeln([
    //   r`const ${targetTypeName} = $.makeType(_.spec, "${g.target_id}", _.syntax.literal);`,
    // ]);
    // code.writeln([`const globals = {`])

    // code.writeln([dts`declare `, ...frag`const $global`, t`: {}`]);

    code.nl();
    code.registerRef(`$${mod}__globals`);
    code.addRefsDefaultExport(
      getRef(`$${mod}__globals`, {prefix: ""}),
      "global"
    );
  }
};
