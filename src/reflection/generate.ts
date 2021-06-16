import {CodeBuilder, DirBuilder} from "./builders";
import {connect} from "../index.node";
import {Connection} from "../ifaces";
import {StrictMap} from "./strictMap";
import {ConnectConfig} from "../con_utils";
import {getCasts} from "./casts";
import {getScalars} from "./scalars";
import * as introspect from "./introspect";
import * as genutil from "./genutil";

export async function generateCasts(cxn?: ConnectConfig): Promise<void> {
  const con = await connect(cxn);
  const casts = await getCasts(con);
  console.log(casts);
}

export async function generateScalars(cxn?: ConnectConfig): Promise<void> {
  const con = await connect(cxn);
  const casts = await getScalars(con);
  console.log(JSON.stringify(casts, null, 2));
}

export async function generateQB(
  to: string,
  cxn?: ConnectConfig
): Promise<void> {
  const con = await connect(cxn);
  const dir = new DirBuilder();

  try {
    const types = await introspect.fetchTypes(con);
    const modsIndex = new Set<string>();

    for (const type of types.values()) {
      if (type.kind !== "scalar" && type.kind !== "object") {
        continue;
      }

      const {mod, name} = genutil.splitName(type.name);
      modsIndex.add(mod);

      if (
        type.kind !== "scalar" ||
        !type.enum_values ||
        !type.enum_values.length
      ) {
        continue;
      }

      const b = dir.getPath(`modules/${mod}.ts`);

      b.writeln(`export enum ${name} {`);
      b.indented(() => {
        for (const val of type.enum_values) {
          b.writeln(`${genutil.toIdent(val)} = ${genutil.quote(val)},`);
        }
      });
      b.writeln(`}`);
      b.nl();
    }

    for (const type of types.values()) {
      if (type.kind !== "object") {
        continue;
      }
      if (
        (type.union_of && type.union_of.length) ||
        (type.intersection_of && type.intersection_of.length)
      ) {
        continue;
      }

      const {mod, name} = genutil.splitName(type.name);
      const body = dir.getPath(`__types__/${mod}.ts`);

      body.addImport(`import {reflection as $} from "edgedb";`);

      const bases = [];
      for (const {id: baseId} of type.bases) {
        const baseType = types.get(baseId);
        const {mod: baseMod, name: baseName} = genutil.splitName(
          baseType.name
        );
        // const baseMod = getModule(baseType.name);
        if (baseMod !== mod) {
          body.addImport(
            `import type * as ${baseMod}Types from "./${baseMod}";`
          );
          bases.push(`${baseMod}Types.${baseName}`);
        } else {
          bases.push(baseName);
        }
      }
      if (bases.length) {
        body.writeln(
          `export interface ${genutil.toIdent(name)} extends ${bases.join(
            ", "
          )} {`
        );
      } else {
        body.writeln(`export interface ${genutil.toIdent(name)} {`);
      }

      body.indented(() => {
        for (const ptr of type.pointers) {
          const card = `$.Cardinality.${genutil.toCardinality(ptr)}`;

          if (ptr.kind === "link") {
            const trgType = types.get(ptr.target_id) as introspect.ObjectType;

            const tsType = genutil.toJsObjectType(trgType, types, mod, body);

            body.writeln(`${ptr.name}: $.LinkDesc<${tsType}, ${card}>;`);
          } else {
            const trgType = types.get(
              ptr.target_id
            ) as introspect.PrimitiveType;

            const tsType = genutil.toJsScalarType(trgType, types, mod, body);

            body.writeln(`${ptr.name}: $.PropertyDesc<${tsType}, ${card}>;`);
          }
        }
      });
      body.writeln(`}`);
      body.nl();
    }

    const bm = dir.getPath("__spec__.ts");
    bm.addImport(`import {reflection as $} from "edgedb";`);
    bm.writeln(`export const spec: $.TypesSpec = new $.StrictMap();`);
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

    for (const type of types.values()) {
      if (type.kind !== "object") {
        continue;
      }
      if (
        (type.union_of && type.union_of.length) ||
        (type.intersection_of && type.intersection_of.length)
      ) {
        continue;
      }

      const {mod, name} = genutil.splitName(type.name);
      const ident = genutil.toIdent(name);
      const body = dir.getPath(`modules/${mod}.ts`);
      body.addImport(`import {reflection as $} from "edgedb";`);
      body.addImport(`import {spec as __spec__} from "../__spec__";`);
      body.addImport(`import type * as __types__ from "../__types__/${mod}";`);

      body.writeln(
        `export const ${ident} = $.objectType<__types__.${ident}>(`
      );
      body.indented(() => {
        body.writeln(`__spec__,`);
        body.writeln(`${JSON.stringify(type.name)},`);
      });
      body.writeln(`);`);
      body.nl();
    }

    const index = dir.getPath("index.ts");
    for (const mod of Array.from(modsIndex).sort()) {
      if (dir.getPath(`modules/${mod}.ts`).isEmpty()) {
        continue;
      }
      index.addImport(`export * as ${mod} from "./modules/${mod}";`);
    }
  } finally {
    await con.close();
  }

  console.log(`writing to disk.`);
  dir.write(to);
}
