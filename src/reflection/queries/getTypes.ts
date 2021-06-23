import {Connection} from "../../ifaces";
import {StrictMap} from "../strictMap";
import {Cardinality} from "../typesystem";

export type UUID = string;

export type Pointer = {
  cardinality: "One" | "Many";
  realCardinality: Cardinality;
  kind: "link" | "property";
  required: boolean;
  name: string;
  expr: string | null;

  target_id: UUID;

  pointers: ReadonlyArray<Pointer> | null;
};

export type TypeKind = "object" | "scalar" | "array" | "tuple" | "unknown";

export type BaseType<T extends TypeKind> = {
  kind: T;
  id: UUID;
  name: string;
};

export type ScalarType = BaseType<"scalar"> & {
  is_abstract: boolean;
  bases: ReadonlyArray<{id: UUID}>;
  ancestors: ReadonlyArray<{id: UUID}>;
  enum_values: ReadonlyArray<string>;
  material_id: UUID | null;
};

export type ObjectType = BaseType<"object"> & {
  is_abstract: boolean;
  bases: ReadonlyArray<{id: UUID}>;
  ancestors: ReadonlyArray<{id: UUID}>;
  union_of: ReadonlyArray<{id: UUID}>;
  intersection_of: ReadonlyArray<{id: UUID}>;
  pointers: ReadonlyArray<Pointer>;
};

export type ArrayType = BaseType<"array"> & {
  array_element_id: UUID;
  is_abstract: boolean;
};

export type TupleType = BaseType<"tuple"> & {
  tuple_elements: ReadonlyArray<{
    name: string;
    target_id: UUID;
  }>;
  is_abstract: boolean;
};

export type PrimitiveType = ScalarType | ArrayType | TupleType;

export type Type = PrimitiveType | ObjectType;

export type Types = StrictMap<UUID, Type>;

export async function getTypes(
  cxn: Connection,
  params?: {debug?: boolean}
): Promise<Types> {
  const QUERY = `
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

      # for sequence (abstract type that has non-abstract ancestor)
      single material_id := (
        SELECT x := Type[IS ScalarType].ancestors
        FILTER x IN material_scalars
        LIMIT 1
      ).id,

      [IS InheritingObject].bases: {
        id
      } ORDER BY @index ASC,

      [IS InheritingObject].ancestors: {
        id
      } ORDER BY @index ASC,

      [IS ObjectType].union_of,
      [IS ObjectType].intersection_of,
      [IS ObjectType].pointers: {
        cardinality,
        required,
        realCardinality := "One" IF .required ELSE "AtMostOne" IF <str>.cardinality = "One" ELSE "AtLeastOne" IF .required ELSE "Many",
        name,
        expr,

        target_id := .target.id,

        kind := 'link' IF .__type__.name = 'schema::Link' ELSE 'property',

        [IS Link].pointers: {
          cardinality,
          required,
          name,
          expr,
          target_id := .target.id,
          kind := 'link' IF .__type__.name = 'schema::Link' ELSE 'property',
        } FILTER @is_owned,
      } FILTER @is_owned,

      array_element_id := [IS Array].element_type.id,

      tuple_elements := (SELECT [IS Tuple].element_types {
        target_id := .type.id,
        name
      } ORDER BY @index ASC),
    }
    ORDER BY .name;
  `;

  const types: Type[] = JSON.parse(await cxn.queryJSON(QUERY));
  if (params?.debug) console.log(JSON.stringify(types, null, 2));

  // Now sort `types` topologically:
  return topoSort(types);
}

export function topoSort(types: Type[]) {
  const graph = new StrictMap<UUID, Type>();
  const adj = new StrictMap<UUID, Set<UUID>>();

  for (const type of types) {
    graph.set(type.id, type);
  }

  for (const type of types) {
    if (type.kind !== "object" && type.kind !== "scalar") {
      continue;
    }

    for (const {id: base} of type.bases) {
      if (!graph.has(base))
        throw new Error(`reference to an unknown object type: ${base}`);

      if (!adj.has(type.id)) {
        adj.set(type.id, new Set());
      }

      adj.get(type.id).add(base);
    }
  }

  const visiting = new Set<string>();
  const visited = new Set<UUID>();
  const sorted = new StrictMap<UUID, Type>();

  const visit = (type: Type) => {
    if (visiting.has(type.name)) {
      const last = Array.from(visiting).slice(1, 2);
      throw new Error(`dependency cycle between ${type.name} and ${last}`);
    }
    if (!visited.has(type.id)) {
      visiting.add(type.name);
      if (adj.has(type.id)) {
        for (const adjId of adj.get(type.id).values()) {
          visit(graph.get(adjId));
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
