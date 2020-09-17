type Computable<T> = {
  __kind: "computable";
  __type: T;
};

type PropertyParam<name extends string, T, O> =
  | boolean
  | Computable<T>
  | Property<name, T, O>;

type LinkParam<A, T> = A | Computable<T>;

type OptionalLinkParam<A, T> = LinkParam<A, T> | undefined;

type Property<name extends string, T, O> = {
  __kind: "property";
  __owner: O;
  __type: T;
  name: name;
};

type Link<T> = {
  __kind: "link";
  __type: T;
  name: string;
};

type Expand<T> = T extends object
  ? T extends infer O
    ? {[K in keyof O]: Expand<O[K]>}
    : never
  : T;

type _Result<P, Args, Type> = {
  [k in keyof P & keyof Type & keyof Args]: P[k] extends true
    ? Type[k]
    : P[k] extends boolean
    ? Type[k] | undefined
    : P[k] extends Property<any, infer PPT, any>
    ? PPT
    : Args[k] extends OptionalLinkParam<infer PA, infer PT>
    ? _Result<P[k], PA, PT>
    : never;
};

type Result<P, Args, Type> = Expand<_Result<P, Args, Type>>;

type UserType = {
  // will be auto-generated
  name: string;
  email: string;
  age: number;
  friends: UserType[];
  preferences?: PreferencesType;
  [_: string]: any;
};

interface PreferencesType {
  // will be auto-generated
  emailNotifications: boolean;
  saveOnClose: boolean;
}

type UserArgs =
  // will be auto-generated
  {
    name?: PropertyParam<"name", string, UserType>;
    email?: PropertyParam<"email", string, UserType>;
    age?: PropertyParam<"age", number, UserType>;
    friends?: LinkParam<UserArgs, UserType>;
    preferences?: LinkParam<PreferencesArgs, PreferencesType>;
    [_: string]:
      | PropertyParam<any, any, any>
      | LinkParam<any, any>
      | undefined;
  };

type PreferencesArgs =
  // will be auto-generated
  {
    emailNotifications?: PropertyParam<
      "emailNotifications",
      boolean,
      PreferencesType
    >;
    saveOnClose?: PropertyParam<"saveOnClose", boolean, PreferencesType>;
    [_: string]:
      | PropertyParam<any, any, any>
      | LinkParam<any, any>
      | undefined;
  };

const User = {
  // will be auto-generated

  __type: (null as any) as UserType,

  get name(): Property<"name", string, UserType> {
    return {name: "name", __kind: "property"} as any;
  },

  get email(): Property<"email", string, UserType> {
    return {name: "email", __kind: "property"} as any;
  },

  get age(): Property<"age", number, UserType> {
    return {name: "age", __kind: "property"} as any;
  },

  get friends(): Link<UserType> {
    return {name: "friends", __kind: "link"} as any;
  },

  get preferences(): Link<PreferencesType> {
    return {name: "preferences", __kind: "link"} as any;
  },

  select: <P extends UserArgs>(spec: P): Result<P, UserArgs, UserType> => {
    throw new Error("not implemented");
  },
} as const;

const Preferences = {
  // will be auto-generated

  __type: (null as any) as PreferencesType,

  get name(): Property<"name", boolean, PreferencesType> {
    return {name: "name", __kind: "property"} as any;
  },

  get emailNotifications(): Property<
    "emailNotifications",
    boolean,
    PreferencesType
  > {
    return {name: "emailNotifications", __kind: "property"} as any;
  },

  get saveOnClose(): Property<"saveOnClose", boolean, PreferencesType> {
    return {name: "saveOnClose", __kind: "property"} as any;
  },
};

////////////////

const results = User.select({
  name: User.name,
  age: 1 > 0,
  friends: {
    name: true,
  },
  preferences: {
    emailNotifications: true,
  },
  zzz: 123,
});
