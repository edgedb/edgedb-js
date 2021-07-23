// no runtime imports
import type {$pathify} from "../syntax/path";
import type {typeutil} from "./util/typeutil";

//////////////////
// BASE TYPES
//////////////////
export enum TypeKind {
  scalar = "scalar",
  object = "object",
  namedtuple = "namedtuple",
  tuple = "tuple",
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

export type BaseExpression<Set extends TypeSet = TypeSet> = {
  __element__: Set["__element__"];
  __cardinality__: Set["__cardinality__"];
  toEdgeQL(): string;
} & $pathify<Set>;

export enum ExpressionKind {
  Set = "Set",
  PathNode = "PathNode",
  PathLeaf = "PathLeaf",
  Literal = "Literal",
  Cast = "Cast",
}

export type ObjectTypeSet<
  T extends ObjectType = ObjectType,
  Card extends Cardinality = Cardinality
> = TypeSet<T, Card>;

export type ObjectTypeExpression<
  Set extends ObjectTypeSet = ObjectTypeSet
> = BaseExpression<Set>;

export type PrimitiveType =
  | ScalarType
  | TupleType
  | NamedTupleType
  | ArrayType;

export type PrimitiveTypeSet<
  T extends PrimitiveType = PrimitiveType,
  Card extends Cardinality = Cardinality
> = TypeSet<T, Card>;

export type PrimitiveExpression<
  Set extends PrimitiveTypeSet = PrimitiveTypeSet
> = BaseExpression<Set>;

/////////////////////////
/// COLLECTION TYPES
/////////////////////////
export type ArrayType<
  Element extends BaseType = BaseType,
  Name extends string = `array<${Element["__name__"]}>`
> = {
  __name__: Name;
  __kind__: TypeKind.array;
  __tstype__: Array<Element["__tstype__"]>;
  __element__: Element;
};

export function ArrayType<Element extends BaseType>(
  element: Element
): ArrayType<Element> {
  return {
    __kind__: TypeKind.array,
    __name__: `array<${element.__name__}>`,
    __element__: element,
  } as any;
}

export type MaterialTypeTuple = [MaterialType, ...MaterialType[]] | [];

export type TupleType<Items extends BaseTypeTuple = BaseTypeTuple> = {
  __name__: string;
  __kind__: TypeKind.tuple;
  __tstype__: {
    [k in keyof Items]: Items[k] extends BaseType
      ? Items[k]["__tstype__"]
      : never;
  };
  __items__: Items;
};
export function TupleType<Items extends typeutil.tupleOf<BaseType>>(
  items: Items
): TupleType<Items> {
  const name = `tuple<${items.map((item) => item.__name__).join(", ")}>`;
  return {
    __kind__: TypeKind.tuple,
    __name__: name,
    __items__: items,
  } as any;
}

export type NamedTupleShape = {[k: string]: MaterialType};
export type NamedTupleType<Shape extends NamedTupleShape = NamedTupleShape> = {
  __name__: string;
  __kind__: TypeKind.namedtuple;
  __tstype__: {
    [k in keyof Shape]: Shape[k]["__tstype__"];
  };
  __shape__: Shape;
};
export function NamedTupleType<Shape extends NamedTupleShape>(
  shape: Shape
): NamedTupleType<Shape> {
  const name = `tuple<${Object.entries(shape)
    .map(([key, val]) => `${key}: ${val.__name__}`)
    .join(", ")}>`;
  return {
    __kind__: TypeKind.namedtuple,
    __name__: name,
    __shape__: shape,
  } as any;
}

/////////////////////////
/// OBJECT TYPES
/////////////////////////

type PropertyTypes = ScalarType | ArrayType | TupleType | NamedTupleType;
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

type adsfqewr = shapeToTsType<ObjectTypeShape>;

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

export type shapeToTsType<T extends ObjectTypeShape> = string extends keyof T
  ? any
  : typeutil.flatten<
      {
        [k in keyof T]: T[k] extends PropertyDesc
          ? propToTsType<T[k]>
          : T[k] extends LinkDesc<any, any, any>
          ? linkToTsType<T[k]>
          : never;
      }
    >;

///////////////////////////////////
// DISCRIMINATED UNION OF ALL MATERIAL TYPES
///////////////////////////////////

export type MaterialType =
  | ScalarType
  | ObjectType
  | TupleType
  | NamedTupleType
  | ArrayType;
