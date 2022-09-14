import {Executor} from "../../ifaces.ts";
import {Cardinality} from "../enums.ts";
import type {Version} from "../generate.ts";
import {StrictMap} from "../strictMap.ts";

export type UUID = string;

export type Pointer = {
  real_cardinality: Cardinality;
  kind: "link" | "property";
  name: string;
  target_id: UUID;
  is_exclusive: boolean;
  is_computed: boolean;
  is_readonly: boolean;
  has_default: boolean;
  pointers: ReadonlyArray<Pointer> | null;
};

export type Backlink = Pointer & {
  real_cardinality: Cardinality;
  kind: "link";
  name: string;
  target_id: UUID;
  is_exclusive: boolean;
  pointers: null;
  stub: string;
};

export type TypeKind =
  | "object"
  | "scalar"
  | "array"
  | "tuple"
  | "range"
  | "unknown";

export type TypeProperties<T extends TypeKind> = {
  kind: T;
  id: UUID;
  name: string;
};

export type ScalarType = TypeProperties<"scalar"> & {
  is_abstract: boolean;
  is_seq: boolean;
  bases: ReadonlyArray<{id: UUID}>;
  // ancestors: ReadonlyArray<{id: UUID}>;
  enum_values: ReadonlyArray<string> | null;
  material_id: UUID | null;
  castType?: UUID;
};

export type ObjectType = TypeProperties<"object"> & {
  is_abstract: boolean;
  bases: ReadonlyArray<{id: UUID}>;
  // ancestors: ReadonlyArray<{id: UUID}>;
  union_of: ReadonlyArray<{id: UUID}>;
  intersection_of: ReadonlyArray<{id: UUID}>;
  pointers: ReadonlyArray<Pointer>;
  backlinks: ReadonlyArray<Backlink>;
  backlink_stubs: ReadonlyArray<Backlink>;
};

export type ArrayType = TypeProperties<"array"> & {
  array_element_id: UUID;
  is_abstract: boolean;
};

export type TupleType = TypeProperties<"tuple"> & {
  tuple_elements: ReadonlyArray<{
    name: string;
    target_id: UUID;
  }>;
  is_abstract: boolean;
};

export type RangeType = TypeProperties<"range"> & {
  range_element_id: UUID;
  is_abstract: boolean;
};

export type PrimitiveType = ScalarType | ArrayType | TupleType | RangeType;

export type Type = PrimitiveType | ObjectType;

export type Types = StrictMap<UUID, Type>;

// export const nonCastableTypes = new Set<string>([
// numberType.id
// ]);

const numberType: ScalarType = {
  id: "00000000-0000-0000-0000-0000000001ff",
  name: "std::number",
  is_abstract: false,
  is_seq: false,
  kind: "scalar",
  enum_values: null,
  material_id: null,
  bases: [],
};

export const typeMapping = new Map([
  [
    "00000000-0000-0000-0000-000000000103", // int16
    numberType,
  ],
  [
    "00000000-0000-0000-0000-000000000104", // int32
    numberType,
  ],
  [
    "00000000-0000-0000-0000-000000000105", // int64
    numberType,
  ],
  [
    "00000000-0000-0000-0000-000000000106", // float32
    numberType,
  ],
  [
    "00000000-0000-0000-0000-000000000107", // float64
    numberType,
  ],
]);

export async function getTypes(
  cxn: Executor,
  params: {debug?: boolean; version: Version}
): Promise<Types> {
  const v2Plus = params.version.major >= 2;
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
      is_abstract := .abstract,

      kind := 'object' IF Type IS ObjectType ELSE
              'scalar' IF Type IS ScalarType ELSE
              'array' IF Type IS Array ELSE
              'tuple' IF Type IS Tuple ELSE
              ${v2Plus ? `'range' IF Type IS Range ELSE` : ``}
              'unknown',

      [IS ScalarType].enum_values,
      is_seq := 'std::sequence' in [IS ScalarType].ancestors.name,
      # for sequence (abstract type that has non-abstract ancestor)
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
        real_cardinality := ("One" IF .required ELSE "AtMostOne") IF <str>.cardinality = "One" ELSE ("AtLeastOne" IF .required ELSE "Many"),
        name,
        target_id := .target.id,
        kind := 'link' IF .__type__.name = 'schema::Link' ELSE 'property',
        is_exclusive := exists (select .constraints filter .name = 'std::exclusive'),
        is_computed := len(.computed_fields) != 0,
        is_readonly := .readonly,
        has_default := EXISTS .default or ("std::sequence" in .target[IS ScalarType].ancestors.name),
        [IS Link].pointers: {
          real_cardinality := ("One" IF .required ELSE "AtMostOne") IF <str>.cardinality = "One" ELSE ("AtLeastOne" IF .required ELSE "Many"),
          name := '@' ++ .name,
          target_id := .target.id,
          kind := 'link' IF .__type__.name = 'schema::Link' ELSE 'property',
          is_computed := len(.computed_fields) != 0,
          is_readonly := .readonly
        } filter .name != '@source' and .name != '@target',
      } FILTER @is_owned,
      backlinks := (SELECT DETACHED Link FILTER .target = Type) {
        real_cardinality := "AtMostOne"
          IF
          EXISTS (select .constraints filter .name = 'std::exclusive')
          ELSE
          "Many",
        name := '<' ++ .name ++ '[is ' ++ std::assert_exists(
          .source.name if .source.name[:9] != 'default::' else .source.name[9:]
        ) ++ ']',
        stub := .name,
        target_id := .source.id,
        kind := 'link',
        is_exclusive := (EXISTS (select .constraints filter .name = 'std::exclusive')) AND <str>.cardinality = "One",
      },
      backlink_stubs := array_agg((
        WITH
          stubs := DISTINCT (SELECT DETACHED Link FILTER .target = Type).name,
          baseObjectId := (SELECT DETACHED ObjectType FILTER .name = 'std::BaseObject' LIMIT 1).id
        FOR stub in { stubs }
        UNION (
          SELECT {
            real_cardinality := "Many",
            name := '<' ++ stub,
            target_id := baseObjectId,
            kind := 'link',
            is_exclusive := false,
          }
        )
      )),
      array_element_id := [IS Array].element_type.id,

      tuple_elements := (SELECT [IS Tuple].element_types {
        target_id := .type.id,
        name
      } ORDER BY @index ASC),
      ${v2Plus ? `range_element_id := [IS Range].element_type.id,` : ``}
    }
    ORDER BY .name;
  `;

  const types: Type[] = JSON.parse(await cxn.queryJSON(QUERY));
  // tslint:disable-next-line
  if (params?.debug) console.log(JSON.stringify(types, null, 2));

  // remap types
  for (const type of types) {
    switch (type.kind) {
      case "scalar":
        if (typeMapping.has(type.id)) {
          type.castType = typeMapping.get(type.id)!.id;
        }
        if (type.is_seq) {
          type.castType = numberType.id;
        }
        // if (type.material_id) {
        //   type.material_id =
        //     typeMapping.get(type.material_id)?.id ?? type.material_id;
        // }
        // type.bases = type.bases.map(base => ({
        //   id: typeMapping.get(base.id)?.id ?? base.id,
        // }));
        break;
      case "range":
        type.range_element_id =
          typeMapping.get(type.range_element_id)?.id ?? type.range_element_id;
        break;
      case "array":
        // type.array_element_id =
        //   typeMapping.get(type.array_element_id)?.id ??
        //     type.array_element_id;
        break;
      case "tuple":
        // type.tuple_elements = type.tuple_elements.map(element => ({
        //   ...element,
        //   target_id:
        //     typeMapping.get(element.target_id)?.id ?? element.target_id,
        // }));
        break;
      case "object":
        // type.pointers = type.pointers.map(pointer => ({
        //   ...pointer,
        //   target_id:
        //     typeMapping.get(pointer.target_id)?.id ?? pointer.target_id,
        // }));
        break;
    }
  }
  types.push(numberType);

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
      if (!graph.has(base)) {
        throw new Error(`reference to an unknown object type: ${base}`);
      }

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
