import {ObjectType, Types} from "./queries/getTypes";

import {
  ArrayType,
  NamedTupleType,
  UnnamedTupleType,
  BaseType,
} from "./typesystem";

function applySpec(
  spec: Types,
  type: ObjectType,
  shape: any,
  seen: Set<string>
): void {
  // const type = spec.get(typeName);

  for (const ptr of type.pointers) {
    if (seen.has(ptr.name)) {
      continue;
    }
    seen.add(ptr.name);

    if (ptr.kind === "link") {
      Object.defineProperty(shape, ptr.name, {
        get: () => {
          return {
            __kind__: "link",
            cardinality: ptr.realCardinality,
            get target() {
              return makeType(spec, ptr.target_id);
            },
            get properties() {
              const linkProperties: {[k: string]: any} = {};
              (ptr.pointers || []).forEach((linkProp) => {
                // We only support "link properties" in EdgeDB, currently.
                if (linkProp.kind !== "property") return;
                // No use for them reflected, at the moment.
                if (linkProp.name === "source" || linkProp.name === "target")
                  return;
                const linkPropObject: any = {
                  __kind__: "property",
                };
                linkPropObject.cardinality = linkProp.realCardinality;
                Object.defineProperty(linkPropObject, "target", {
                  get: () => {
                    return makeType(spec, linkProp.target_id);
                  },
                  enumerable: true,
                });
                return linkPropObject;
              });
              return linkProperties;
            },
          };
        },
        enumerable: true,
      });
    } else if (ptr.kind === "property") {
      Object.defineProperty(shape, ptr.name, {
        get: () => {
          return {
            __kind__: "property",
            cardinality: ptr.realCardinality,
            get target() {
              return makeType(spec, ptr.target_id);
            },
          };
        },
        enumerable: true,
      });
    }
  }
}

export function makeType<T extends BaseType>(spec: Types, id: string): T {
  const type = spec.get(id);
  const obj: any = {};
  obj.__name__ = type.name;
  if (type.kind === "object") {
    Object.defineProperty(obj, "__shape__", {
      get: function () {
        const shape: any = {};
        const seen = new Set<string>();
        applySpec(spec, type, shape, seen);
        for (const anc of type.ancestors) {
          const ancType = spec.get(anc.id);
          if (ancType.kind !== "object")
            throw new Error(`Not an object: ${id}`);
          applySpec(spec, ancType, shape, seen);
        }
        return shape as any;
      },
      enumerable: true,
    });
    return obj;
  } else if (type.kind === "scalar") {
    return obj;
  } else if (type.kind === "array") {
    Object.defineProperty(obj, "__element__", {
      get: function () {
        return ArrayType(
          type.name,
          makeType(spec, type.array_element_id)
        ) as any;
      },
      enumerable: true,
    });
    return obj;
  } else if (type.kind === "tuple") {
    if (type.tuple_elements[0].name === "0") {
      Object.defineProperty(obj, "__items__", {
        get: function () {
          return UnnamedTupleType(
            type.name,
            type.tuple_elements.map((el) =>
              makeType(spec, el.target_id)
            ) as any
          ) as any;
        },
        enumerable: true,
      });
      return obj;
    } else {
      Object.defineProperty(obj, "__shape__", {
        get: function () {
          const shape: any = {};
          type.tuple_elements.forEach((el) => {
            shape[el.name] = makeType(spec, el.target_id);
          }) as any;
          return NamedTupleType(type.name, shape as any) as any;
        },
        enumerable: true,
      });
      return obj;
    }
  } else {
    throw new Error("Invalid type.");
  }
}
