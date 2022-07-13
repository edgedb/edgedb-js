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

export const makePlainIdent = (name: string): string => {
  if (reservedIdents.has(name)) {
    return `$${name}`;
  }
  const replaced = name.replace(
    /[^A-Za-z0-9_]/g,
    match => "0x" + match.codePointAt(0)!.toString(16)
  );
  return replaced !== name ? `$${replaced}` : name;
};

export function quote(val: string): string {
  return JSON.stringify(val.toString());
}

export const scalarToLiteralMapping: {
  [key: string]: {
    type: string;
    literalKind?: "typeof" | "instanceof";
    extraTypes?: string[];
  };
} = {
  "std::int16": {type: "number"},
  "std::int32": {type: "number"},
  "std::int64": {type: "number"},
  "std::float32": {type: "number"},
  "std::float64": {type: "number"},
  "std::number": {
    type: "number",
    literalKind: "typeof",
    extraTypes: ["string"],
  },
  "std::str": {type: "string", literalKind: "typeof"},
  "std::uuid": {type: "string"},
  "std::json": {type: "string", extraTypes: ["any"]},
  "std::bool": {type: "boolean", literalKind: "typeof"},
  "std::bigint": {type: "bigint", literalKind: "typeof"},
  "std::bytes": {type: "Buffer", literalKind: "instanceof"},
  "std::datetime": {type: "Date", literalKind: "instanceof"},
  "std::duration": {type: "edgedb.Duration", literalKind: "instanceof"},
  "cal::local_datetime": {
    type: "edgedb.LocalDateTime",
    literalKind: "instanceof",
  },
  "cal::local_date": {type: "edgedb.LocalDate", literalKind: "instanceof"},
  "cal::local_time": {type: "edgedb.LocalTime", literalKind: "instanceof"},
  "cal::relative_duration": {
    type: "edgedb.RelativeDuration",
    literalKind: "instanceof",
  },
  "cal::date_duration": {
    type: "edgedb.DateDuration",
    literalKind: "instanceof",
  },
  "cfg::memory": {type: "edgedb.ConfigMemory", literalKind: "instanceof"},
};

export const literalToScalarMapping: {
  [key: string]: {type: string; literalKind: "typeof" | "instanceof"};
} = {};
for (const [scalarType, {type, literalKind}] of Object.entries(
  scalarToLiteralMapping
)) {
  if (literalKind) {
    if (literalToScalarMapping[type]) {
      throw new Error(
        `literal type '${type}' cannot be mapped to multiple scalar types`
      );
    }
    literalToScalarMapping[type] = {type: scalarType, literalKind};
  }
}

export function toTSScalarType(
  type: introspect.PrimitiveType,
  types: introspect.Types,
  opts: {
    getEnumRef?: (type: introspect.Type) => string;
    edgedbDatatypePrefix: string;
  } = {
    edgedbDatatypePrefix: "_.",
  }
): CodeFragment[] {
  switch (type.kind) {
    case "scalar": {
      if (type.enum_values && type.enum_values.length) {
        if (opts.getEnumRef) {
          return [opts.getEnumRef(type)];
        }
        return [getRef(type.name, {prefix: ""})];
      }

      if (type.material_id) {
        return toTSScalarType(
          types.get(type.material_id) as introspect.ScalarType,
          types,
          opts
        );
      }

      const literalType = scalarToLiteralMapping[type.name]?.type ?? "unknown";
      return [
        (literalType.startsWith("edgedb.") ? opts.edgedbDatatypePrefix : "") +
          literalType,
      ];
    }

    case "array": {
      const tn = toTSScalarType(
        types.get(type.array_element_id) as introspect.PrimitiveType,
        types,
        opts
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
            opts
          );
          res.push(frag`${name}: ${tn}`);
        }
        return frag`{${joinFrags(res, ", ")}}`;
      } else {
        // an ordinary tuple
        const res = [];
        for (const {target_id} of type.tuple_elements) {
          const tn = toTSScalarType(
            types.get(target_id) as introspect.PrimitiveType,
            types,
            opts
          );
          res.push(tn);
        }
        return frag`[${joinFrags(res, ", ")}]`;
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
      .filter(x => !!x)
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

export const reservedIdents = new Set([
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
  "Object",
]);
