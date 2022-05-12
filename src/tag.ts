// elements types: fragment, identifier, parameter
type Fragment = {__kind__: "fragment"; __value__: string};
type Parameter = {__kind__: "parameter"; __type__: string; __data__: any};
type Ident = {__kind__: "ident"; __value__: string};
type Element = Fragment | Parameter | Ident;

type TaggedQuery = {
  __kind__: "query";
  elements: Element[];
  query: {query: string; parameters: {[k: string]: any}};
};

export function ident(...idents: string[]): Ident {
  // TODO: validate idents
  return {
    __kind__: "ident",
    __value__: idents.join(", "),
  };
}

function getEdgeDBType(data: any): string {
  const jstype = typeof data;
  if (jstype === "symbol" || jstype === "function" || jstype === "undefined") {
    throw new Error("Invalid interpolation");
  }
  if (Array.isArray(data)) {
    const elemTypes: Set<string> = new Set(data.map(getEdgeDBType));
    if (elemTypes.size !== 1) {
      throw new Error("Arrays cannot contain heterogeneous types");
    }
    return `array<${[...elemTypes][0]}>`;
  }
  if (jstype === "object") {
    return "json";
  }

  return {
    string: "str",
    number: "float64",
    bigint: "bigint",
    boolean: "bool",
  }[jstype];
}

export function edgeql(
  strings: TemplateStringsArray,
  ...interpolations: any[]
): TaggedQuery {
  if (strings.length !== interpolations.length + 1) {
    throw new Error("Invalid tag input.");
  }

  const elements: Element[] = [];
  for (let i = 0; i < strings.length; i++) {
    elements.push({__kind__: "fragment", __value__: strings[i]});

    const interpolation = interpolations[i];
    if (!interpolation) continue;

    // allowable interpolations: identifer, subquery, literal
    if (interpolation.__kind__ === "ident") {
      elements.push(interpolation as Ident);
    } else if (interpolation.__kind__ === "query") {
      elements.push(...(interpolation.elements as Element[]));
    } else if (!interpolation.__kind__) {
      const edbType = getEdgeDBType(interpolation);
      elements.push({
        __kind__: "parameter",
        __type__: edbType,
        __data__:
          edbType === "json" ? JSON.stringify(interpolation) : interpolation,
      });
    } else {
      throw new Error("Invalid interpolation");
    }
  }

  return {
    __kind__: "query",
    elements,
    get query() {
      const queryArray: string[] = [];
      const parameters: {[k: string]: any} = {};

      for (const element of elements) {
        if (element.__kind__ === "fragment") {
          queryArray.push(element.__value__);
        } else if (element.__kind__ === "ident") {
          // TODO validate ident
          queryArray.push(element.__value__);
        } else if (element.__kind__ === "parameter") {
          const varName = `param_${Object.keys(parameters).length}`;
          queryArray.push(`<${element.__type__}>$${varName}`);
          parameters[varName] = element.__data__;
        } else {
          throw new Error("Invalid tag element type");
        }
      }
      return {query: queryArray.join(""), parameters};
    },
  };
}
