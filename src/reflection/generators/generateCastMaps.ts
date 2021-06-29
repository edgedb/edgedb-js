import {CodeBuilder, DirBuilder} from "../builders";
import type {GeneratorParams} from "../generate";
import type * as introspect from "../queries/getTypes";
import {genutil} from "../util/genutil";
import {util} from "../util/util";

export const generateCastMaps = async (params: GeneratorParams) => {
  const {dir, types, typesByName, casts} = params;
  const {implicitCastMap} = casts;

  const f = dir.getPath("modules/$castMaps.ts");
  const getScopedDisplayName = genutil.getScopedDisplayName(
    `${Math.random()}`,
    f
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

  f.writeln(`export type getSharedParentScalar<A, B> = `);
  f.indented(() => {
    for (const outer of materialScalars) {
      const outerCastableTo = casting(outer.id);
      f.writeln(`A extends ${getScopedDisplayName(outer.name)} ? `);

      f.indented(() => {
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
            f.writeln(`B extends ${getScopedDisplayName(inner.name)} ? `);

            if (sameType) {
              f.writeln(`B`);
            } else if (aCastableToB) {
              f.writeln(`B`);
            } else if (bCastableToA) {
              f.writeln(`A`);
            } else if (sharedParent) {
              f.writeln(getScopedDisplayName(sharedParent));
            } else {
              f.writeln("never");
            }
            f.writeln(`:`);
          }
        }
        f.writeln("never");
      });
      f.writeln(":");
    }
    f.writeln("never");
  });

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
