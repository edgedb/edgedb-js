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

type ScalarType = {
  name: string;
  material: string;
  enum_values: string[] | null;
};

type ObjectType = {
  name: string;
  is_abstract: boolean;
  bases: Array<{name: string}>;
  pointers: Array<{
    cardinality: string;
    required: boolean;
    name: string;
    kind: "link" | "property";
    expr: string | null;
    object_target: {
      name: string;
      is_compound_type: boolean;
      union_of: Array<{name: string}>;
      intersection_of: Array<{name: string}>;
    } | null;
    scalar_target: {
      name: string;
    } | null;
    array_target: {
      element_type: {
        name: string;
      };
    } | null;
    tuple_target: {
      element_types: {
        name: string;
        type: {
          name: string;
        };
      };
    } | null;
    properties: {
      name: string;
      target: {
        name: string;
      };
    } | null;
  }>;
};

async function fetchScalarTypes(
  con: Connection
): Promise<ReadonlyArray<ScalarType>> {
  return (await con.query(`
    WITH
      MODULE schema,

      material_scalars := (
        SELECT ScalarType {
          name
        }
        FILTER
          (.name LIKE 'std::%' OR .name LIKE 'cal::%')
          AND NOT .is_abstract
      ).name

    SELECT ScalarType {
      name,
      enum_values,
      single material := (
        SELECT x := ScalarType.ancestors.name
        FILTER x IN material_scalars
        LIMIT 1
      )
    }
    FILTER NOT .is_abstract
    ORDER BY .name;
  `)) as ScalarType[];
}

async function fetchObjectTypes(
  con: Connection
): Promise<ReadonlyArray<ObjectType>> {
  const types: ObjectType[] = await con.query(`
    WITH
      MODULE schema

    SELECT ObjectType {
      name,
      is_abstract,
      bases: {
        name,
      } ORDER BY @index ASC,
      pointers: {
        cardinality,
        required,
        name,
        expr,
        object_target := .target[IS ObjectType] {
          name,
          is_compound_type,
          union_of: {
            name,
          },
          intersection_of: {
            name,
          }
        },
        scalar_target := .target[IS ScalarType] {
          name,
        },
        array_target := .target[IS Array] {
          element_type: {
            name,  # todo: this needs to be recursive
          }
        },
        tuple_target := .target[IS Tuple] {
          element_types: {
            name,
            type: {
              name,  # todo: this needs to be recursive
            }
          }
        },
        [IS Link].properties: {
          name,
          target: {
            name,
          }
        } FILTER @is_owned,
        kind := 'link' IF ObjectType.pointers IS Link ELSE 'property',
      } FILTER @is_owned,
    }
    FILTER NOT .is_compound_type
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
