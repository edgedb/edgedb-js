import {connect, Connection} from "./dist/src/index.node";

import * as path from "path";
import * as fs from "fs";

const MODEL_TS = "../dist/src/index.node";

class CodeBuilder {
  private buf: string[] = [];
  private indent: number = 0;

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
    return this.buf.join("\n") + "\n";
  }
}

class FileBuilder {
  private _head = new CodeBuilder();
  private _body = new CodeBuilder();

  public flags = new Set<string>();

  get head(): CodeBuilder {
    return this._head;
  }

  get body(): CodeBuilder {
    return this._body;
  }

  render(): string {
    return this._head.render() + "\n" + this._body.render();
  }
}

class DirBuilder {
  private _map = new Map<string, FileBuilder>();

  getPath(fn: string): FileBuilder {
    if (!this._map.has(fn)) {
      this._map.set(fn, new FileBuilder());
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
      const dest = path.join(dir, fn);
      const destDir = path.dirname(dest);

      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, {recursive: true});
      }

      fs.writeFileSync(dest, builder.render());
    }
  }
}

const scalarMap = new Map([
  ["std::bool", "boolean"],
  ["std::str", "string"],
  ["std::int16", "number"],
  ["std::int32", "number"],
  ["std::int64", "number"],
  ["std::float32", "number"],
  ["std::float64", "number"],
  ["std::bigint", "BigInt"],
  ["std::uuid", "edgedb.UUID"],
  ["std::bytes", "Buffer"], // TODO: should be a Uint8Array?
  ["std::datetime", "Date"],
  ["std::duration", "edgedb.Duration"],
  ["cal::local_datetime", "edgedb.LocalDateTime"],
  ["std::local_date", "edgedb.LocalDate"],
  ["std::local_time", "edgedb.LocalTime"],
  ["std::json", "string"],
]);

type UUID = string;

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
  union_of: ReadonlyArray<UUID>;
  intersection_of: ReadonlyArray<UUID>;
  pointers: ReadonlyArray<{
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
  }>;
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

// let a = 1;
// function t(b: number) {
//   function tt(): never {
//     throw new Error("aaa");
//   }

//   const ret = b > 0 ? b : tt();
//   const ret2 = ret + 1;
// }

type IntrospectedType =
  | IntrospectedScalarType
  | IntrospectedObjectType
  | IntrospectedArrayType
  | IntrospectedTupleType;

async function fetchTypes(
  con: Connection
): Promise<Map<UUID, IntrospectedType>> {
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

async function main(): Promise<void> {
  const con = await connect({
    database: "dump01",
    user: "yury",
    host: "localhost",
  });

  const dir = new DirBuilder();

  try {
    const types = await fetchTypes(con);
    const modsWithEnums = new Set<string>();
    const modsIndex = new Set<string>();

    for (const type of types.values()) {
      if (
        type.kind !== "scalar" ||
        !type.enum_values ||
        !type.enum_values.length
      ) {
        continue;
      }

      const mod = getMod(type.name);
      const b = dir.getPath(`modules/${mod}.ts`);

      b.body.writeln(`enum ${getName(type.name)} {`);
      b.body.indented(() => {
        for (const val of type.enum_values) {
          b.body.writeln(`${snToIdent(val)} = ${quote(val)},`);
        }
      });
      b.body.writeln(`}`);
      b.body.nl();

      modsWithEnums.add(mod);
      modsIndex.add(mod);
    }

    const base = dir.getPath("__base__.ts");
    const body = base.body;

    base.head.writeln(`import {model} from "${MODEL_TS}";`);
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

              if (ptr.kind === "link") {
                body.indented(() => {
                  body.writeln(`kind: model.Kind.link,`);
                  body.writeln(`name: ${JSON.stringify(ptr.name)},`);
                });
              } else {
                body.indented(() => {
                  body.writeln(`kind: model.Kind.property,`);
                  body.writeln(`name: ${JSON.stringify(ptr.name)},`);
                });
              }
              body.writeln(`};`);
            });
            body.writeln("},");
          }
        });
        body.writeln(`} as const;`);
        body.nl();

        const mb = dir.getPath(`modules/${mod}.ts`);
        if (!mb.flags.has("base-import")) {
          mb.flags.add("base-import");
          mb.head.writeln('import base from "../__base__";');
        }
        mb.body.writeln(`export const ${snToIdent(getName(type.name))} = {`);
        mb.body.indented(() => {
          mb.body.writeln(`...base.${fnToIdent(type.name)},`);
          // TODO: Add the "shape()" method
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

    const index = dir.getPath("index.ts");
    for (const mod of modsIndex) {
      index.head.writeln(`import * as _${mod} from "./modules/${mod}";`);
    }
    index.body.writeln("const modules = {");
    for (const mod of modsIndex) {
      index.body.indented(() => {
        index.body.writeln(`${mod}: _${mod},`);
      });
    }
    index.body.writeln("} as const;");
    index.body.writeln("export default modules;");
  } finally {
    await con.close();
  }

  dir.write("./aaa");
}

main();
