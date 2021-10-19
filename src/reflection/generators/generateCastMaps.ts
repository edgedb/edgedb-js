import {CodeBuffer, CodeFragment, dts, IdentRef, r, t, ts} from "../builders";
import type {GeneratorParams} from "../generate";
import {getRef, frag, joinFrags, quote} from "../util/genutil";
import {util} from "../util/util";
import {getStringRepresentation} from "./generateObjectTypes";

const getRuntimeRef = (name: string) => getRef(name, {prefix: ""});

export const generateCastMaps = (params: GeneratorParams) => {
  const {dir, types, typesByName, casts} = params;
  const {implicitCastMap} = casts;

  const f = dir.getPath("castMaps");
  f.addImport({$: true}, "edgedb", false, ["ts", "dts"]);

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

  const assignableMap = new CodeBuffer();
  assignableMap.writeln([
    t`export `,
    dts`declare `,
    t`type scalarAssignableBy<T extends $.ScalarType> =`,
  ]);
  const castableMap = new CodeBuffer();
  castableMap.writeln([
    t`export `,
    dts`declare `,
    t`type scalarCastableFrom<T extends $.ScalarType> =`,
  ]);

  const staticMap = new CodeBuffer();
  staticMap.writeln([dts`declare `, t`type getSharedParentScalar<A, B> =`]);
  const runtimeMap = new CodeBuffer();

  const returnTypes = new Set<string>();

  for (const outer of materialScalars) {
    assignableMap.writeln([
      t`  T extends ${getRef(outer.name)} ? ${
        getStringRepresentation(types.get(outer.id), {
          types,
          casts: casts.assignableByMap,
          castSuffix: "λIAssignableBy",
        }).staticType
      } : `,
    ]);
    castableMap.writeln([
      t`  T extends ${getRef(outer.name)} ? ${
        getStringRepresentation(types.get(outer.id), {
          types,
          casts: casts.implicitCastFromMap,
          castSuffix: "λICastableTo",
        }).staticType
      } : `,
    ]);

    const outerCastableTo = casting(outer.id);
    staticMap.writeln([t`  A extends ${getRef(outer.name)} ?`]);
    runtimeMap.writeln([
      r`  if (a.__name__ === ${getRuntimeRef(outer.name)}.__name__) {`,
    ]);

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
        staticMap.writeln([t`    B extends ${getRef(inner.name)} ?`]);
        runtimeMap.writeln([
          r`    if(b.__name__ === ${getRuntimeRef(inner.name)}.__name__) {`,
        ]);

        if (sameType) {
          staticMap.writeln([t`    B`]);
          runtimeMap.writeln([r`      return b;`]);
        } else if (aCastableToB) {
          staticMap.writeln([t`    B`]);
          runtimeMap.writeln([r`      return b;`]);
        } else if (bCastableToA) {
          staticMap.writeln([t`    A`]);
          runtimeMap.writeln([r`      return a;`]);
        } else if (sharedParent) {
          staticMap.writeln([t`    ${getRef(sharedParent)}`]);
          runtimeMap.writeln([
            r`      return ${getRuntimeRef(sharedParent)};`,
          ]);
          returnTypes.add(sharedParent);
        } else {
          staticMap.writeln([t`    never`]);
          runtimeMap.writeln([
            r`      throw new Error(\`Types are not castable: \${a.__name__}, \${b.__name__}\`);`,
          ]);
        }
        staticMap.writeln([t`    :`]);
        runtimeMap.writeln([r`    }`]);
      }
    }

    staticMap.writeln([t`    never`]);
    runtimeMap.writeln([
      r`    throw new Error(\`Types are not castable: \${a.__name__}, \${b.__name__}\`);`,
    ]);

    staticMap.writeln([t`  :`]);
    runtimeMap.writeln([r`    }`]);
  }
  assignableMap.writeln([t`  never\n`]);
  castableMap.writeln([t`  never\n`]);
  staticMap.writeln([t`never\n`]);
  runtimeMap.writeln([
    r`  throw new Error(\`Types are not castable: \${a.__name__}, \${b.__name__}\`);`,
  ]);
  runtimeMap.writeln([r`}\n`]);

  f.writeBuf(assignableMap);
  f.nl();
  f.writeBuf(castableMap);
  f.nl();
  f.writeBuf(staticMap);
  f.nl();

  f.writeln([
    dts`declare `,
    `function getSharedParentScalar`,
    t`<A extends $.ScalarType, B extends $.ScalarType>`,
    `(a`,
    t`: A`,
    `, b`,
    t`: B`,
    `)`,
    t`: ${joinFrags(
      ["A", "B", ...[...returnTypes].map(type => getRef(type))],
      " | "
    )}`,
    r` {`,
  ]);
  f.addExport("getSharedParentScalar");
  f.writeBuf(runtimeMap);

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

  f.writeln([
    r`const implicitCastMap = new Map`,
    ts`<string, Set<string>>`,
    r`([`,
  ]);
  f.indented(() => {
    for (const [sourceId, castableTo] of Object.entries(
      casts.implicitCastMap
    )) {
      if (castableTo.length) {
        f.writeln([
          r`[${quote(types.get(sourceId).name)}, new Set([${castableTo
            .map(targetId => quote(types.get(targetId).name))
            .join(", ")}])],`,
        ]);
      }
    }
  });
  f.writeln([r`]);`]);
  f.writeln([
    dts`declare `,
    `function isImplicitlyCastableTo(from`,
    t`: string`,
    `, to`,
    t`: string`,
    `)`,
    t`: boolean`,
    r` {
  const _a = implicitCastMap.get(from),
        _b = _a != null ? _a.has(to) : null;
  return _b != null ? _b : false;
};\n`,
  ]);
  f.addExport("isImplicitlyCastableTo");
};
