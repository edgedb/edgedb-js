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
    let head = Array.from(this.imports).join("\n");
    const body = this.buf.join("\n");

    if (head && body) {
      head += "\n\n";
    }

    let result = head + body;
    if (result && result.slice(-1) != "\n") {
      result += "\n";
    }

    return result;
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
  cardinality: "One" | "Many";
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

type IntrospectedPrimitiveType =
  | IntrospectedScalarType
  | IntrospectedArrayType
  | IntrospectedTupleType;

type IntrospectedType = IntrospectedPrimitiveType | IntrospectedObjectType;

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
  if (p.cardinality === "One") {
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

    case "std::datetime":
      return "Date";
    case "std::duration":
      return "edgedb.Duration";
    case "cal::local_datetime":
      return "edgedb.LocalDateTime";
    case "cal::local_date":
      return "edgedb.LocalDate";
    case "cal::local_time":
      return "edgedb.LocalTime";

    case "std::decimal":
    case "std::bytes":
    // TODO

    default:
      return "unknown";
  }
}

function assertNever(arg: never): never {
  throw new Error(`${arg} is supposed to be of "never" type`);
}

function toJsScalarType(
  type: IntrospectedPrimitiveType,
  types: IntrospectedTypes,
  currentModule: string
): string {
  switch (type.kind) {
    case "scalar": {
      if (type.enum_values && type.enum_values.length) {
        const mod = getMod(type.name);
        const name = getName(type.name);
        if (mod !== currentModule) {
          return `${mod}Types.${name}`;
        } else {
          return name;
        }
      }

      if (type.material_id) {
        return toJsScalarType(
          types.get(type.material_id)! as IntrospectedScalarType,
          types,
          currentModule
        );
      }

      return toPrimitiveJsType(type);
    }

    case "array": {
      const tn = toJsScalarType(
        types.get(type.array_element_id)! as IntrospectedPrimitiveType,
        types,
        currentModule
      );
      return `${tn}[]`;
    }

    case "tuple": {
      if (!type.tuple_elements.length) {
        return "[]";
      }

      if (
        type.tuple_elements[0].name &&
        Number.isNaN(parseInt(type.tuple_elements[0].name, 10))
      ) {
        // a named tuple
        const res = [];
        for (const {name, target_id} of type.tuple_elements) {
          const tn = toJsScalarType(
            types.get(target_id)! as IntrospectedPrimitiveType,
            types,
            currentModule
          );
          res.push(`${name}: ${tn}`);
        }
        return `{${res.join(",")}}`;
      } else {
        // an ordinary tuple
        const res = [];
        for (const {target_id} of type.tuple_elements) {
          const tn = toJsScalarType(
            types.get(target_id)! as IntrospectedPrimitiveType,
            types,
            currentModule
          );
          res.push(tn);
        }
        return `[${res.join(",")}]`;
      }
    }

    default:
      assertNever(type);
  }
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
    const enumsIndex = new Map<string, Set<string>>();
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

      if (!enumsIndex.has(mod)) {
        enumsIndex.set(mod, new Set());
      }
      enumsIndex.get(mod)!.add(type.id);
    }

    for (const [mod, enums] of enumsIndex.entries()) {
      const body = dir.getPath(`__types__/${mod}.ts`);
      const out = [];
      for (const typeId of enums) {
        const type = types.get(typeId)! as IntrospectedScalarType;
        out.push(getName(type.name));
      }
      body.addImport(
        `import type {\n  ${out.join(",\n  ")}\n} from "../modules/${mod}";`
      );
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
      const body = dir.getPath(`__types__/${mod}.ts`);

      body.addImport(`import {reflection as $} from "edgedb";`);
      body.addImport(`import * as edgedb from "edgedb";`);

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
          const card = `$.Cardinality.${toCardinality(ptr)}`;

          if (ptr.kind === "link") {
            const trgType = types.get(
              ptr.target_id
            )! as IntrospectedObjectType;

            const tsType = toJsObjectType(trgType, types, mod, body);

            body.writeln(`${ptr.name}: $.LinkDesc<${tsType}, ${card}>;`);
          } else {
            const tsType = toJsScalarType(
              types.get(ptr.target_id)! as IntrospectedPrimitiveType,
              types,
              mod
            );

            body.writeln(`${ptr.name}: $.PropertyDesc<${tsType}, ${card}>;`);
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
      body.addImport(`import {reflection as $} from "edgedb";`);
      body.addImport(`import * as __types__ from "../__types__/${mod}";`);

      body.writeln(`export const ${snToIdent(getName(type.name))} = {`);
      body.indented(() => {
        body.writeln(
          `shape: <Spec extends $.MakeSelectArgs<__types__.${getName(
            type.name
          )}>>(`
        );
        body.indented(() => {
          body.writeln(`spec: Spec`);
        });
        body.writeln(
          `): $.Query<$.Result<Spec, __types__.${getName(
            type.name
          )}>> => {throw new Error("not impl");}`
        );
      });
      body.writeln(`} as const;`);
      body.nl();
    }

    const index = dir.getPath("index.ts");
    for (const mod of modsIndex) {
      if (dir.getPath(`modules/${mod}.ts`).isEmpty()) {
        continue;
      }
      index.addImport(`export * as ${mod} from "./modules/${mod}";`);
    }
  } finally {
    await con.close();
  }

  dir.write("./aaa");
}

main();
