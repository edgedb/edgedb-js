//import {Link} from "../m3";

import * as model from "./objects";
import {StrictMap} from "./strictMap";

type TypeName = string;

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

export type TypesSpec = StrictMap<TypeName, TypeSpec>;

export const pathObject: unique symbol = Symbol("object");
export const pathParent: unique symbol = Symbol("parent");

type PathParent = {parent: PathStep; linkName: TypeName};
interface PathStep {
  [pathParent]: PathParent | null;
  [pathObject]: TypeName | null;
}

interface PathLeaf<_T> extends PathStep {}

interface PathMethods<T extends model.AnyObject> {
  shape<S extends model.MakeSelectArgs<T>>(spec: S): Query<model.Result<S, T>>;
}

type arg = {arg: string} & {blarg: number};
class Expression implements arg {
  constructor() {}
  arg: string = "adf";
  blarg = 13;
}
export type Path<T extends model.AnyObject> = {
  [k in keyof T["__shape__"]]: T["__shape__"][k] extends model.LinkDesc<
    infer LT,
    any
  >
    ? LT extends model.AnyObject
      ? Path<LT> & PathStep
      : never
    : T["__shape__"][k] extends model.PropertyDesc<infer PT, any>
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
  const type = spec.get(typeName);

  for (const link of type.links) {
    if (seen.has(link.name)) {
      continue;
    }
    seen.add(link.name);

    Object.defineProperty(obj, link.name, {
      get: (nextTarget: LinkSpec = link): any => {
        return buildPath(
          {parent: obj, linkName: nextTarget.name},
          spec,
          nextTarget.target
        );
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
        return buildPath({parent: obj, linkName: nextTarget.name}, spec, null);
      },
      enumerable: true,
    });
  }
}

function createPathStep(
  parent: PathParent | null,
  target: TypeName | null
): PathStep {
  const obj = Object.defineProperties(Object.create(null), {
    [pathParent]: {
      value: parent,
    },
    [pathObject]: {
      value: target,
    },
    get [Symbol.toStringTag]() {
      const steps: string[] = [];

      let parent: PathStep | null = obj;
      while (parent !== null) {
        let parentParent = parent[pathParent];
        if (parentParent !== null) {
          steps.push(parentParent.linkName);
        } else {
          steps.push(parent[pathObject]!);
        }
        parent = parent[pathParent]?.parent || null;
      }

      steps.reverse();
      return steps.join(".");
    },
  });
  return obj;
}

function buildPath<T extends model.AnyObject>(
  parent: PathParent | null,
  spec: TypesSpec,
  target: TypeName | null
): Path<T> {
  const obj = createPathStep(parent, target);

  if (target !== null) {
    const type = spec.get(target);
    const seen = new Set<string>();
    applySpec(spec, target, obj, seen);
    for (const anc of type.ancestors) {
      applySpec(spec, anc, obj, seen);
    }
  }

  return obj as any;
}

export function objectType<T extends model.AnyObject>(
  spec: TypesSpec,
  name: string
): Path<T> {
  const obj = buildPath(null, spec, name);

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
  [resultType]!: R;

  constructor(public obj: Path<any>, public spec: object) {}

  filter(): Query<R> {
    return null as any;
  }

  async select(): Promise<R> {
    return null as any;
  }
}
