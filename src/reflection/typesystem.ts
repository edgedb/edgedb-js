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
  unnamedtuple = "unnamedtuple",
  array = "array",
  shape = "shape",
}
export interface BaseType {
  __kind__: TypeKind;
  __tstype__: unknown;
  __name__: string;
}
export interface BaseTypeSet<
  T extends BaseType = BaseType,
  Card extends Cardinality = Cardinality
> {
  __element__: T;
  __cardinality__: Card;
}
export type BaseTypeTuple = typeutil.tupleOf<BaseType>;

export interface ScalarType<Name extends string = string, TsType = unknown> {
  __kind__: TypeKind.scalar;
  __tstype__: TsType;
  __name__: Name;
}

//////////////////
// OBJECT TYPES
//////////////////
export type BaseObjectType = {
  __kind__: TypeKind.object;
  __tstype__: any;
  __name__: string;
  __shape__: ObjectTypeShape;
  __params__: any;
  __polys__: any[];
};
export interface ObjectType<
  Name extends string = string,
  Shape extends ObjectTypeShape = ObjectTypeShape,
  Params extends any = any,
  Polys extends Poly[] = Poly[]
> {
  __kind__: TypeKind.object;
  __tstype__: computeObjectShape<Shape, Params, Polys>;
  __name__: Name;
  __shape__: Shape;
  __params__: Params;
  __polys__: Polys;
}

export type objectExprToSelectParams<
  T extends ObjectTypeExpression
> = shapeToSelectParams<T["__element__"]["__shape__"]>;

// export type shapeExprToSelectParams<
//   T extends BaseShapeExpression
// > = objectTypeToSelectParams<T["__element__"]["__root__"]>;

export type objectTypeToSelectParams<
  T extends BaseObjectType
> = shapeToSelectParams<T["__shape__"]>;

export type shapeToSelectParams<Shape extends ObjectTypeShape> = Partial<
  {
    [k in keyof Shape]: Shape[k] extends PropertyDesc
      ? boolean
      : Shape[k] extends LinkDesc
      ?
          | true
          | (shapeToSelectParams<Shape[k]["target"]["__shape__"]> &
              linkDescShape<Shape[k]>)
      : any;
  }
>;

export type linkDescShape<Link extends LinkDesc> = addAtSigns<
  Link["properties"]
> extends ObjectTypeShape
  ? shapeToSelectParams<addAtSigns<Link["properties"]>>
  : never;

export type addAtSigns<T> = {[k in string & keyof T as `@${k}`]: T[k]};

type isEqual<T, U> = T extends U ? (U extends T ? true : false) : false;

export type computeObjectShape<
  Shape extends ObjectTypeShape,
  Params extends unknown,
  Polys extends Poly[]
> = isEqual<Shape, ObjectTypeShape> extends true
  ? unknown
  : isEqual<Params, unknown> extends true
  ? shapeToTsType<Shape>
  : shapeWithPolysToTs<Shape, Params, Polys>;

export type shapeWithPolysToTs<
  Shape extends ObjectTypeShape,
  Params extends unknown,
  Polys extends Poly[]
> =
  // if expr is shapeexpression, go deeper
  simpleShapeToTs<Shape, Params> extends infer BaseShape
    ? Polys extends []
      ? BaseShape
      : Polys[number] extends infer P
      ? P extends Poly
        ? typeutil.flatten<
            BaseShape & simpleShapeToTs<P["type"]["__shape__"], P["params"]>
          >
        : unknown
      : unknown
    : never;

export type simpleShapeToTs<Shape extends ObjectTypeShape, Params> = {
  [k in string & keyof Params]: k extends keyof Shape
    ? Params[k] extends true
      ? shapeElementToTsTypeSimple<Shape[k]>
      : Params[k] extends false
      ? never
      : Params[k] extends boolean
      ? shapeElementToTsType<Shape[k]> | undefined
      : Params[k] extends object
      ? Shape[k]["target"] extends BaseObjectType
        ? simpleShapeToTs<Shape[k]["target"]["__shape__"], Params[k]>
        : never
      : never
    : Params[k] extends infer U
    ? U extends TypeSet
      ? setToTsType<U>
      : never
    : "invalid key";
};

export type shapeElementToTsTypeSimple<
  El extends PropertyDesc | LinkDesc
> = El extends PropertyDesc
  ? propToTsType<El>
  : El extends LinkDesc<any, any, any>
  ? {id: string}
  : never;

export type Poly<
  Type extends BaseObjectType = BaseObjectType,
  Params extends objectTypeToSelectParams<Type> = any
> = {
  type: Type;
  params: Params;
};
export function shape<
  Expr extends ObjectTypeExpression,
  Params extends objectTypeToSelectParams<Expr["__element__"]>
>(expr: Expr, params: Params) {
  return {is: expr, params};
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
  // Select = "Select",
  ShapeSelect = "ShapeSelect",
  SimpleSelect = "SimpleSelect",
}

export type ObjectTypeSet<
  T extends BaseObjectType = BaseObjectType,
  Card extends Cardinality = Cardinality
> = TypeSet<T, Card>;

export type ObjectTypeExpression<
  Set extends ObjectTypeSet = ObjectTypeSet
> = BaseExpression<Set>;

export type PrimitiveType =
  | ScalarType
  | UnnamedTupleType
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

export type UnnamedTupleType<Items extends BaseTypeTuple = BaseTypeTuple> = {
  __name__: string;
  __kind__: TypeKind.unnamedtuple;
  __tstype__: {
    [k in keyof Items]: Items[k] extends BaseType
      ? Items[k]["__tstype__"]
      : never;
  };
  __items__: Items;
};
export function UnnamedTupleType<Items extends typeutil.tupleOf<BaseType>>(
  items: Items
): UnnamedTupleType<Items> {
  const name = `tuple<${items.map((item) => item.__name__).join(", ")}>`;
  return {
    __kind__: TypeKind.unnamedtuple,
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
  _shape: Shape
): NamedTupleType<Shape> {
  const name = `tuple<${Object.entries(_shape)
    .map(([key, val]) => `${key}: ${val.__name__}`)
    .join(", ")}>`;
  return {
    __kind__: TypeKind.namedtuple,
    __name__: name,
    __shape__: _shape,
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
  T extends BaseObjectType = BaseObjectType,
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

export type setToTsType<Set extends BaseTypeSet> = Set extends makeSet<
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

export type shapeElementToTsType<
  El extends PropertyDesc | LinkDesc
> = El extends PropertyDesc
  ? propToTsType<El>
  : El extends LinkDesc<any, any, any>
  ? linkToTsType<El>
  : never;

export type shapeToTsType<T extends ObjectTypeShape> = string extends keyof T
  ? any
  : typeutil.flatten<
      {
        [k in keyof T]: shapeElementToTsType<T[k]>;
      }
    >;

///////////////////////////////////
// SHAPE VARIANTS
///////////////////////////////////
// export type BaseShapeType = {
//   __root__: ObjectType;
//   __expr__: BaseExpression;
//   __kind__: TypeKind.shape;
//   __name__: string;
//   __tstype__: unknown;
//   __params__: unknown;
//   __polys__: unknown[];
// };

// export type BaseShapeTypeSet<
//   T extends BaseShapeType = BaseShapeType,
//   Card extends Cardinality = Cardinality
// > = TypeSet<T, Card>;

// export type BaseShapeExpression<
//   Type extends BaseShapeType = BaseShapeType
// > = BaseExpression<{
//   __element__: Type;
//   __cardinality__: Cardinality;
// }>;

// type unwrapType<T extends ObjectType | BaseShapeType> = T extends BaseShapeType
//   ? unwrapType<T["__root__"]>
//   : T;

// export interface ShapeType<
//   Expr extends ObjectTypeExpression | BaseShapeExpression =
//     | ObjectTypeExpression
//     | BaseShapeExpression,
//   Params extends any = any,
//   Polys extends Poly[] = Poly[],
//   Root extends BaseObjectType = BaseObjectType
// > {
//   __root__: unwrapType<Expr["__element__"]>;
//   __expr__: Expr;
//   __kind__: TypeKind.shape;
//   __name__: `shape`;
//   __tstype__: computeObjectShape<Expr, Params, Polys>;
//   __params__: Params;
//   __polys__: Polys;
//   // __name__: Name;
// }

///////////////////////////////////
// DISCRIMINATED UNION OF ALL MATERIAL TYPES
///////////////////////////////////

export type MaterialType =
  | ScalarType
  | BaseObjectType
  | UnnamedTupleType
  | NamedTupleType
  | ArrayType;
// | BaseShapeType;
