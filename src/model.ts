export enum Kind {
  computable,
  property,
  link,
}

export enum Cardinality {
  at_most_one,
  one,
  many,
  at_least_one,
}

export interface SchemaObject {
  kind: Kind;
  name: string;
}

export interface Pointer extends SchemaObject {
  cardinality: Cardinality;
}

export interface Computable<T> extends SchemaObject {
  kind: Kind.computable;
  __type: T;
}

export interface Property<name extends string, T, C extends Cardinality>
  extends Pointer {
  kind: Kind.property;
  cardinality: C;
  name: name;
  __type: T;
}

export interface Link<name extends string, T, C extends Cardinality>
  extends Pointer {
  kind: Kind.link;
  cardinality: C;
  target: T;
  name: name;
}

export type Parameter<T> = Computable<T> | Property<any, T, any>;

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
  : Arg extends Property<any, infer PPT, any>
  ? PPT
  : T;

type _OnlyArgs<Args, T> = {
  [k in keyof Args]: k extends keyof T ? never : k;
}[keyof Args];

type _Result<Args, T> = {
  [k in (keyof T & keyof Args) | _OnlyArgs<Args, T>]: k extends keyof T
    ? T[k] extends Property<any, infer PPT, any>
      ? _UnpackBoolArg<Args[k], PPT>
      : T[k] extends Link<any, infer LLT, any>
      ? _Result<Args[k], LLT>
      : unknown
    : Args[k] extends Computable<infer CT>
    ? CT
    : never;
};

export type Result<Args, T> = Expand<_Result<Args, T>>;

export type MakeSelectArgs<T> = {
  [k in keyof T]?: T[k] extends Link<infer LN, infer LT, infer LC>
    ? Link<LN, LT, LC> | MakeSelectArgs<LT> | Computable<LT> | boolean
    : T[k] extends Property<infer PN, infer PT, infer PC>
    ? Property<PN, PT, PC> | Computable<PT> | boolean
    : never;
};

function literal<T extends number | string | boolean | Date>(
  x: T
): Computable<T> {
  return {kind: "computable", args: [x]} as any;
}

const std = {
  ops: {
    plus: <T>(l: Parameter<T>, r: Parameter<T>): Computable<T> => {
      return {kind: "computable", args: [l, r], op: "plus"} as any;
    },
  } as const,
  len: <T>(l: Parameter<T>): Computable<number> => {
    return {kind: "computable", args: [l]} as any;
  },
} as const;

const bases = {
  User: {
    // will be auto-generated

    get name() {
      return {
        kind: Kind.property,
        name: "name",
        cardinality: Cardinality.one,
      } as Property<"name", string, Cardinality.one>;
    },

    get email() {
      return {
        kind: Kind.property,
        name: "email",
        cardinality: Cardinality.one,
      } as Property<"email", string, Cardinality.one>;
    },

    get age() {
      return {
        kind: Kind.property,
        name: "age",
        cardinality: Cardinality.one,
      } as Property<"age", number, Cardinality.one>;
    },

    get friends() {
      return {
        kind: Kind.link,
        cardinality: Cardinality.many,
        name: "friends",
        target: bases.User,
      } as Link<"friends", typeof bases.User, Cardinality.many>;
    },

    get preferences() {
      return {
        kind: Kind.link,
        cardinality: Cardinality.at_most_one,
        name: "preferences",
        target: bases.Preferences,
      } as Link<
        "preferences",
        typeof bases.Preferences,
        Cardinality.at_most_one
      >;
    },
  } as const,

  Preferences: {
    // will be auto-generated

    get name() {
      return {
        kind: Kind.property,
        name: "name",
        cardinality: Cardinality.one,
      } as Property<"name", string, Cardinality.one>;
    },

    get emailNotifications() {
      return {
        name: "emailNotifications",
        kind: Kind.property,
        cardinality: Cardinality.one,
      } as Property<"emailNotifications", boolean, Cardinality.one>;
    },

    get saveOnClose() {
      return {
        name: "saveOnClose",
        kind: Kind.property,
        cardinality: Cardinality.at_most_one,
      } as Property<"saveOnClose", boolean, Cardinality.at_most_one>;
    },
  } as const,
};

const User = {
  ...bases.User,

  shape: <Spec extends MakeSelectArgs<typeof bases.User>>(
    spec: Spec
  ): Query<Result<Spec, typeof bases.User>> => {
    throw new Error("not implemented");
  },
} as const;

const Preferences = {
  ...bases.Preferences,

  shape: <Spec extends MakeSelectArgs<typeof bases.Preferences>>(
    spec: Spec
  ): Query<Result<Spec, typeof bases.Preferences>> => {
    throw new Error("not implemented");
  },
} as const;

////////////////

class Query<T> {
  _type!: T;

  filter(): Query<T> {
    return null as any;
  }
}

////////////////

const results2 = User.shape({
  email: User.email,
  age: false,
  name: 1 > 0,
  friends: {
    name: true,
    age: 1 > 0,
    friends: {
      zzz: std.len(User.name),
      zzz2: literal(42),
      friends: {
        age: true,
      },
    },
  },
});
