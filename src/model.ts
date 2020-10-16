type Intersect<T> = (T extends any
? (x: T) => void
: unknown) extends (x: infer R) => void
  ? R
  : never;

type UnpackDNF<T> = T extends any[]
  ? {
      [k in keyof T]: T[k] extends [any]
        ? T[k][number]
        : T[k] extends any[]
        ? Intersect<T[k][number]>
        : never;
    }[number]
  : never;

export enum Kind {
  computable,
  property,
  link,
}

export enum Cardinality {
  AtMostOne,
  One,
  Many,
  AtLeastOne,
}

export interface SchemaObject {
  kind: Kind;
  name: string;
}

export interface BasePointer {}

export interface Pointer extends BasePointer, SchemaObject {
  cardinality: Cardinality;
}

export interface Computable<T> extends SchemaObject {
  kind: Kind.computable;
  __type: T;
}

export interface Property<scalar, C extends Cardinality> extends Pointer {
  kind: Kind.property;
  cardinality: C;
  name: string;
}

export interface Link<T, C extends Cardinality> extends Pointer {
  kind: Kind.link;
  cardinality: C;
  target: T;
  name: string;
}

export type Parameter<T> = Computable<T> | Property<T, any>;

export type Expand<T> = T extends object
  ? T extends infer O
    ? {[K in keyof O]: Expand<O[K]>}
    : never
  : T;

type _UnpackBoolArg<Arg, T> = Arg extends true
  ? T
  : Arg extends false
  ? undefined
  : Arg extends boolean
  ? T | undefined
  : Arg extends Property<infer PPT, any>
  ? PPT
  : T;

type NonTArgs<Args, T> = {
  [k in keyof Args]: k extends keyof T ? never : k;
}[keyof Args];

type _Result<Args, T> = {
  [k in (keyof T & keyof Args) | NonTArgs<Args, T>]: k extends keyof T
    ? T[k] extends Property<infer PPT, any>
      ? _UnpackBoolArg<Args[k], PPT>
      : T[k] extends Link<infer LLT, any>
      ? _Result<Args[k], LLT>
      : unknown
    : Args[k] extends Computable<infer CT>
    ? CT
    : never;
};

export type Result<Args, T> = Expand<_Result<Args, T>>;

// export type MakeSelectArgs<T> = {
//   [k in keyof T]?: T[k] extends Link<infer LT, infer LC>
//     ? Link<LT, LC> | MakeSelectArgs<LT> | Computable<LT> | boolean
//     : T[k] extends Property<infer PT, infer PC>
//     ? Property<PT, PC> | Computable<PT> | boolean
//     : never;
// };

export type MakeSelectArgs<T> = {
  [k in keyof T]?: T[k] extends Link<infer LT, infer LC>
    ? MakeSelectArgs<LT> | BasePointer | boolean
    : T[k] extends Property<infer PT, infer PC>
    ? boolean
    : never;
};

function literal<T extends number | string | boolean | Date>(
  x: T
): Computable<T> {
  return {kind: "computable", args: [x]} as any;
}

export class Query<T> {
  _type!: T;

  filter(): Query<T> {
    return null as any;
  }
}
