import {CodeBuilder, DirBuilder} from "../builders";
import type {GeneratorParams} from "../generate";
import type * as introspect from "../queries/getTypes";
import {genutil} from "../util/genutil";
import {util} from "../util/util";

export const generateCastMaps = async (params: GeneratorParams) => {
  const {dir, types, typesByName, casts} = params;
  const {implicitCastMap} = casts;

  const f = dir.getPath("castMaps.ts");
  f.addImport(`import {reflection as $} from "edgedb";`);
  const getScopedDisplayName = genutil.getScopedDisplayName(
    `${Math.random()}`,
    f,
    {prefix: "./modules/"}
  );

  const reverseTopo = Array.from(types)
    .reverse() // reverse topological order
    .map(([_, type]) => type);

  /////////////////////////////////////
  // generate implicit scalar mapping
  /////////////////////////////////////

  const materialScalars = reverseTopo.filter(
    (type) =>
      type.kind === "scalar" &&
      !type.is_abstract &&
      (!type.enum_values || !type.enum_values.length)
  );

  const casting = (id: string) => {
    const type = types.get(id);
    const castable = util.deduplicate([
      ...util.getFromArrayMap(implicitCastMap, type.id),
    ]);
    return castable;
  };

  const staticMap: string[] = [`export type getSharedParentScalar<A, B> =`];
  const runtimeMap: string[] = [
    `export function getSharedParentScalar<A extends $.ScalarType, B extends $.ScalarType>(a: A, b: B){`,
  ];

  for (const outer of materialScalars) {
    const outerCastableTo = casting(outer.id);
    staticMap.push(`  A extends ${getScopedDisplayName(outer.name)} ?`);
    runtimeMap.push(
      `  if (a.__name__ === ${getScopedDisplayName(outer.name)}.__name__) {`
    );
    // f.writeln(`A extends ${getScopedDisplayName(outer.name)} ?`);

    for (const inner of materialScalars) {
      const innerCastableTo = casting(inner.id);
      const sameType = inner.name === outer.name;
      const aCastableToB = outerCastableTo.includes(inner.id);
      const bCastableToA = innerCastableTo.includes(outer.id);

      let sharedParent: string | null = null;
      const sharedParentId = outerCastableTo.find((t) =>
        innerCastableTo.includes(t)
      );
      if (sharedParentId) {
        const sharedParentName = types.get(sharedParentId).name;
        sharedParent = sharedParentName;
      }

      const validCast =
        sameType || aCastableToB || bCastableToA || sharedParent;

      if (validCast) {
        staticMap.push(`    B extends ${getScopedDisplayName(inner.name)} ?`);
        runtimeMap.push(
          `    if(b.__name__ === ${getScopedDisplayName(
            inner.name
          )}.__name__) {`
        );

        if (sameType) {
          staticMap.push(`    B`);
          runtimeMap.push(`      return b;`);
        } else if (aCastableToB) {
          staticMap.push(`    B`);
          runtimeMap.push(`      return b;`);
        } else if (bCastableToA) {
          staticMap.push(`    A`);
          runtimeMap.push(`      return a;`);
        } else if (sharedParent) {
          const scoped = getScopedDisplayName(sharedParent);

          staticMap.push(`    ${scoped}`);
          runtimeMap.push(`      return ${scoped};`);
        } else {
          staticMap.push("    never");
          runtimeMap.push(
            `      throw new Error(\`Types are not castable: \${a.__name__}, \${b.__name__}\`);`
          );
        }
        staticMap.push(`    :`);
        runtimeMap.push(`    }`);
      }
    }
    staticMap.push("    never");
    runtimeMap.push(
      `    throw new Error(\`Types are not castable: \${a.__name__}, \${b.__name__}\`);`
    );
    runtimeMap.push("    }");

    staticMap.push("  :");
  }
  staticMap.push("never");
  runtimeMap.push(
    `  throw new Error(\`Types are not castable: \${a.__name__}, \${b.__name__}\`);`
  );
  runtimeMap.push(`}`);

  f.writeln(staticMap.join("\n"));
  f.nl();
  f.writeln(runtimeMap.join("\n"));

  // const userDefinedObjectTypes = reverseTopo.filter((type) => {
  //   if (type.kind !== "object") return false;
  //   if (type.name.includes("schema::")) return false;
  //   if (type.name.includes("sys::")) return false;
  //   if (type.name.includes("cfg::")) return false;
  //   if (type.name.includes("seq::")) return false;
  //   if (type.name.includes("stdgraphql::")) return false;
  //   if (
  //     !type.ancestors
  //       .map((t) => t.id)
  //       .includes(typesByName["std::Object"].id) &&
  //     type.name !== "std::Object"
  //   ) {
  //     return false;
  //   }
  //   return true;
  // });

  // generateCastMap({
  //   materialScalars: materialScalars,
  //   casting: (id: string) => {
  //     const type = types.get(id);

  //     const castable = util.deduplicate([
  //       ...util.getFromArrayMap(implicitCastMap, type.id),
  //     ]);

  //     return castable;
  //   },
  //   file: f,
  //   mapName: "getSharedParentScalar",
  // });

  f.nl();

  // generateCastMap({
  //   materialScalars: userDefinedObjectTypes,
  //   casting: (id: string) => {
  //     const type = types.get(id);
  //     return util.deduplicate([
  //       ...(type.kind === "object" ? type.ancestors.map((a) => a.id) : []),
  //     ]);
  //   },
  //   file: f,
  //   mapName: "getSharedParentObject",
  //   baseCase: "std::Object",
  // });
};
