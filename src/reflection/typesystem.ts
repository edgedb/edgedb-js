/////////////////////////
/// ABSTRACT TYPES
/////////////////////////

import {typeutil} from "./typeutil";

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

export type AnyMaterialtype = Materialtype<string, unknown>;
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
  T extends AnyMaterialtype = AnyMaterialtype,
  C extends Cardinality = Cardinality
> {
  __kind__: "property";
  cardinality: C;
  target: T;
}

export type PropertyShape = {
  [k: string]: PropertyDesc;
};

export interface LinkDesc<
  T extends ObjectType<any, any> = ObjectType<any, any>,
  C extends Cardinality = Cardinality,
  LinkProps extends PropertyShape = {}
> {
  __kind__: "link";
  cardinality: C;
  target: T;
  properties: LinkProps;
}

export type ObjectTypeShape = {
  [k: string]: PropertyDesc | LinkDesc;
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
  __isobjecttype__: true;
  __shape__: Shape;
}

export type AnyObject = ObjectType<string, ObjectTypeShape>;

export interface SetType<
  T extends AnyMaterialtype = AnyMaterialtype,
  Card extends Cardinality = Cardinality
> {
  __element__: T;
  __cardinality__: Card;
}

export type ObjectSetType<
  T extends AnyObject = AnyObject,
  Card extends Cardinality = Cardinality
> = SetType<T, Card>;

export type Expression<Set extends SetType> = Set & {
  toEdgeQL(): string;
};

export type ObjectExpression<
  Set extends ObjectSetType = ObjectSetType
> = Expression<Set>;
