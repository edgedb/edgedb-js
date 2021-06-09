//import {Link} from "../m3";

import * as model from "./model";

type TypeName = string;

type PropertyRawSpec = {
  name: TypeName;
  cardinality: model.Cardinality;
};

type LinkRawSpec = {
  name: TypeName;
  cardinality: model.Cardinality;
  target: TypeName;
  properties: PropertyRawSpec[];
};

type TypeRawSpec = Array<{
  name: TypeName;
  bases: TypeName[];
  ancestors: TypeName[];
  properties: PropertyRawSpec[];
  links: LinkRawSpec[];
}>;

enum ScalarKind {
  str,
  bytes,
  uuid,
  bool,
  int64,
  int32,
  int16,
  float64,
  float32,
  datetime,
  duration,
  bigint,
  decimal,
  local_date,
  local_time,
  local_datetime,
  unknown, // special type for forwards compat
}

enum PrimitiveKind {
  scalar,
  array,
  tuple,
  namedtuple,
}

type ScalarValue = {
  kind: PrimitiveKind.scalar;
  type: ScalarKind;
};

type ArrayValue = {
  kind: PrimitiveKind.array;
  element: PrimitiveValue;
};

type TupleValue = {
  kind: PrimitiveKind.tuple;
  elements: PrimitiveValue[];
};

type PrimitiveValue = ScalarValue | ArrayValue | TupleValue;

type PropertySpec = {
  name: string;
  cardinality: model.Cardinality;
};

type LinkSpec = {
  name: string;
  cardinality: model.Cardinality;
  target: TypeName;
  properties: PropertySpec[];
};

type TypeSpec = {
  name: string;
  bases: TypeName[];
  ancestors: TypeName[];
  links: LinkSpec[];
  properties: PropertySpec[];
};

export type TypesSpec = Map<TypeName, TypeSpec>;

// export function buildSpec(raw: TypeRawSpec):

const pathObject: unique symbol = Symbol("object");
const pathParent: unique symbol = Symbol("parent");
const pathLink: unique symbol = Symbol("link");

interface PathStep {
  [pathParent]: PathStep | null;
  [pathObject]: TypeName | null;
  [pathLink]: string | null;
}

interface PathLeaf<T> extends PathStep {}

interface PathMethods<T extends model.ObjectTypeDesc> {
  shape<S extends model.MakeSelectArgs<T>>(spec: S): Query<model.Result<S, T>>;
}

export type Path<T extends model.ObjectTypeDesc> = {
  [k in keyof T]: T[k] extends model.LinkDesc<infer LT, any>
    ? LT extends model.ObjectTypeDesc
      ? Path<LT> & PathStep
      : never
    : T[k] extends model.PropertyDesc<infer PT, any>
    ? PathLeaf<PT>
    : never;
} &
  PathMethods<T>;

function applySpec(
  spec: TypesSpec,
  typeName: TypeName,
  obj: PathStep,
  seen: Set<string>
): void {
  const type = spec.get(typeName)!;

  for (const link of type.links) {
    if (seen.has(link.name)) {
      continue;
    }
    seen.add(link.name);

    Object.defineProperty(obj, link.name, {
      get: (nextTarget: LinkSpec = link): any => {
        return buildPath(obj, nextTarget.name, spec, nextTarget.target);
      },
      enumerable: true,
    });
  }

  for (const prop of type.properties) {
    if (seen.has(prop.name)) {
      continue;
    }
    seen.add(prop.name);

    Object.defineProperty(obj, prop.name, {
      get: (nextTarget: PropertySpec = prop): any => {
        return buildPath(obj, nextTarget.name, spec, null);
      },
      enumerable: true,
    });
  }
}

function createPathStep(
  parent: PathStep | null,
  linkName: string | null,
  target: TypeName | null
): PathStep {
  const obj = Object.defineProperties(Object.create(null), {
    [pathParent]: {
      value: parent,
    },
    [pathObject]: {
      value: target,
    },
    [pathLink]: {
      value: linkName,
    },
    [Symbol.toStringTag]: {
      get: () => {
        const steps: string[] = [];

        let parent: PathStep | null = obj;
        while (parent != null) {
          if (parent[pathLink] != null) {
            steps.push(parent[pathLink]!);
          } else {
            steps.push(parent[pathObject]!);
          }
          parent = parent[pathParent];
        }

        steps.reverse();
        return steps.join(".");
      },
    },
  });
  return obj;
}

function buildPath<T extends model.ObjectTypeDesc>(
  parent: PathStep | null,
  linkName: string | null,
  spec: TypesSpec,
  target: TypeName | null
): Path<T> {
  const obj = createPathStep(parent, linkName, target);

  if (target != null) {
    const type = spec.get(target)!;
    const seen = new Set<string>();
    applySpec(spec, target, obj, seen);
    for (const anc of type.ancestors) {
      applySpec(spec, anc, obj, seen);
    }
  }

  return obj as any;
}

export function objectType<T extends model.ObjectTypeDesc>(
  spec: TypesSpec,
  name: string
): Path<T> {
  const obj = buildPath(null, null, spec, name);

  Object.defineProperties(obj, {
    shape: {
      value: (shape: object): Query<any> => {
        return new Query(obj as any, shape);
      },
    },
  });

  return obj as any;
}

const resultType: unique symbol = Symbol("result");

export class Query<R> {
  private [resultType]!: R;

  constructor(obj: Path<any>, spec: object) {}

  filter(): Query<R> {
    return null as any;
  }

  async select(): Promise<R> {
    return null as any;
  }
}
