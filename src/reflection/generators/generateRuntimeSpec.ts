import {genutil} from "../genutil";
import {GeneratorParams} from "./generateCastMaps";

export const generateRuntimeSpec = async (params: GeneratorParams) => {
  const {dir, types} = params;

  const bm = dir.getPath("__spec__.ts");
  bm.addImport(`import {reflection as $} from "edgedb";`);
  bm.writeln(`export const spec: $.spec.TypesSpec = new $.StrictMap();`);
  bm.nl();

  for (const type of types.values()) {
    if (type.kind !== "object") {
      continue;
    }

    bm.writeln(`spec.set("${type.name}", {`);
    bm.indented(() => {
      bm.writeln(`name: ${JSON.stringify(type.name)},`);

      const bases: string[] = [];
      for (const {id: baseId} of type.bases) {
        const base = types.get(baseId);
        bases.push(base.name);
      }
      bm.writeln(`bases: ${JSON.stringify(bases)},`);

      const ancestors: string[] = [];
      for (const {id: baseId} of type.ancestors) {
        const base = types.get(baseId);
        ancestors.push(base.name);
      }
      bm.writeln(`ancestors: ${JSON.stringify(ancestors)},`);

      bm.writeln(`properties: [`);
      bm.indented(() => {
        for (const ptr of type.pointers) {
          if (ptr.kind !== "property") {
            continue;
          }

          bm.writeln(`{`);
          bm.indented(() => {
            bm.writeln(`name: ${JSON.stringify(ptr.name)},`);
            bm.writeln(
              `cardinality: $.Cardinality.${genutil.toCardinality(ptr)},`
            );
          });
          bm.writeln(`},`);
        }
      });
      bm.writeln(`],`);

      bm.writeln(`links: [`);
      bm.indented(() => {
        for (const ptr of type.pointers) {
          if (ptr.kind !== "link") {
            continue;
          }

          bm.writeln(`{`);
          bm.indented(() => {
            bm.writeln(`name: ${JSON.stringify(ptr.name)},`);
            bm.writeln(
              `cardinality: $.Cardinality.${genutil.toCardinality(ptr)},`
            );
            bm.writeln(
              `target: ${JSON.stringify(types.get(ptr.target_id).name)},`
            );
            bm.writeln(`properties: [`);
            if (ptr.pointers && ptr.pointers.length > 2) {
              for (const prop of ptr.pointers) {
                if (prop.kind !== "property") {
                  // We only support "link properties" in EdgeDB, currently.
                  continue;
                }
                if (prop.name === "source" || prop.name === "target") {
                  // No use for them reflected, at the moment.
                  continue;
                }
                bm.writeln(`{`);
                bm.indented(() => {
                  bm.writeln(`name: ${JSON.stringify(prop.name)},`);
                  bm.writeln(
                    `cardinality: $.Cardinality.${genutil.toCardinality(
                      prop
                    )},`
                  );
                });
                bm.writeln(`},`);
              }
            }
            bm.writeln(`],`);
          });
          bm.writeln(`},`);
        }
      });
      bm.writeln(`],`);
    });
    bm.writeln(`});`);
    bm.nl();
  }
};
