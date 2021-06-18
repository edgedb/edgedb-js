import fs from "fs";
import {CodeBuilder, DirBuilder} from "./builders";
import {connect} from "../index.node";
import {Connection} from "../ifaces";
import {StrictMap} from "./strictMap";
import {ConnectConfig} from "../con_utils";
import {getCasts} from "./casts";
import {getScalars} from "./scalars";
import * as introspect from "./introspect";
import * as genutil from "./genutil";
import path from "path";

// get from map, defaults to empty array;
const getFromMap = <T>(map: Record<string, T[]>, id: string) => {
  return map[id] || [];
};

const deduplicate = (args: string[]) => [...new Set(args)];

export async function generateQB(
  to: string,
  cxnConfig?: ConnectConfig
): Promise<void> {
  const cxn = await connect(cxnConfig);
  const dir = new DirBuilder();

  try {
    const types = await introspect.fetchTypes(cxn, {debug: true});
    const {
      castMap,
      assignmentCastMap,
      implicitCastMap,
      assignableByMap,
    } = await getCasts(cxn, {
      debug: true,
    });
    const modsIndex = new Set<string>();

    const typesById: Record<string, introspect.Type> = {};
    const typesByName: Record<string, introspect.Type> = {};
    for (const type of types.values()) {
      typesById[type.id] = type;
      typesByName[type.name] = type;
    }

    // write scalarBase file
    const base = dir.getPath("scalarBase.ts");
    base.writeln(
      fs.readFileSync(path.join(__dirname, "ts/scalarBase.ts"), "utf8")
    );

    /////////////////////////////////////
    // generate implicit scalar mapping
    /////////////////////////////////////

    const f = dir.getPath("modules/__typeutil__.ts");
    const getScopedDisplayName = genutil.getScopedDisplayName(
      `${Math.random()}`,
      f
    );

    // generate minimal typescript cast
    const generateCastMap = (params: {
      typeList: introspect.Type[];
      casting: (id: string) => string[];
      file: CodeBuilder;
      mapName: string;
      baseCase?: string;
    }) => {
      const {typeList, casting, file, mapName, baseCase} = params;
      const scopedBaseCase = baseCase ? getScopedDisplayName(baseCase) : "";
      file.writeln(
        `export type ${mapName}<A${
          scopedBaseCase ? ` extends ${scopedBaseCase}` : ""
        }, B${scopedBaseCase ? ` extends ${scopedBaseCase}` : ""}> = `
      );
      file.indented(() => {
        for (const outer of typeList) {
          const outerCastableTo = casting(outer.id);
          file.writeln(`A extends ${getScopedDisplayName(outer.name)} ? `);
          file.indented(() => {
            for (const inner of typeList) {
              const innerCastableTo = casting(inner.id);

              const sameType = inner.name === outer.name;

              const aCastableToB = outerCastableTo.includes(inner.id);
              const bCastableToA = innerCastableTo.includes(outer.id);

              let sharedParent: string | null = null;
              const sharedParentId = outerCastableTo.find((t) =>
                innerCastableTo.includes(t)
              );
              if (sharedParentId) {
                const sharedParentName = typesById[sharedParentId].name;
                if (sharedParentName !== baseCase) {
                  sharedParent = sharedParentName;
                }
              }

              const validCast =
                sameType || aCastableToB || bCastableToA || sharedParent;

              if (validCast) {
                file.writeln(
                  `B extends ${getScopedDisplayName(inner.name)} ? `
                );

                if (sameType) {
                  file.writeln(`B`);
                } else if (aCastableToB) {
                  file.writeln(`B`);
                } else if (bCastableToA) {
                  file.writeln(`A`);
                } else if (sharedParent) {
                  file.writeln(getScopedDisplayName(sharedParent));
                } else {
                  file.writeln(scopedBaseCase || "never");
                }
                file.writeln(`:`);
              }
            }
            file.writeln(scopedBaseCase || "never");
          });
          file.writeln(":");
        }
        file.writeln(scopedBaseCase || "never");
      });
    };

    const reverseTopo = Array.from(types)
      .reverse() // reverse topological order
      .map(([_, type]) => type);

    const materialScalars = reverseTopo.filter(
      (type) =>
        type.kind === "scalar" &&
        !type.is_abstract &&
        (!type.enum_values || !type.enum_values.length)
    );

    const userDefinedObjectTypes = reverseTopo.filter((type) => {
      if (type.kind !== "object") return false;
      if (type.name) if (type.name.includes("schema::")) return false;
      if (type.name.includes("sys::")) return false;
      if (type.name.includes("cfg::")) return false;
      if (type.name.includes("seq::")) return false;
      if (type.name.includes("stdgraphql::")) return false;
      if (
        !type.ancestors
          .map((t) => t.id)
          .includes(typesByName["std::Object"].id) &&
        type.name !== "std::Object"
      )
        return false;
      return true;
    });

    generateCastMap({
      typeList: materialScalars,
      // casting:
      casting: (id: string) => {
        const type = typesById[id];
        return deduplicate([...getFromMap(implicitCastMap, type.id)]);
      },
      file: f,
      mapName: "getSharedParentScalar",
    });

    f.nl();

    generateCastMap({
      typeList: userDefinedObjectTypes,
      casting: (id: string) => {
        const type = typesById[id];
        return deduplicate([
          ...(type.kind === "object" ? type.ancestors.map((a) => a.id) : []),
        ]);
      },
      file: f,
      mapName: "getSharedParentObject",
      baseCase: "std::Object",
    });

    //////////////////////////////
    // generate scalar definitions
    //////////////////////////////

    for (const type of types.values()) {
      if (type.kind !== "scalar") {
        continue;
      }

      const {mod, name} = genutil.splitName(type.name);
      const symbolName = `${name.toUpperCase()}_SYMBOL`;
      const displayName = genutil.displayName(type.name);

      const sc = dir.getPath(`modules/${mod}.ts`);
      const getScopedDisplayName = genutil.getScopedDisplayName(mod, sc);
      const baseExtends = type.bases
        .map((a) => typesById[a.id])
        .map((t) => getScopedDisplayName(t.name));

      if (type.is_abstract && !["std::anyenum"].includes(type.name)) {
        //         if (type.name === "std::anyenum") {
        //           sc.writeln(`export const ANYENUM_SYMBOL: unique symbol = Symbol("anyenum");
        // export type Anyenum<TsType = unknown, Name extends string = string,
        //   Values extends [string, ...string[]] = [string, ...string[]]
        // > = scalarBase.Materialtype<TsType, Name, any, any, any> & {
        //   [ANYENUM_SYMBOL]: true;
        //   __values: Values;
        // };`);
        //           sc.nl();

        //           continue;
        //         }
        sc.writeln(
          `const ${symbolName}: unique symbol = Symbol("${type.name}")`
        );

        const bases = baseExtends.join(", ");
        sc.writeln(
          `export interface ${displayName} ${
            bases ? `extends ${bases} ` : ""
          } {`
        );
        sc.indented(() => {
          sc.writeln(`[${symbolName}]: true;`);
        });
        sc.writeln(`}`);
        sc.nl();

        continue;
      }

      sc.addImport(`import type * as scalarBase from "../scalarBase";`);

      // generate enum
      if (type.enum_values && type.enum_values.length) {
        sc.writeln(`export enum ${name}Enum {`);
        sc.indented(() => {
          for (const val of type.enum_values) {
            sc.writeln(`${genutil.toIdent(val)} = ${genutil.quote(val)},`);
          }
        });
        sc.writeln(`}`);

        // export type Genre = GenreEnum & {asdf:true};
        const valuesArr = `[${type.enum_values
          .map((v) => `"${v}"`)
          .join(", ")}]`;
        sc.writeln(
          `export type ${name} = typeof ${name}Enum & ${getScopedDisplayName(
            "std::anyenum"
          )}<${name}Enum, "${type.name}", ${valuesArr}>;`
        );
        sc.writeln(
          `export const ${name}: ${name} = {...${name}Enum, __values: ${valuesArr}} as any;`
        );

        sc.nl();
        continue;
      }

      // generate non-enum non-abstract scalar
      let jsType = genutil.toJsScalarType(type, types, mod, sc);
      let nameType = `"${type.name}"`;
      let genericOverride = "";
      let isRuntime = true;
      let typeLines: string[] = [];

      const castableTypes = deduplicate([
        // ...type.ancestors.map((a) => a.id),
        ...getFromMap(castMap, type.id),
      ])
        .map((id) => typesById[id].name)
        .map(getScopedDisplayName);
      // const castableTypesArrayString = `[${castableTypes.join(", ")}]`;
      const castableTypesUnion = `${castableTypes.join(" | ")}` || "never";
      const assignableTypes = deduplicate([
        // ...type.ancestors.map((a) => a.id),
        // ...getFromMap(implicitCastMap, type.id),
        ...getFromMap(assignableByMap, type.id),
      ])
        .map((id) => typesById[id].name)
        .map(getScopedDisplayName);
      // const assignableTypesArrayString = `[${assignableTypes.join(", ")}]`;
      const assignableTypesUnion = `${assignableTypes.join(" | ")}` || "never";
      const implicitlyCastableTypes = deduplicate([
        ...getFromMap(implicitCastMap, type.id),
      ])
        .map((id) => typesById[id].name)
        .map(getScopedDisplayName);
      // const implicitlyCastableTypesArrayString = `[${implicitlyCastableTypes.join(", ")}]`;
      const implicitlyCastableTypesUnion =
        `${implicitlyCastableTypes.join(" | ")}` || "never";

      sc.writeln(
        `const ${symbolName}: unique symbol = Symbol("${type.name}");`
      );

      if (type.name === "std::anyenum") {
        jsType = "TsType";
        nameType = "Name";
        isRuntime = false;
        genericOverride = `<TsType = unknown, Name extends string = string, Values extends [string, ...string[]] = [string, ...string[]]>`;
        typeLines = [`__values: Values;`];
      }

      const bases = baseExtends.join(", ");
      sc.writeln(
        `export interface ${displayName}${genericOverride}${
          bases ? ` extends ${bases}` : ""
        }, scalarBase.Materialtype<${jsType}, ${nameType}, ${castableTypesUnion}, ${assignableTypesUnion}, ${implicitlyCastableTypesUnion}> {`
      );

      sc.indented(() => {
        sc.writeln(`[${symbolName}]: true;`);
        for (const line of typeLines) {
          sc.writeln(line);
        }
      });
      sc.writeln("}");

      if (isRuntime) {
        sc.writeln(`export const ${displayName}: ${displayName} = {`);
        // sc.writeln(`  [scalarBase.ANYTYPE]: true,`);
        // sc.writeln(`  [${symbolName}]: true,`);
        // sc.writeln(
        //   `  get [scalarBase.CASTABLE](){ return ${castableTypesArrayString} },`
        // );
        // sc.writeln(
        //   `  get [scalarBase.ASSIGNABLE](){ return ${assignableTypesArrayString} },`
        // );
        // sc.writeln(
        //   `  get [scalarBase.IMPLICITCAST](){ return ${implicitlyCastableTypesArrayString} },`
        // );
        sc.writeln(`  __name: "${type.name}",`);
        sc.writeln(`} as any;`);
      }
      sc.nl();
    }

    /////////////////////////
    // generate object types
    /////////////////////////
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
      const body = dir.getPath(`modules/${mod}.ts`);

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

    /////////////////////////
    // generate runtime __spec__
    /////////////////////////
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

    /////////////////////////
    // generate object types
    /////////////////////////
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
      // body.addImport(`import type * as __types__ from "../__types__/${mod}";`);

      body.writeln(`export const ${ident} = $.objectType<${ident}>(`);
      body.indented(() => {
        body.writeln(`__spec__,`);
        body.writeln(`${JSON.stringify(type.name)},`);
      });
      body.writeln(`);`);
      body.nl();
    }

    /////////////////////////
    // generate index file
    /////////////////////////

    const index = dir.getPath("index.ts");
    for (const mod of Array.from(modsIndex).sort()) {
      if (dir.getPath(`modules/${mod}.ts`).isEmpty()) {
        continue;
      }
      index.addImport(`export * as ${mod} from "./modules/${mod}";`);
    }
  } finally {
    await cxn.close();
  }

  console.log(`writing to disk.`);
  dir.write(to);
}
