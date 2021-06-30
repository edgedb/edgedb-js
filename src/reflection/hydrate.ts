import * as introspect from "./queries/getTypes";

import {
  BaseType,
  TypeKind,
  ObjectType,
  ObjectTypeShape,
  shapeToTsType,
} from "./typesystem";
import {typeutil} from "./util/typeutil";
import {util} from "./util/util";

function applySpec(
  spec: introspect.Types,
  type: introspect.ObjectType,
  shape: any,
  seen: Set<string>
): void {
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
              if (linkProp.kind !== "property") {
                return;
              }
              // No use for them reflected, at the moment.
              if (linkProp.name === "source" || linkProp.name === "target") {
                return;
              }

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

export function makeType<T extends BaseType>(
  spec: introspect.Types,
  id: string
): T {
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
        if (ancType.kind !== "object") {
          throw new Error(`Not an object: ${id}`);
        }
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
      // unnamed tuple
      obj.__kind__ = TypeKind.unnamedtuple;

      util.defineGetter(obj, "__items__", () => {
        return type.tuple_elements.map((el) =>
          makeType(spec, el.target_id)
        ) as any;
      });
      return obj;
    } else {
      // named tuple
      obj.__kind__ = TypeKind.namedtuple;

      util.defineGetter(obj, "__shape__", () => {
        const shape: any = {};
        for (const el of type.tuple_elements) {
          shape[el.name] = makeType(spec, el.target_id);
        }
        return shape;
      });
      return obj;
    }
  } else {
    throw new Error("Invalid type.");
  }
}
export type mergeObjectShapes<
  A extends ObjectTypeShape,
  B extends ObjectTypeShape
> = typeutil.flatten<
  {
    [k in keyof A & keyof B]: A[k] extends B[k] // possible performance issue?
      ? B[k] extends A[k]
        ? A[k]
        : never
      : never;
  }
>;

export type mergeObjectTypes<
  A extends ObjectType,
  B extends ObjectType
> = ObjectType<
  `${A["__name__"]} & ${B["__name__"]}`,
  mergeObjectShapes<A["__shape__"], B["__shape__"]>
>;

export function mergeObjectTypes<A extends ObjectType, B extends ObjectType>(
  a: A,
  b: B
): mergeObjectTypes<A, B> {
  const obj: any = {
    __kind__: TypeKind.object,
    __name__: `${a.__name__} & ${b.__name__}`,
    get __shape__() {
      const merged: any = {};
      for (const [akey, aitem] of Object.entries(a.__shape__)) {
        if (!b.__shape__[akey]) continue;

        const bitem = b.__shape__[akey];
        if (aitem.cardinality !== bitem.cardinality) continue;
        // names must reflect full type
        if (aitem.target.__name__ !== bitem.target.__name__) continue;
        merged[akey] = aitem;
      }
      return merged;
    },
  };
  return obj;
}
