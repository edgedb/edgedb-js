// export type AnyAnytype = Anytype;

export const ANYTYPE: unique symbol = Symbol("anytype");
export type ANYTYPE = typeof ANYTYPE;
export const MATERIAL_TYPE: unique symbol = Symbol("material_type");
export type MATERIAL_TYPE = typeof MATERIAL_TYPE;
export const TSTYPE: unique symbol = Symbol("tstype");
export type TSTYPE = typeof TSTYPE;
export const TYPENAME: unique symbol = Symbol("typename");
export type TYPENAME = typeof TYPENAME;
// export const CASTABLE: unique symbol = Symbol("castable");
// type CASTABLE = typeof CASTABLE;
// const ASSIGNABLE: unique symbol = Symbol("assignable");
// type ASSIGNABLE = typeof ASSIGNABLE;
// const IMPLICITCAST: unique symbol = Symbol("implicitly_castable");
// type IMPLICITCAST = typeof IMPLICITCAST;

/////////////////////////
/// ABSTRACT TYPES
/////////////////////////

export interface Anytype {
  // CastableTo extends AnyAnytype,
  // AssignableTo extends AnyAnytype,
  // ImplicitlyCastableTo extends AnyAnytype
  // CastableTo extends AnytypeTuple,
  // AssignableTo extends AnytypeTuple,
  // ImplicitlyCastableTo extends AnytypeTuple
  [ANYTYPE]: true;
  // [CASTABLE]: CastableTo;
  // [ASSIGNABLE]: AssignableTo;
  // [IMPLICITCAST]: ImplicitlyCastableTo;
  [TYPENAME]: string;
}
export type AnytypeTuple = [Anytype, ...Anytype[]] | [];

export interface Materialtype<
  Name extends string,
  TsType
  // CastableTo extends AnyAnytype,
  // AssignableTo extends AnyAnytype,
  // ImplicitlyCastableTo extends AnyAnytype
> extends Anytype {
  [MATERIAL_TYPE]: true;
  [TSTYPE]: TsType;
  [TYPENAME]: Name;
}

export type AnyMaterialtype = Materialtype<string, any>;
export type AnyMaterialtypeTuple =
  | [AnyMaterialtype, ...AnyMaterialtype[]]
  | [];

/////////////////////////
/// COLLECTION TYPES
/////////////////////////

export interface ArrayType<
  Name extends string,
  Element extends AnyMaterialtype
> extends Materialtype<Name, Element[typeof TSTYPE][]> {
  __elementType: Element;
}

export function ArrayType<
  Name extends string,
  Element extends AnyMaterialtype
>(name: Name, element: Element): ArrayType<Name, Element> {
  return {[TYPENAME]: name, __elementType: element} as any;
}

export interface UnnamedTupleType<
  Name extends string,
  Items extends AnyMaterialtypeTuple
> extends Materialtype<
    Name,
    {
      [k in keyof Items]: Items[k] extends AnyMaterialtype
        ? Items[k][typeof TSTYPE]
        : never;
    }
  > {
  __items: Items;
}
export function UnnamedTupleType<
  Name extends string,
  Items extends AnyMaterialtypeTuple
>(name: Name, items: Items): UnnamedTupleType<Name, Items> {
  return {[TYPENAME]: name, __items: items} as any;
}

export type NamedTupleShape = {[k: string]: AnyMaterialtype};
export interface NamedTupleType<
  Name extends string,
  Shape extends NamedTupleShape
> extends Materialtype<
    Name,
    {
      [k in keyof Shape]: Shape[k][typeof TSTYPE];
    }
  > {
  __shape: Shape;
}
export function NamedTupleType<
  Name extends string,
  Shape extends NamedTupleShape
>(name: Name, shape: Shape): NamedTupleType<Name, Shape> {
  return {[TYPENAME]: name, __shape: shape} as any;
}

/////////////////////////
/// OBJECT TYPES
/////////////////////////

export enum Cardinality {
  AtMostOne = "AtMostOne",
  One = "One",
  Many = "Many",
  AtLeastOne = "AtLeastOne",
  Empty = "Empty",
}

// `PropertyDesc` and `LinkDesc` are used in `__types__/*` files
// that directly reflect EdgeDB types to TypeScript types.
//
// These types must have different internal structure, so that's
// why they have `propertyTarget` and `linkTarget` attributes
// (not just `target`.)  Otherwise TS would fail to tell one from
// another in a conditional check like `A extends PropertyDesc`.
export interface PropertyDesc<
  T extends AnyMaterialtype,
  C extends Cardinality
> {
  cardinality: C;
  propertyTarget: T;
}

export interface LinkDesc<
  T extends ObjectType<any, any>,
  C extends Cardinality
> {
  cardinality: C;
  linkTarget: T;
}

export type ObjectTypeShape = {
  [k: string]: PropertyDesc<any, any> | LinkDesc<any, any>;
};

export type typeAndCardToTsType<
  Type extends AnyMaterialtype,
  Card extends Cardinality
> = Card extends Cardinality.Empty
  ? null
  : Card extends Cardinality.One
  ? Type[typeof TSTYPE]
  : Card extends Cardinality.AtLeastOne
  ? Type[typeof TSTYPE][]
  : Card extends Cardinality.AtMostOne
  ? Type[typeof TSTYPE] | null
  : Card extends Cardinality.Many
  ? Type[typeof TSTYPE][]
  : never;

export type PropertyDescToTsType<
  Prop extends PropertyDesc<any, any>
> = Prop extends PropertyDesc<infer Type, infer Card>
  ? typeAndCardToTsType<Type, Card>
  : never;

export type LinkDescToTsType<
  Link extends LinkDesc<any, any>
> = Link extends LinkDesc<infer Type, infer Card>
  ? typeAndCardToTsType<Type, Card>
  : never;

export type ObjectTypeShapeToTsType<T extends ObjectTypeShape> = {
  [k in keyof T]: T[k] extends PropertyDesc<any, any>
    ? PropertyDescToTsType<T[k]>
    : T[k] extends LinkDesc<any, any>
    ? LinkDescToTsType<T[k]>
    : never;
};

export interface ObjectType<Name extends string, Shape extends ObjectTypeShape>
  extends Materialtype<Name, ObjectTypeShapeToTsType<Shape>> {
  __shape: Shape;
}

export type AnyObject = ObjectType<string, ObjectTypeShape>;

export type UnpackBoolArg<Arg, T> = Arg extends true
  ? T
  : Arg extends false
  ? null
  : Arg extends boolean
  ? T | null
  : never;

export type ExcludeTFromArgs<Args, T> = {
  [k in keyof Args]: k extends keyof T ? never : k;
}[keyof Args];

export type BaseResult<Args, T> = {
  [k in (keyof T & keyof Args) | ExcludeTFromArgs<Args, T>]: k extends keyof T
    ? T[k] extends PropertyDesc<
        infer PPT,
        Cardinality.Many | Cardinality.AtLeastOne
      >
      ? Array<UnpackBoolArg<Args[k], PPT>>
      : T[k] extends PropertyDesc<infer PPT1, Cardinality.One>
      ? UnpackBoolArg<Args[k], PPT1>
      : T[k] extends PropertyDesc<infer PPT2, Cardinality.AtMostOne>
      ? UnpackBoolArg<Args[k], PPT2> | null
      : T[k] extends LinkDesc<
          infer LLT,
          Cardinality.Many | Cardinality.AtLeastOne
        >
      ? Array<BaseResult<Args[k], LLT>>
      : T[k] extends LinkDesc<infer LLT1, Cardinality.One>
      ? BaseResult<Args[k], LLT1>
      : T[k] extends LinkDesc<infer LLT2, Cardinality.AtMostOne>
      ? BaseResult<Args[k], LLT2> | null
      : unknown // : Args[k] extends Computable<infer CT> // ? CT
    : never;
};

// export const OBJECT_SYMBOL: unique symbol = Symbol();
// export interface AnyObject {
//   [OBJECT_SYMBOL]: true
// }

export type ExpandResult<T> = T extends
  | BaseResult<any, any>
  | Array<BaseResult<any, any>>
  ? T extends infer O
    ? {[K in keyof O]: ExpandResult<O[K]>}
    : never
  : T;

export type Result<Args, T extends AnyObject> = ExpandResult<
  BaseResult<Args, T>
>;

export type BaseMakeSelectArgs<T extends AnyObject> = {
  [k in keyof T["__shape"]]?: T["__shape"][k] extends LinkDesc<infer LT, any>
    ? BaseMakeSelectArgs<LT> | boolean
    : T["__shape"][k] extends PropertyDesc<any, any>
    ? boolean
    : never;
};

export type MakeSelectArgs<T extends AnyObject> = BaseMakeSelectArgs<T>;
