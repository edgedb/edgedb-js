//import {Link} from "../m3";
import {ObjectType, Types} from "./queries/getTypes";
import {
  AnyMaterialtype,
  ArrayType,
  NamedTupleType,
  UnnamedTupleType,
} from "./typesystem";

function applySpec(
  spec: Types,
  type: ObjectType,
  obj: any,
  seen: Set<string>
): void {
  // const type = spec.get(typeName);

  for (const ptr of type.pointers) {
    if (seen.has(ptr.name)) {
      continue;
    }
    seen.add(ptr.name);

    if (ptr.kind === "link") {
      Object.defineProperty(obj, ptr.name, {
        get: () => {
          const linkObj: any = {};
          Object.defineProperty(linkObj, "properties", {
            get: () => {
              const linkProperties: {[k: string]: any} = {};
              (ptr.pointers || []).forEach((linkProp) => {
                // We only support "link properties" in EdgeDB, currently.
                if (linkProp.kind !== "property") return;
                // No use for them reflected, at the moment.
                if (linkProp.name === "source" || linkProp.name === "target")
                  return;
                const linkPropObject: any = {};
                linkPropObject.cardinality = linkProp.realCardinality;
                Object.defineProperty(linkPropObject, "propertyTarget", {
                  get: () => {
                    return makeType(spec, linkProp.target_id);
                  },
                });
                return linkPropObject;
              });
              return linkProperties;
            },
            enumerable: true,
          });
          linkObj.cardinality = ptr.realCardinality;
          Object.defineProperty(linkObj, "linkTarget", {
            get: (): any => {
              return makeType(spec, ptr.target_id);
            },
            enumerable: true,
          });
        },
        enumerable: true,
      });
    } else if (ptr.kind === "property") {
      Object.defineProperty(obj, ptr.name, {
        get: () => {
          const propObject: any = {};
          propObject.cardinality = ptr.realCardinality;
          Object.defineProperty(propObject, "propertyTarget", {
            get: () => {
              return makeType(spec, ptr.target_id);
            },
          });
        },
        enumerable: true,
      });
    }
  }
}

export function makeType<T extends AnyMaterialtype>(
  spec: Types,
  id: string
): T {
  const type = spec.get(id);
  if (type.kind === "object") {
    const obj = {};
    const seen = new Set<string>();
    applySpec(spec, type, obj, seen);
    for (const anc of type.ancestors) {
      const ancType = spec.get(anc.id);
      if (ancType.kind !== "object") throw new Error(`Not an object: ${id}`);
      applySpec(spec, ancType, obj, seen);
    }
    return obj as any;
  } else if (type.kind === "scalar") {
    return {__name__: type.name} as any;
  } else if (type.kind === "array") {
    return ArrayType(type.name, makeType(spec, type.array_element_id)) as any;
  } else if (type.kind === "tuple") {
    if (type.tuple_elements[0].name === "0") {
      return UnnamedTupleType(
        type.name,
        type.tuple_elements.map((el) => makeType(spec, el.target_id)) as any
      ) as any;
    } else {
      const shape: any = {};
      type.tuple_elements.forEach((el) => {
        shape[el.name] = makeType(spec, el.target_id);
      }) as any;
      return NamedTupleType(type.name, shape as any) as any;
    }
  } else {
    throw new Error("Invalid type.");
  }
}
