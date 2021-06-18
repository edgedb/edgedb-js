import {CodeBuilder} from "./builders";
import * as introspect from "./introspect";

export function splitName(name: string) {
  if (!name.includes("::")) throw new Error(`Invalid FQN ${name}`);
  return {
    mod: name.split("::")[0],
    name: name.split("::")[1],
  };
}

export function toIdent(name: string): string {
  if (name.includes("::")) {
    throw new Error(`toIdent: invalid name ${name}`);
  }
  return name.replace(/([^a-zA-Z0-9_]+)/g, "_");
}

export function assertNever(arg: never): never {
  throw new Error(`${arg} is supposed to be of "never" type`);
}

export function quote(val: string): string {
  return JSON.stringify(val.toString());
}

export function toCardinality(p: introspect.Pointer): string {
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

export function toPrimitiveJsType(
  s: introspect.ScalarType,
  code: CodeBuilder
): string {
  function addEdgedbImport(): void {
    code.addImport(`import * as edgedb from "edgedb";`);
  }

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
      addEdgedbImport();
      return "edgedb.Duration";
    case "cal::local_datetime":
      addEdgedbImport();
      return "edgedb.LocalDateTime";
    case "cal::local_date":
      addEdgedbImport();
      return "edgedb.LocalDate";
    case "cal::local_time":
      addEdgedbImport();
      return "edgedb.LocalTime";

    case "std::decimal":
    case "std::bytes":
    // TODO

    default:
      return "unknown";
  }
}

export function toJsScalarType(
  type: introspect.PrimitiveType,
  types: introspect.Types,
  currentModule: string,
  code: CodeBuilder,
  level: number = 0
): string {
  switch (type.kind) {
    case "scalar": {
      if (type.enum_values && type.enum_values.length) {
        const {mod, name} = splitName(type.name);
        code.addImport(
          `import type * as ${mod}Types from "../modules/${mod}";`
        );
        return `${mod}Types.${name}`;
      }

      if (type.material_id) {
        return toJsScalarType(
          types.get(type.material_id) as introspect.ScalarType,
          types,
          currentModule,
          code,
          level + 1
        );
      }

      return toPrimitiveJsType(type, code);
    }

    case "array": {
      const tn = toJsScalarType(
        types.get(type.array_element_id) as introspect.PrimitiveType,
        types,
        currentModule,
        code,
        level + 1
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
            types.get(target_id) as introspect.PrimitiveType,
            types,
            currentModule,
            code,
            level + 1
          );
          res.push(`${name}: ${tn}`);
        }
        return `{${res.join(",")}}`;
      } else {
        // an ordinary tuple
        const res = [];
        for (const {target_id} of type.tuple_elements) {
          const tn = toJsScalarType(
            types.get(target_id) as introspect.PrimitiveType,
            types,
            currentModule,
            code,
            level + 1
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

export function toJsObjectType(
  type: introspect.ObjectType,
  types: introspect.Types,
  currentMod: string,
  code: CodeBuilder,
  level: number = 0
): string {
  if (type.intersection_of && type.intersection_of.length) {
    const res: string[] = [];
    for (const {id: subId} of type.intersection_of) {
      const sub = types.get(subId) as introspect.ObjectType;
      res.push(toJsObjectType(sub, types, currentMod, code, level + 1));
    }
    const ret = res.join(" & ");
    return level > 0 ? `(${ret})` : ret;
  }

  if (type.union_of && type.union_of.length) {
    const res: string[] = [];
    for (const {id: subId} of type.union_of) {
      const sub = types.get(subId) as introspect.ObjectType;
      res.push(toJsObjectType(sub, types, currentMod, code, level + 1));
    }
    const ret = res.join(" | ");
    return level > 0 ? `(${ret})` : ret;
  }

  const {mod, name} = splitName(type.name);

  if (mod !== currentMod) {
    code.addImport(`import type * as ${mod}Types from "./${mod}";`);
    return `${mod}Types.${name}`;
  } else {
    return name;
  }
}

export function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function displayName(str: string) {
  const {name} = splitName(str);
  const stripped = name
    .replace(/[^$0-9a-zA-Z]/g, " ")
    .split(" ")
    .filter((x) => !!x)
    .map(capitalize)
    .join("");
  return stripped;
}

export const getScopedDisplayName = (
  activeModule: string,
  sc: CodeBuilder
) => (fqn: string) => {
  const {mod: castMod, name: castName} = splitName(fqn);

  if (activeModule !== castMod) {
    sc.addImport(`import type * as ${castMod}Types from "./${castMod}";`);
    return `${castMod}Types.${displayName(fqn)}`;
  } else {
    return displayName(fqn);
  }
};
