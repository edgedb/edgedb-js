import {CodeBuilder, CodeFragment, IdentRef} from "../builders";
import * as introspect from "../queries/getTypes";
import {util} from "./util";

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

export function quote(val: string): string {
  return JSON.stringify(val.toString());
}

// export function toCardinality(p: introspect.Pointer): string {
//   if (p.cardinality === "One") {
//     if (p.required) {
//       return "One";
//     } else {
//       return "AtMostOne";
//     }
//   } else {
//     if (p.required) {
//       return "AtLeastOne";
//     } else {
//       return "Many";
//     }
//   }
// }

export function toPrimitiveJsType(
  s: introspect.ScalarType,
  code: CodeBuilder
): string {
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
      return "_.edgedb.Duration";
    case "cal::local_datetime":
      return "_.edgedb.LocalDateTime";
    case "cal::local_date":
      return "_.edgedb.LocalDate";
    case "cal::local_time":
      return "_.edgedb.LocalTime";

    case "std::decimal":
    case "std::bytes":
    // TODO

    default:
      return "unknown";
  }
}

export function toTSScalarType(
  type: introspect.PrimitiveType,
  types: introspect.Types,
  currentModule: string,
  code: CodeBuilder,
  level: number = 0
): CodeFragment[] {
  switch (type.kind) {
    case "scalar": {
      if (type.enum_values && type.enum_values.length) {
        return [getRef(type.name, {prefix: ""})];
      }

      if (type.material_id) {
        return toTSScalarType(
          types.get(type.material_id) as introspect.ScalarType,
          types,
          currentModule,
          code,
          level + 1
        );
      }

      return [toPrimitiveJsType(type, code)];
    }

    case "array": {
      const tn = toTSScalarType(
        types.get(type.array_element_id) as introspect.PrimitiveType,
        types,
        currentModule,
        code,
        level + 1
      );
      return frag`${tn}[]`;
    }

    case "tuple": {
      if (!type.tuple_elements.length) {
        return ["[]"];
      }

      if (
        type.tuple_elements[0].name &&
        Number.isNaN(parseInt(type.tuple_elements[0].name, 10))
      ) {
        // a named tuple
        const res = [];
        for (const {name, target_id} of type.tuple_elements) {
          const tn = toTSScalarType(
            types.get(target_id) as introspect.PrimitiveType,
            types,
            currentModule,
            code,
            level + 1
          );
          res.push(frag`${name}: ${tn}`);
        }
        return frag`{${joinFrags(res, ",")}}`;
      } else {
        // an ordinary tuple
        const res = [];
        for (const {target_id} of type.tuple_elements) {
          const tn = toTSScalarType(
            types.get(target_id) as introspect.PrimitiveType,
            types,
            currentModule,
            code,
            level + 1
          );
          res.push(tn);
        }
        return frag`[${joinFrags(res, ",")}]`;
      }
    }

    default:
      util.assertNever(type);
  }
}

export function toTSObjectType(
  type: introspect.ObjectType,
  types: introspect.Types,
  currentMod: string,
  code: CodeBuilder,
  level: number = 0
): CodeFragment[] {
  if (type.intersection_of && type.intersection_of.length) {
    const res: CodeFragment[][] = [];
    for (const {id: subId} of type.intersection_of) {
      const sub = types.get(subId) as introspect.ObjectType;
      res.push(toTSObjectType(sub, types, currentMod, code, level + 1));
    }
    const ret = joinFrags(res, " & ");
    return level > 0 ? frag`(${ret})` : ret;
  }

  if (type.union_of && type.union_of.length) {
    const res: CodeFragment[][] = [];
    for (const {id: subId} of type.union_of) {
      const sub = types.get(subId) as introspect.ObjectType;
      res.push(toTSObjectType(sub, types, currentMod, code, level + 1));
    }
    const ret = joinFrags(res, " | ");
    return level > 0 ? frag`(${ret})` : ret;
  }

  return [getRef(type.name, {prefix: ""})];
}

export function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// convert FQN into capital camel case
export function displayName(str: string) {
  const {name} = splitName(str);
  const stripped =
    "$" +
    name
      .replace(/[^$0-9a-zA-Z]/g, " ")
      .split(" ")
      .filter((x) => !!x)
      .map(capitalize)
      .join("");
  // if (stripped === "Object") return `ObjectType`;
  return stripped;
}

export function getInternalName({fqn, id}: {fqn: string; id: string}) {
  const {name} = splitName(fqn);
  return makeValidIdent({id, name});
}

export function makeValidIdent({
  id,
  name,
  skipKeywordCheck,
}: {
  id: string;
  name: string;
  skipKeywordCheck?: boolean;
}) {
  let strippedName = name.replace(/^_|[^A-Za-z0-9_]/g, "");

  if (
    strippedName !== name ||
    (!skipKeywordCheck && reservedIdents.has(strippedName))
  ) {
    strippedName += `_${id.toLowerCase().replace(/[^0-9a-f]/g, "")}`;
  }

  return strippedName;
}

export function getRef(name: string, opts?: {prefix?: string}): IdentRef {
  return {
    type: "identRef",
    name,
    opts: {
      prefix: opts?.prefix ?? "$",
    },
  };
}

export function frag(
  strings: TemplateStringsArray,
  ...exprs: (CodeFragment | CodeFragment[])[]
) {
  const frags: CodeFragment[] = [];
  for (let i = 0; i < strings.length; i++) {
    frags.push(strings[i]);
    if (exprs[i]) {
      if (Array.isArray(exprs[i])) {
        frags.push(...(exprs[i] as CodeFragment[]));
      } else {
        frags.push(exprs[i] as CodeFragment);
      }
    }
  }
  return frags;
}

export function joinFrags(
  frags: (CodeFragment | CodeFragment[])[],
  sep: string
) {
  const joined: CodeFragment[] = [];
  for (const fragment of frags) {
    joined.push(...(Array.isArray(fragment) ? fragment : [fragment]), sep);
  }
  return joined.slice(0, -1);
}

const reservedIdents = new Set([
  "do",
  "if",
  "in",
  "for",
  "let",
  "new",
  "try",
  "var",
  "case",
  "else",
  "enum",
  "eval",
  "null",
  "this",
  "true",
  "void",
  "with",
  "await",
  "break",
  "catch",
  "class",
  "const",
  "false",
  "super",
  "throw",
  "while",
  "yield",
  "delete",
  "export",
  "import",
  "public",
  "return",
  "static",
  "switch",
  "typeof",
  "default",
  "extends",
  "finally",
  "package",
  "private",
  "continue",
  "debugger",
  "function",
  "arguments",
  "interface",
  "protected",
  "implements",
  "instanceof",
]);
