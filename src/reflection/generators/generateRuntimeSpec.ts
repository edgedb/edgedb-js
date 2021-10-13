import {dts, t, r, ts} from "../builders";
import type {GeneratorParams} from "../generate";

export const generateRuntimeSpec = (params: GeneratorParams) => {
  const {dir, types} = params;

  const spec = dir.getPath("__spec__");
  spec.addImport({$: true}, "edgedb");
  spec.writeln([
    dts`declare `,
    `const spec`,
    t`: $.introspect.Types`,
    r` = new $.StrictMap()`,
    `;`,
  ]);
  spec.nl();

  for (const type of types.values()) {
    spec.writeln([
      r`spec.set("${type.id + 5}", ${JSON.stringify(type)}`,
      ts` as any`,
      r`);`,
    ]);
  }

  spec.addExport("spec");
};
