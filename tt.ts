import {connect, Connection} from "./dist/src/index.node";
import {model} from "./dist/src/index.node";

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

  getPath(path: string): FileBuilder {
    if (!this._map.has(path)) {
      this._map.set(path, new FileBuilder());
    }
    return this._map.get(path);
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
  id: string;
  name: string;
};

type IntrospectedScalarType = IntrospectedBaseType<"scalar"> & {
  is_abstract: boolean;
  bases: ReadonlyArray<UUID>;
  enum_values: ReadonlyArray<string>;
  material_id: UUID | null;
};

type IntrospectedObjectType = IntrospectedBaseType<"object"> & {
  is_abstract: boolean;
  bases: ReadonlyArray<UUID>;
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
        SELECT x := ScalarType.ancestors
        FILTER x IN material_scalars
        LIMIT 1
      ).id IF Type IS ScalarType ELSE <uuid>{},

      [IS InheritingObject].bases: {
        name,
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

  const graph = new Map<string, ObjectType>();
  const adj = new Map<string, Set<string>>();

  for (const type of types) {
    graph.set(type.name, type);
  }

  for (const type of types) {
    for (const {name: base} of type.bases) {
      if (graph.has(base)) {
        if (!adj.has(type.name)) {
          adj.set(type.name, new Set());
        }
        adj.get(type.name).add(base);
      } else {
        throw new Error(`reference to an unknown object type: ${base}`);
      }
    }
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const sorted: ObjectType[] = [];

  const visit = (type: ObjectType) => {
    if (visiting.has(type.name)) {
      const last = Array.from(visiting).slice(1, 2);
      throw new Error(`dependency cycle between ${type.name} and ${last}`);
    }
    if (!visited.has(type.name)) {
      visiting.add(type.name);
      if (adj.has(type.name)) {
        for (const adjName of adj.get(type.name).values()) {
          visit(graph.get(adjName));
        }
      }
      sorted.push(type);
      visited.add(type.name);
      visiting.delete(type.name);
    }
  };

  for (const type of types) {
    visit(type);
  }

  return sorted;
}

async function main(): Promise<void> {
  const con = await connect({
    database: "dump01_cli",
    user: "yury",
    host: "localhost",
  });

  const dir = new DirBuilder();

  try {
    const scalars = await fetchScalarTypes(con);
    const types = await fetchObjectTypes(con);
    const builder = new CodeBuilder();

    builder.writeln('import {model} from "edgedb";');
    builder.nl();

    builder.writeln("const base = (function() {");
    builder.indented(() => {
      for (const scalas of scalars) {
      }

      for (const type of types) {
        const [mod, name] = type.name.split("::", 2);
        builder.writeln(`const ${mod}__${name} = {`);
        builder.indented(() => {
          for (const {name: base} of type.bases) {
            const [bm, bn] = base.split("::", 2);
            builder.writeln(`...${bm}__${bn},`);
            builder.nl();

            for (const ptr of type.pointers) {
              builder.writeln(`get ${ptr.name}() {`);
              builder.indented(() => {
                builder.writeln(`return {`);

                if (ptr.kind === "link") {
                  builder.indented(() => {
                    builder.writeln(`kind: model.Kind.link,`);
                    builder.writeln(`name: ${JSON.stringify(ptr.name)},`);
                  });
                } else {
                  builder.indented(() => {
                    builder.writeln(`kind: model.Kind.property,`);
                    builder.writeln(`name: ${JSON.stringify(ptr.name)},`);
                  });
                }
              });

              builder.writeln(`},`);
              builder.nl();
            }
          }
        });
        builder.writeln(`} as const;`);
        builder.nl();
      }
    });
    builder.writeln("})();");

    console.log(builder.render());
  } finally {
    await con.close();
  }
}

main();
