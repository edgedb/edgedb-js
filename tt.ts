import {connect, Connection} from "edgedb";

import * as path from "path";
import * as fs from "fs";

class CodeBuilder {
  private buf: string[] = [];
  private indent: number = 0;
  private imports = new Set<string>();

  addImport(imp: string): void {
    this.imports.add(imp);
  }

  nl(): void {
    this.buf.push("");
  }

  indented(nested: () => void): void {
    this.indent++;
    try {
      nested();
    } finally {
      this.indent--;
    }
  }

  writeln(line: string): void {
    this.buf.push("  ".repeat(this.indent) + line);
  }

  render(): string {
    return (
      Array.from(this.imports).join("\n") + "\n" + this.buf.join("\n") + "\n"
    );
  }

  isEmpty(): boolean {
    return !this.buf.length && !this.imports.size;
  }
}

class DirBuilder {
  private _map = new Map<string, CodeBuilder>();

  getPath(fn: string): CodeBuilder {
    if (!this._map.has(fn)) {
      this._map.set(fn, new CodeBuilder());
    }
    return this._map.get(fn)!;
  }

  debug(): string {
    const buf = [];
    for (const [fn, builder] of this._map.entries()) {
      buf.push(`>>> ${fn}\n`);
      buf.push(builder.render());
      buf.push(`\n`);
    }
    return buf.join("\n");
  }

  write(to: string): void {
    const dir = path.normalize(to);
    for (const [fn, builder] of this._map.entries()) {
      if (builder.isEmpty()) {
        continue;
      }

      const dest = path.join(dir, fn);
      const destDir = path.dirname(dest);

      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, {recursive: true});
      }

      fs.writeFileSync(dest, builder.render());
    }
  }
}

type UUID = string;

type IntrospectedPointer = {
  cardinality: "ONE" | "MANY";
  kind: "link" | "property";
  required: boolean;
  name: string;
  expr: string | null;

  target_id: UUID;

  pointers: ReadonlyArray<{
    name: string;
    target_id: UUID;
  }> | null;
};

type IntrospectedTypeKind = "object" | "scalar" | "array" | "tuple";

type IntrospectedBaseType<T extends IntrospectedTypeKind> = {
  kind: T;
  id: UUID;
  name: string;
};

type IntrospectedScalarType = IntrospectedBaseType<"scalar"> & {
  is_abstract: boolean;
  bases: ReadonlyArray<{id: UUID}>;
  enum_values: ReadonlyArray<string>;
  material_id: UUID | null;
};

type IntrospectedObjectType = IntrospectedBaseType<"object"> & {
  is_abstract: boolean;
  bases: ReadonlyArray<{id: UUID}>;
  union_of: ReadonlyArray<{id: UUID}>;
  intersection_of: ReadonlyArray<{id: UUID}>;
  pointers: ReadonlyArray<IntrospectedPointer>;
};

type IntrospectedArrayType = IntrospectedBaseType<"array"> & {
  array_element_id: UUID;
};

type IntrospectedTupleType = IntrospectedBaseType<"tuple"> & {
  tuple_elements: ReadonlyArray<{
    name: string;
    target_id: UUID;
  }>;
};

type IntrospectedType =
  | IntrospectedScalarType
  | IntrospectedObjectType
  | IntrospectedArrayType
  | IntrospectedTupleType;

type IntrospectedTypes = Map<UUID, IntrospectedType>;

async function fetchTypes(con: Connection): Promise<IntrospectedTypes> {
  const types: IntrospectedType[] = await con.query(`
    WITH
      MODULE schema,

      material_scalars := (
        SELECT ScalarType
        FILTER
          (.name LIKE 'std::%' OR .name LIKE 'cal::%')
          AND NOT .is_abstract
      )

    SELECT Type {
      id,
      name,
      is_abstract,

      kind := 'object' IF Type IS ObjectType ELSE
              'scalar' IF Type IS ScalarType ELSE
              'array' IF Type IS Array ELSE
              'tuple' IF Type IS Tuple ELSE
              'unknown',

      [IS ScalarType].enum_values,

      single material_id := (
        SELECT x := Type[IS ScalarType].ancestors
        FILTER x IN material_scalars
        LIMIT 1
      ).id,

      [IS InheritingObject].bases: {
        id
      } ORDER BY @index ASC,

      [IS ObjectType].union_of,
      [IS ObjectType].intersection_of,
      [IS ObjectType].pointers: {
        cardinality,
        required,
        name,
        expr,

        target_id := .target.id,

        kind := 'link' IF .__type__.name = 'schema::Link' ELSE 'property',

        [IS Link].pointers: {
          name,
          target_id := .target.id
        } FILTER @is_owned,
      } FILTER @is_owned,

      array_element_id := [IS Array].element_type.id,

      tuple_elements := (SELECT [IS Tuple].element_types {
        target_id := .type.id,
        name
      } ORDER BY @index ASC),
    }
    ORDER BY .name;
  `);
  // Now sort `types` topologically:

  const graph = new Map<UUID, IntrospectedType>();
  const adj = new Map<UUID, Set<UUID>>();

  for (const type of types) {
    graph.set(type.id, type);
  }

  for (const type of types) {
    if (type.kind !== "object" && type.kind !== "scalar") {
      continue;
    }

    for (const {id: base} of type.bases) {
      if (graph.has(base)) {
        if (!adj.has(type.id)) {
          adj.set(type.id, new Set());
        }
        adj.get(type.id)!.add(base);
      } else {
        throw new Error(`reference to an unknown object type: ${base}`);
      }
    }
  }

  const visiting = new Set<string>();
  const visited = new Set<UUID>();
  const sorted = new Map<UUID, IntrospectedType>();

  const visit = (type: IntrospectedType) => {
    if (visiting.has(type.name)) {
      const last = Array.from(visiting).slice(1, 2);
      throw new Error(`dependency cycle between ${type.name} and ${last}`);
    }
    if (!visited.has(type.id)) {
      visiting.add(type.name);
      if (adj.has(type.id)) {
        for (const adjId of adj.get(type.id)!.values()) {
          visit(graph.get(adjId)!);
        }
      }
      sorted.set(type.id, type);
      visited.add(type.id);
      visiting.delete(type.name);
    }
  };

  for (const type of types) {
    visit(type);
  }

  return sorted;
}

function getMod(name: string): string {
  const parts = name.split("::");
  if (!parts || parts.length !== 2) {
    throw new Error(`getMod: invalid name ${name}`);
  }
  return parts[0];
}

function getName(name: string): string {
  const parts = name.split("::");
  if (!parts || parts.length !== 2) {
    throw new Error(`getName: invalid name ${name}`);
  }
  return parts[1];
}

function snToIdent(name: string): string {
  if (name.includes("::")) {
    throw new Error(`snToIdent: invalid name ${name}`);
  }
  return name.replace(/([^a-zA-Z0-9_]+)/g, "_");
}

function fnToIdent(name: string): string {
  if (!name.includes("::")) {
    throw new Error(`fnToIdent: invalid name ${name}`);
  }
  return name.replace(/([^a-zA-Z0-9_]+)/g, "_");
}

function quote(val: string): string {
  return JSON.stringify(val.toString());
}

function toCardinality(p: IntrospectedPointer): string {
  if (p.cardinality === "ONE") {
    if (p.required) {
      return "One";
    } else {
      return "AtMostOne";
    }
  } else {
    if (p.required) {
      return "AtLeastOne";
    } else {
      return "Many";
    }
    toJsObjectType;
  }
}

function toPrimitiveJsType(s: IntrospectedScalarType): string {
  switch (s.name) {
    case "std::int16":
    case "std::int32":
    case "std::int64":
    case "std::float32":
    case "std::float64":
      return "number";

    case "std::str":
    case "std::uuid":
    case "std::json":
      return "string";

    case "std::bool":
      return "boolean";

    case "std::bigint":
      return "BigInt";

    case "std::decimal":
    case "std::bytes":
    case "std::datetime":
    case "std::duration":
    case "cal::local_datetime":
    case "cal::local_date":
    case "cal::local_time":
    // TODO

    default:
      return "unknown";
  }
}

function toJsScalarType(
  type: IntrospectedScalarType,
  types: IntrospectedTypes
): string {
  if (type.enum_values && type.enum_values.length) {
    const mod = getMod(type.name);
    const name = getName(type.name);
    return `${mod}Types.${name}`;
  }

  if (type.material_id) {
    return toJsScalarType(
      types.get(type.material_id)! as IntrospectedScalarType,
      types
    );
  }

  return toPrimitiveJsType(type);
}

function toJsObjectType(
  type: IntrospectedObjectType,
  types: IntrospectedTypes,
  currentMod: string,
  code: CodeBuilder,
  level: number = 0
): string {
  if (type.intersection_of && type.intersection_of.length) {
    const res: string[] = [];
    for (const {id: subId} of type.intersection_of) {
      const sub = types.get(subId)! as IntrospectedObjectType;
      res.push(toJsObjectType(sub, types, currentMod, code, level + 1));
    }
    const ret = res.join(" & ");
    return level > 0 ? `(${ret})` : ret;
  }

  if (type.union_of && type.union_of.length) {
    const res: string[] = [];
    for (const {id: subId} of type.union_of) {
      const sub = types.get(subId)! as IntrospectedObjectType;
      res.push(toJsObjectType(sub, types, currentMod, code, level + 1));
    }
    const ret = res.join(" | ");
    return level > 0 ? `(${ret})` : ret;
  }

  const mod = getMod(type.name);
  if (mod !== currentMod) {
    code.addImport(`import type * as ${mod}Types from "./${mod}";`);
    return `${mod}Types.${getName(type.name)}`;
  } else {
    return getName(type.name);
  }
}

async function main(): Promise<void> {
  const con = await connect({
    database: "select",
    user: "yury",
    host: "localhost",
  });

  const dir = new DirBuilder();

  try {
    const types = await fetchTypes(con);
    const modsWithEnums = new Set<string>();
    const modsIndex = new Set<string>();

    for (const type of types.values()) {
      if (type.kind !== "scalar" && type.kind !== "object") {
        continue;
      }

      const mod = getMod(type.name);
      modsIndex.add(mod);

      if (
        type.kind !== "scalar" ||
        !type.enum_values ||
        !type.enum_values.length
      ) {
        continue;
      }

      const b = dir.getPath(`modules/${mod}.ts`);

      b.writeln(`export enum ${getName(type.name)} {`);
      b.indented(() => {
        for (const val of type.enum_values) {
          b.writeln(`${snToIdent(val)} = ${quote(val)},`);
        }
      });
      b.writeln(`}`);
      b.nl();

      modsWithEnums.add(mod);
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

      const mod = getMod(type.name);
      const body = dir.getPath(`modules/${mod}.ts`);

      body.addImport(`import {model} from "edgedb";`);

      const bases = [];
      for (const {id: baseId} of type.bases) {
        const baseType = types.get(baseId)!;
        const baseMod = getMod(baseType.name);
        if (baseMod !== mod) {
          body.addImport(
            `import type * as ${baseMod}Types from "./${baseMod}";`
          );
          bases.push(`${baseMod}Types.${getName(baseType.name)}`);
        } else {
          bases.push(getName(baseType.name));
        }
      }
      if (bases.length) {
        body.writeln(
          `export interface ${snToIdent(
            getName(type.name)
          )} extends ${bases.join(", ")} {`
        );
      } else {
        body.writeln(`export interface ${snToIdent(getName(type.name))} {`);
      }

      body.indented(() => {
        for (const ptr of type.pointers) {
          const card = `model.Cardinality.${toCardinality(ptr)}`;

          if (ptr.kind === "link") {
            const trgType = types.get(
              ptr.target_id
            )! as IntrospectedObjectType;

            const tsType = toJsObjectType(trgType, types, mod, body);

            body.writeln(`${ptr.name}: model.Link<${tsType}, ${card}>;`);
          } else {
            const tsType = toJsScalarType(
              types.get(ptr.target_id)! as IntrospectedScalarType,
              types
            );

            body.writeln(`${ptr.name}: model.Property<${tsType}, ${card}>;`);
          }
        }
      });
      body.writeln(`}`);
      body.nl();
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

      const mod = getMod(type.name);
      const body = dir.getPath(`modules/${mod}.ts`);

      body.writeln(`export const ${snToIdent(getName(type.name))} = {`);
      body.indented(() => {
        body.writeln(
          `shape: <Spec extends model.MakeSelectArgs<${getName(type.name)}>>(`
        );
        body.indented(() => {
          body.writeln(`spec: Spec`);
        });
        body.writeln(
          `): model.Query<model.Result<Spec, ${getName(
            type.name
          )}>> => {throw new Error("not impl");}`
        );
      });
      body.writeln(`} as const;`);
    }

    /*const base = dir.getPath("__base__.ts");
    const body = base.body;

    base.addImport(`import {model} from "edgedb";`);
    base.head.nl();
    for (const mod of modsWithEnums) {
      base.head.writeln(
        `import type * as ${mod}Types from "./modules/${mod}";`
      );
    }

    const topObjectTypes = new Set<string>();

    body.writeln("const base = (function() {");
    body.indented(() => {
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

        const mod = getMod(type.name);
        modsIndex.add(mod);
        topObjectTypes.add(type.name);

        body.writeln(`const ${fnToIdent(type.name)} = {`);
        body.indented(() => {
          for (const {id: baseId} of type.bases) {
            const baseType = types.get(baseId)!;
            body.writeln(`...${fnToIdent(baseType.name)},`);
          }

          if (type.bases.length && type.pointers.length) {
            body.nl();
          }

          for (const ptr of type.pointers) {
            body.writeln(`get ${ptr.name}() {`);
            body.indented(() => {
              body.writeln(`return {`);

              const card = `model.Cardinality.${toCardinality(ptr)}`;

              if (ptr.kind === "link") {
                const ttype = types.get(
                  ptr.target_id
                )! as IntrospectedObjectType;

                const [typeType, jsType] = toJsObjectType(ttype, types);

                body.indented(() => {
                  body.writeln(`kind: model.Kind.link,`);
                  body.writeln(`name: ${JSON.stringify(ptr.name)},`);
                  body.writeln(`cardinality: ${card},`);
                  body.writeln(`target: ${jsType},`);
                });
                body.writeln(`} as model.Link<${typeType}, ${card}>;`);
              } else {
                const jstype = toJsScalarType(
                  types.get(ptr.target_id)! as IntrospectedScalarType,
                  types
                );

                body.indented(() => {
                  body.writeln(`kind: model.Kind.property,`);
                  body.writeln(`name: ${JSON.stringify(ptr.name)},`);
                  body.writeln(`cardinality: ${card},`);
                });
                body.writeln(`} as model.Property<${jstype}, ${card}>;`);
              }
            });
            body.writeln("},");
          }
        });
        body.writeln(`} as const;`);
        body.nl();

        const mb = dir.getPath(`modules/${mod}.ts`);
        if (!mb.flags.has("base-import")) {
          mb.flags.add("base-import");
          mb.head.writeln(`import {model} from "edgedb";`);
          mb.head.writeln('import base from "../__base__";');
        }
        mb.body.writeln(`export const ${snToIdent(getName(type.name))} = {`);
        mb.body.indented(() => {
          mb.body.writeln(`...base.${fnToIdent(type.name)},`);

          mb.body.writeln(
            `shape: <Spec extends model.MakeSelectArgs<typeof base.${fnToIdent(
              type.name
            )}>>(`
          );
          mb.body.indented(() => {
            mb.body.writeln(`spec: Spec`);
          });
          mb.body.writeln(
            `): model.Query<model.Result<Spec, typeof base.${fnToIdent(
              type.name
            )}>> => {throw new Error("not impl");}`
          );
        });
        mb.body.writeln(`} as const;`);
        mb.body.nl();
      }

      body.writeln("return {");
      body.indented(() => {
        for (const typeName of topObjectTypes) {
          body.writeln(`${fnToIdent(typeName)},`);
        }
      });
      body.writeln("};");
    });
    body.writeln("})();");

    body.nl();
    body.writeln("export default base;");

    */

    const index = dir.getPath("index.ts");
    for (const mod of modsIndex) {
      if (dir.getPath(`modules/${mod}.ts`).isEmpty()) {
        continue;
      }
      index.addImport(`import * as _${mod} from "./modules/${mod}";`);
    }
    index.writeln("const modules = {");
    for (const mod of modsIndex) {
      if (dir.getPath(`modules/${mod}.ts`).isEmpty()) {
        continue;
      }
      index.indented(() => {
        index.writeln(`${mod}: _${mod},`);
      });
    }
    index.writeln("} as const;");
    index.writeln("export default modules;");
  } finally {
    await con.close();
  }

  dir.write("./aaa");
}

main();
