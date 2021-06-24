import {ObjectType, Types} from "./queries/getTypes";

import {
  ArrayType,
  // NamedTupleType,
  // UnnamedTupleType,
  BaseType,
  TypeKind,
} from "./typesystem";
import {util} from "./util/util";

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
      util.defineGetter(shape, ptr.name, () => {
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

              console.log(
                `adding link property! ${type.name}.${ptr.name}.${linkProp.name}`
              );
              const linkPropObject: any = {
                __kind__: "property",
              };
              linkPropObject.cardinality = linkProp.realCardinality;
              util.defineGetter(linkPropObject, "target", () => {
                return makeType(spec, linkProp.target_id);
              });
              linkProperties[linkProp.name] = linkPropObject;
            });
            return linkProperties;
          },
        };
      });
    } else if (ptr.kind === "property") {
      util.defineGetter(shape, ptr.name, () => {
        return {
          __kind__: "property",
          cardinality: ptr.realCardinality,
          get target() {
            return makeType(spec, ptr.target_id);
          },
        };
      });
    }
  }
}

export function makeType<T extends BaseType>(spec: Types, id: string): T {
  const type = spec.get(id);
  const obj: any = {};
  obj.__name__ = type.name;

  if (type.kind === "object") {
    obj.__kind__ = TypeKind.object;
    util.defineGetter(obj, "__shape__", () => {
      const shape: any = {};
      const seen = new Set<string>();
      applySpec(spec, type, shape, seen);
      for (const anc of type.ancestors) {
        const ancType = spec.get(anc.id);
        if (ancType.kind !== "object") throw new Error(`Not an object: ${id}`);
        applySpec(spec, ancType, shape, seen);
      }
      return shape as any;
    });
    return obj;
  } else if (type.kind === "scalar") {
    obj.__kind__ = TypeKind.scalar;
    return obj;
  } else if (type.kind === "array") {
    obj.__kind__ = TypeKind.array;
    util.defineGetter(obj, "__element__", () => {
      return makeType(spec, type.array_element_id);
    });
    return obj;
  } else if (type.kind === "tuple") {
    if (type.tuple_elements[0].name === "0") {
      // unnamed
      obj.__kind__ = TypeKind.unnamedtuple;

      util.defineGetter(obj, "__items__", () => {
        return type.tuple_elements.map((el) =>
          makeType(spec, el.target_id)
        ) as any;
      });
      return obj;
    } else {
      obj.__kind__ = TypeKind.namedtuple;

      util.defineGetter(obj, "__shape__", () => {
        const shape: any = {};
        type.tuple_elements.forEach((el) => {
          shape[el.name] = makeType(spec, el.target_id);
        }) as any;
        return shape;
        // return NamedTupleType(type.name, shape as any) as any;
      });
      return obj;
    }
  } else {
    throw new Error("Invalid type.");
  }
}
