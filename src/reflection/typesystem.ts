import {generateObjectTypes} from "./generators/generateObjectTypes";
import {typeutil} from "./util/typeutil";

//////////////////
// BASE TYPES
//////////////////
export enum TypeKind {
  scalar = "scalar",
  object = "object",
  namedtuple = "namedtuple",
  unnamedtuple = "unnamedtuple",
  array = "array",
}
export interface BaseType {
  __kind__: TypeKind;
  __tstype__: unknown;
  __name__: string;
}
export type BaseTypeTuple = typeutil.tupleOf<BaseType>;

export interface ScalarType<Name extends string = string, TsType = unknown> {
  __kind__: TypeKind.scalar;
  __tstype__: TsType;
  __name__: Name;
}

export interface ObjectType<
  Name extends string = string,
  Shape extends ObjectTypeShape = ObjectTypeShape
> {
  __kind__: TypeKind.object;
  __tstype__: shapeToTsType<Shape>;
  __name__: Name;
  __shape__: Shape;
}

export type MaterialType =
  | ScalarType
  | ObjectType
  | UnnamedTupleType
  | NamedTupleType
  | ArrayType;

////////////////////
// SETS AND EXPRESSIONS
////////////////////

export enum Cardinality {
  AtMostOne = "AtMostOne",
  One = "One",
  Many = "Many",
  AtLeastOne = "AtLeastOne",
  Empty = "Empty",
}

export interface TypeSet<
  T extends MaterialType = MaterialType,
  Card extends Cardinality = Cardinality
> {
  __element__: T;
  __cardinality__: Card;
}

export type makeSet<
  T extends MaterialType = MaterialType,
  Card extends Cardinality = Cardinality
> = {
  __element__: T;
  __cardinality__: Card;
};

export type ObjectTypeSet<
  T extends ObjectType = ObjectType,
  Card extends Cardinality = Cardinality
> = TypeSet<T, Card>;

export type Expression<Set extends TypeSet = TypeSet> = Set & {
  toEdgeQL(): string;
};

export type ObjectTypeExpression<
  Set extends ObjectTypeSet = ObjectTypeSet
> = Expression<Set>;

/////////////////////////
/// COLLECTION TYPES
/////////////////////////
export type ArrayType<
  Name extends string = string,
  Element extends BaseType = BaseType
> = {
  __name__: Name;
  __kind__: TypeKind.array;
  __tstype__: Array<Element["__tstype__"]>;
  __element__: Element;
};

export function ArrayType<Name extends string, Element extends BaseType>(
  name: Name,
  element: Element
): ArrayType<Name, Element> {
  return {
    __kind__: TypeKind.array,
    __name__: name,
    __element__: element,
  } as any;
}

export type MaterialTypeTuple = [MaterialType, ...MaterialType[]] | [];

export type UnnamedTupleType<
  Name extends string = string,
  Items extends BaseTypeTuple = BaseTypeTuple
> = {
  __name__: Name;
  __kind__: TypeKind.unnamedtuple;
  __tstype__: {
    [k in keyof Items]: Items[k] extends BaseType
      ? Items[k]["__tstype__"]
      : never;
  };
  __items__: Items;
};
export function UnnamedTupleType<
  Name extends string,
  Items extends typeutil.tupleOf<BaseType>
>(name: Name, items: Items): UnnamedTupleType<Name, Items> {
  return {
    __kind__: TypeKind.unnamedtuple,
    __name__: name,
    __items__: items,
  } as any;
}

export type NamedTupleShape = {[k: string]: MaterialType};
export type NamedTupleType<
  Name extends string = string,
  Shape extends NamedTupleShape = NamedTupleShape
> = {
  __name__: Name;
  __kind__: TypeKind.namedtuple;
  __tstype__: {
    [k in keyof Shape]: Shape[k]["__tstype__"];
  };
  __shape__: Shape;
};
export function NamedTupleType<
  Name extends string,
  Shape extends NamedTupleShape
>(name: Name, shape: Shape): NamedTupleType<Name, Shape> {
  return {
    __kind__: TypeKind.namedtuple,
    __name__: name,
    __shape__: shape,
  } as any;
}

/////////////////////////
/// OBJECT TYPES
/////////////////////////

type PropertyTypes =
  | ScalarType
  | ArrayType
  | UnnamedTupleType
  | NamedTupleType;
export interface PropertyDesc<
  T extends PropertyTypes = PropertyTypes,
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
  T extends ObjectType = ObjectType,
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

/////////////////////
/// TSTYPE HELPERS
/////////////////////

export type setToTsType<Set extends TypeSet> = Set extends makeSet<
  infer Type,
  infer Card
>
  ? Set["__cardinality__"] extends Cardinality.Empty
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
    : never
  : never;

export type propToTsType<
  Prop extends PropertyDesc
> = Prop extends PropertyDesc<infer Type, infer Card>
  ? setToTsType<makeSet<Type, Card>>
  : never;

export type linkToTsType<
  Link extends LinkDesc<any, any, any>
> = Link extends LinkDesc<infer Type, infer Card, any>
  ? setToTsType<makeSet<Type, Card>>
  : never;

export type shapeToTsType<T extends ObjectTypeShape> = typeutil.flatten<
  {
    [k in keyof T]: T[k] extends PropertyDesc
      ? propToTsType<T[k]>
      : T[k] extends LinkDesc<any, any, any>
      ? linkToTsType<T[k]>
      : never;
  }
>;
