import {CodeFragment} from "../builders";
import type {GeneratorParams} from "../generate";
import {getRef, frag, joinFrags, quote} from "../util/genutil";
import {util} from "../util/util";
import {getStringRepresentation} from "./generateObjectTypes";

const getRuntimeRef = (name: string) => getRef(name, {prefix: ""});

export const generateCastMaps = (params: GeneratorParams) => {
  const {dir, types, typesByName, casts} = params;
  const {implicitCastMap} = casts;

  const f = dir.getPath("castMaps.ts");
  f.addImport(`import {$} from "edgedb";`);

  const reverseTopo = Array.from(types)
    .reverse() // reverse topological order
    .map(([_, type]) => type);

  /////////////////////////////////////
  // generate implicit scalar mapping
  /////////////////////////////////////

  const materialScalars = reverseTopo.filter(
    type =>
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

  const assignableMap: CodeFragment[][] = [
    [`export type scalarAssignableBy<T extends $.ScalarType> =`],
  ];
  const castableMap: CodeFragment[][] = [
    [`export type scalarCastableFrom<T extends $.ScalarType> =`],
  ];

  const staticMap: CodeFragment[][] = [
    [`export type getSharedParentScalar<A, B> =`],
  ];
  const runtimeMap: CodeFragment[][] = [
    [
      `export function getSharedParentScalar<A extends $.ScalarType, B extends $.ScalarType>(a: A, b: B){`,
    ],
  ];

  for (const outer of materialScalars) {
    assignableMap.push(
      frag`  T extends ${getRef(outer.name)} ? ${
        getStringRepresentation(types.get(outer.id), {
          types,
          casts: casts.assignableByMap,
          castSuffix: "λIAssignableBy",
        }).staticType
      } : `
    );
    castableMap.push(
      frag`  T extends ${getRef(outer.name)} ? ${
        getStringRepresentation(types.get(outer.id), {
          types,
          casts: casts.implicitCastFromMap,
          castSuffix: "λICastableTo",
        }).staticType
      } : `
    );

    const outerCastableTo = casting(outer.id);
    staticMap.push(frag`  A extends ${getRef(outer.name)} ?`);
    runtimeMap.push(
      frag`  if (a.__name__ === ${getRuntimeRef(outer.name)}.__name__) {`
    );
    // f.writeln(`A extends ${getScopedDisplayName(outer.name)} ?`);

    for (const inner of materialScalars) {
      const innerCastableTo = casting(inner.id);
      const sameType = inner.name === outer.name;
      const aCastableToB = outerCastableTo.includes(inner.id);
      const bCastableToA = innerCastableTo.includes(outer.id);

      let sharedParent: string | null = null;
      const sharedParentId = outerCastableTo.find(t =>
        innerCastableTo.includes(t)
      );
      if (sharedParentId) {
        const sharedParentName = types.get(sharedParentId).name;
        sharedParent = sharedParentName;
      }

      const validCast =
        sameType || aCastableToB || bCastableToA || sharedParent;

      if (validCast) {
        staticMap.push(frag`    B extends ${getRef(inner.name)} ?`);
        runtimeMap.push(
          frag`    if(b.__name__ === ${getRuntimeRef(inner.name)}.__name__) {`
        );

        if (sameType) {
          staticMap.push([`    B`]);
          runtimeMap.push([`      return b;`]);
        } else if (aCastableToB) {
          staticMap.push([`    B`]);
          runtimeMap.push([`      return b;`]);
        } else if (bCastableToA) {
          staticMap.push([`    A`]);
          runtimeMap.push([`      return a;`]);
        } else if (sharedParent) {
          staticMap.push(frag`    ${getRef(sharedParent)}`);
          runtimeMap.push(frag`      return ${getRuntimeRef(sharedParent)};`);
        } else {
          staticMap.push(["    never"]);
          runtimeMap.push([
            `      throw new Error(\`Types are not castable: \${a.__name__}, \${b.__name__}\`);`,
          ]);
        }
        staticMap.push([`    :`]);
        runtimeMap.push([`    }`]);
      }
    }

    staticMap.push(["    never"]);
    runtimeMap.push([
      `    throw new Error(\`Types are not castable: \${a.__name__}, \${b.__name__}\`);`,
    ]);
    runtimeMap.push(["    }"]);

    staticMap.push(["  :"]);
  }
  assignableMap.push([`  never`]);
  castableMap.push([`  never`]);
  staticMap.push(["never"]);
  runtimeMap.push([
    `  throw new Error(\`Types are not castable: \${a.__name__}, \${b.__name__}\`);`,
  ]);
  runtimeMap.push([`}`]);

  f.writeln(joinFrags(assignableMap, "\n"));
  f.nl();
  f.writeln(joinFrags(castableMap, "\n"));
  f.nl();
  f.writeln(joinFrags(staticMap, "\n"));
  f.nl();
  f.writeln(joinFrags(runtimeMap, "\n"));

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

  f.writeln(frag`const implicitCastMap = new Map<string, Set<string>>([`);
  f.indented(() => {
    for (const [sourceId, castableTo] of Object.entries(
      casts.implicitCastMap
    )) {
      if (castableTo.length) {
        f.writeln(
          frag`[${quote(types.get(sourceId).name)}, new Set([${castableTo
            .map(targetId => quote(types.get(targetId).name))
            .join(", ")}])],`
        );
      }
    }
  });
  f.writeln(frag`]);`);
  f.writeln(
    frag`export function isImplicitlyCastableTo(from: string, to: string): boolean {
  return implicitCastMap.get(from)?.has(to) ?? false;
};\n`
  );
};
