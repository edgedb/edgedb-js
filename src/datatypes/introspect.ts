export const introspectMethod = Symbol("edgedb.introspect");

export interface FieldInfo {
  name: string;
}

export interface ObjectFieldInfo {
  name: string;
  implicit: boolean;
  linkprop: boolean;
}

export interface ObjectInfo {
  kind: "object";
  fields: ObjectFieldInfo[];
}

export interface NamedTupleInfo {
  kind: "namedtuple";
  fields: FieldInfo[];
}

export interface SimpleContainerInfo {
  kind: "tuple" | "set" | "array";
}

export type CollectionInfo = SimpleContainerInfo | NamedTupleInfo | ObjectInfo;

export interface IntrospectableType {
  [introspectMethod](): CollectionInfo;
}

export function introspect(obj: any): CollectionInfo | null {
  if (obj[introspectMethod]) {
    return obj[introspectMethod]();
  }

  if (obj instanceof Array) {
    return {kind: "array"};
  }

  return null;
}
