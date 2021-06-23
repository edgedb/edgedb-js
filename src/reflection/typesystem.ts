/////////////////////////
/// ABSTRACT TYPES
/////////////////////////

import {typeutil} from "./util";

export interface Anytype {
  __isanytype__: true;
  __name__: string;
}
export type AnytypeTuple = [Anytype, ...Anytype[]] | [];

export interface Materialtype<Name extends string, TsType> extends Anytype {
  __ismaterialtype__: true;
  __tstype__: TsType;
  __name__: Name;
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
> extends Materialtype<Name, Element["__tstype__"][]> {
  __element__: Element;
}

export function ArrayType<
  Name extends string,
  Element extends AnyMaterialtype
>(name: Name, element: Element): ArrayType<Name, Element> {
  return {__name__: name, __element__: element} as any;
}

export interface UnnamedTupleType<
  Name extends string,
  Items extends AnyMaterialtypeTuple
> extends Materialtype<
    Name,
    {
      [k in keyof Items]: Items[k] extends AnyMaterialtype
        ? Items[k]["__tstype__"]
        : never;
    }
  > {
  __items__: Items;
}
export function UnnamedTupleType<
  Name extends string,
  Items extends AnyMaterialtypeTuple
>(name: Name, items: Items): UnnamedTupleType<Name, Items> {
  return {__name__: name, __items__: items} as any;
}

export type NamedTupleShape = {[k: string]: AnyMaterialtype};
export interface NamedTupleType<
  Name extends string,
  Shape extends NamedTupleShape
> extends Materialtype<
    Name,
    {
      [k in keyof Shape]: Shape[k]["__tstype__"];
    }
  > {
  __shape__: Shape;
}
export function NamedTupleType<
  Name extends string,
  Shape extends NamedTupleShape
>(name: Name, shape: Shape): NamedTupleType<Name, Shape> {
  return {__name__: name, __shape__: shape} as any;
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

export interface PropertyDesc<
  T extends AnyMaterialtype,
  C extends Cardinality
> {
  cardinality: C;
  propertyTarget: T;
}

export type PropertyShape = {
  [k: string]: PropertyDesc<any, any>;
};

export interface LinkDesc<
  T extends ObjectType<any, any>,
  C extends Cardinality,
  LinkProps extends PropertyShape = {}
> {
  cardinality: C;
  linkTarget: T;
  properties: LinkProps;
}

export type ObjectTypeShape = {
  [k: string]: PropertyDesc<any, any> | LinkDesc<any, any, any>;
};

export type typeAndCardToTsType<
  Type extends AnyMaterialtype,
  Card extends Cardinality
> = Card extends Cardinality.Empty
  ? null
  : Card extends Cardinality.One
  ? Type["__tstype__"]
  : Card extends Cardinality.AtLeastOne
  ? [Type["__tstype__"], ...Type["__tstype__"][]]
  : Card extends Cardinality.AtMostOne
  ? Type["__tstype__"] | null
  : Card extends Cardinality.Many
  ? Type["__tstype__"][]
  : Card extends Cardinality.Empty
  ? null
  : never;

export type PropertyDescToTsType<
  Prop extends PropertyDesc<any, any>
> = Prop extends PropertyDesc<infer Type, infer Card>
  ? typeAndCardToTsType<Type, Card>
  : never;

export type LinkDescToTsType<
  Link extends LinkDesc<any, any, any>
> = Link extends LinkDesc<infer Type, infer Card, any>
  ? typeAndCardToTsType<Type, Card>
  : never;

export type ObjectTypeShapeToTsType<
  T extends ObjectTypeShape
> = typeutil.flatten<
  {
    [k in keyof T]: T[k] extends PropertyDesc<any, any>
      ? PropertyDescToTsType<T[k]>
      : T[k] extends LinkDesc<any, any, any>
      ? LinkDescToTsType<T[k]>
      : never;
  }
>;

export interface ObjectType<Name extends string, Shape extends ObjectTypeShape>
  extends Materialtype<Name, ObjectTypeShapeToTsType<Shape>> {
  __shape__: Shape;
}

export type AnyObject = ObjectType<string, ObjectTypeShape>;

///////////////
/// Type inference helpers
////////////////
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
  [k in keyof T["__shape__"]]?: T["__shape__"][k] extends LinkDesc<
    infer LT,
    any
  >
    ? BaseMakeSelectArgs<LT> | boolean
    : T["__shape__"][k] extends PropertyDesc<any, any>
    ? boolean
    : never;
};

export type MakeSelectArgs<T extends AnyObject> = BaseMakeSelectArgs<T>;
