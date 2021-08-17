// no runtime imports
import type {$expr_TypeIntersection, $pathify} from "../syntax/path";
import type {literal} from "../syntax/literal";
import type {typeutil} from "./util/typeutil";
import {Cardinality, ExpressionKind, TypeKind} from "./enums";

//////////////////
// BASE TYPES
//////////////////

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

export interface ScalarType<
  Name extends string = string,
  TsType extends any = any,
  TsConstType extends TsType = TsType
> {
  __kind__: TypeKind.scalar;
  __tstype__: TsType;
  __tsconsttype__: TsConstType;
  __name__: Name;
  <T extends TsType = TsType>(val: T): literal<ScalarType<Name, TsType, T>>;
}

export interface EnumType<
  Name extends string = string,
  TsType extends any = any,
  Vals extends any = any
> {
  __kind__: TypeKind.enum;
  __tstype__: TsType;
  __name__: Name;
  (val: TsType | Vals): literal<this>;
}

//////////////////
// OBJECT TYPES
//////////////////
// export type SomeObjectType = ObjectType;

export type SomeObjectType = {
  __kind__: TypeKind.object;
  __tstype__: unknown;
  __name__: string;
  __shape__: ObjectTypeShape;
  __params__: object | null;
  __polys__: Poly[];
};

export interface ObjectType<
  Name extends string = string,
  Shape extends ObjectTypeShape = ObjectTypeShape,
  Params extends object | null = any,
  Polys extends Poly[] = any[]
> {
  __kind__: TypeKind.object;
  // __tstype__: computeObjectShape<Shape, Params, Polys>;
  __tstype__: testComputeObjectShape<Shape, Params, Polys>;
  __name__: Name;
  __shape__: Shape;
  __params__: Params;
  __polys__: Polys;
}

export type objectExprToSelectParams<T extends ObjectTypeExpression> =
  shapeToSelectParams<T["__element__"]["__shape__"]>;

export type objectTypeToSelectParams<T extends SomeObjectType> =
  shapeToSelectParams<T["__shape__"]>;

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

export type testComputeObjectShape<
  Shape extends ObjectTypeShape,
  Params extends object | null,
  Polys extends Poly[]
> = string extends keyof Shape // checks if Shape is actually defined
  ? any
  : isEqual<Params, object | null> extends true
  ? any
  : isEqual<Polys, Poly[]> extends true
  ? any
  : isEqual<Params, null> extends true
  ? any
  : testShapeWithPolysToTs<Shape, Params, Polys>;

export type testShapeWithPolysToTs<
  Shape extends ObjectTypeShape,
  Params extends object | null,
  Polys extends Poly[]
> = testSimpleShapeToTs<Shape, Params> &
  unionToIntersection<
    Polys[number] extends infer P
      ? P extends Poly
        ? Partial<testSimpleShapeToTs<P["type"]["__shape__"], P["params"]>>
        : never
      : never
  >;

export type testSimpleShapeToTs<
  Shape extends ObjectTypeShape,
  Params
> = typeutil.flatten<
  {
    [k in keyof Params]: Params[k] extends infer Param
      ? [k] extends [keyof Shape]
        ? [Param] extends [true]
          ? shapeElementToTsTypeSimple<Shape[k]>
          : [Param] extends [false]
          ? never
          : [Param] extends [boolean]
          ? shapeElementToTsType<Shape[k]> | undefined
          : Param extends TypeSet
          ? setToTsType<Param>
          : Param extends object
          ? Shape[k]["target"] extends SomeObjectType
            ? testSimpleShapeToTs<Shape[k]["target"]["__shape__"], Param>
            : never
          : never
        : Param extends TypeSet
        ? setToTsType<Param>
        : never
      : never;
  }
>;

export type computeObjectShape<
  Shape extends ObjectTypeShape,
  Params extends object | null,
  Polys extends Poly[]
> = string extends keyof Shape // checks if Shape is actually defined
  ? any
  : isEqual<Params, object | null> extends true
  ? any
  : isEqual<Polys, Poly[]> extends true
  ? any
  : isEqual<Params, null> extends true
  ? any
  : shapeWithPolysToTs<Shape, Params, Polys>;

type unionToIntersection<U> = (
  U extends any ? (k: U) => void : never
) extends (k: infer I) => void
  ? I
  : never;

export type shapeWithPolysToTs<
  Shape extends ObjectTypeShape,
  Params extends object | null,
  Polys extends Poly[]
> = simpleShapeToTs<Shape, Params> &
  unionToIntersection<
    Polys[number] extends infer P
      ? P extends Poly
        ? Partial<simpleShapeToTs<P["type"]["__shape__"], P["params"]>>
        : never
      : never
  >;

export type simpleShapeToTs<
  Shape extends ObjectTypeShape,
  Params
> = typeutil.flatten<
  {
    [k in keyof Params]: Params[k] extends infer Param
      ? k extends keyof Shape
        ? Param extends true
          ? shapeElementToTsTypeSimple<Shape[k]>
          : Param extends false
          ? never
          : Param extends boolean
          ? shapeElementToTsType<Shape[k]> | undefined
          : Param extends TypeSet
          ? setToTsType<Param>
          : Param extends object
          ? Shape[k]["target"] extends SomeObjectType
            ? simpleShapeToTs<Shape[k]["target"]["__shape__"], Param>
            : never
          : never
        : Param extends TypeSet
        ? setToTsType<Param>
        : never
      : never;
  }
>;

export type shapeElementToTsTypeSimple<El extends PropertyDesc | LinkDesc> =
  El extends PropertyDesc
    ? propToTsType<El>
    : El extends LinkDesc<any, any, any, any>
    ? {id: string}
    : never;

export type Poly<
  Type extends SomeObjectType = SomeObjectType,
  Params extends any = any
> = {
  type: Type;
  params: Params;
};
export type AnyPoly = {type: any; params: any};

////////////////////
// SETS AND EXPRESSIONS
////////////////////

export interface TypeSet<
  T extends MaterialType = MaterialType,
  Card extends Cardinality = Cardinality
> {
  __element__: T;
  __cardinality__: Card;
}

// utlity function for creating set
export function $toSet<Root extends MaterialType, Card extends Cardinality>(
  root: Root,
  card: Card
): TypeSet<Root, Card> {
  return {
    __element__: root,
    __cardinality__: card,
  };
}

export type BaseExpression<Set extends TypeSet = TypeSet> = {
  __element__: Set["__element__"];
  __cardinality__: Set["__cardinality__"];
  // __kind__: ExpressionKind;
  toEdgeQL(): string;
};

export type Expression<Set extends TypeSet = TypeSet> = Set &
  ExpressionMethods<{
    __element__: Set["__element__"];
    __cardinality__: Set["__cardinality__"];
  }> &
  $pathify<Set>;

// importing the actual alias from
// generated/modules/std didn't work.
// returned 'any' every time
// export type $assertSingle<Type extends MaterialType, Args> = Expression<{
//   __element__: Type;
//   __cardinality__: Cardinality.One;
//   __kind__: ExpressionKind.Function;
//   __name__: "std::assert_single";
//   __args__: Args;
//   __namedargs__: {};
// }>;

export interface ExpressionMethods<Set extends TypeSet> {
  __element__: Set["__element__"];
  __cardinality__: Set["__cardinality__"];
  toEdgeQL(): string;
  $is<T extends ObjectTypeExpression>(ixn: T): $expr_TypeIntersection<this, T>;
  // $assertSingle(): $assertSingle<Set["__element__"], [this]>;
}

export type MaterialTypeSet<
  T extends MaterialType = MaterialType,
  Card extends Cardinality = Cardinality
> = TypeSet<T, Card>;

export type ObjectTypeSet<
  T extends SomeObjectType = SomeObjectType,
  Card extends Cardinality = Cardinality
> = TypeSet<T, Card>;

export type ObjectTypeExpression<Set extends ObjectTypeSet = ObjectTypeSet> =
  Expression<Set>;

export type PrimitiveType =
  | ScalarType
  | EnumType
  | TupleType
  | NamedTupleType
  | ArrayType;

export type PrimitiveTypeSet<
  T extends PrimitiveType = PrimitiveType,
  Card extends Cardinality = Cardinality
> = TypeSet<T, Card>;

export type PrimitiveExpression<
  Set extends PrimitiveTypeSet = PrimitiveTypeSet
> = Expression<Set>;

/////////////////////////
/// COLLECTION TYPES
/////////////////////////
export type ArrayType<
  Element extends NonArrayMaterialType = NonArrayMaterialType,
  Name extends string = `array<${Element["__name__"]}>`
> = {
  __name__: Name;
  __kind__: TypeKind.array;
  __tstype__: Array<Element["__tstype__"]>;
  __element__: Element;
};

export function ArrayType<Element extends NonArrayMaterialType>(
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

type PropertyTypes =
  | ScalarType
  | EnumType
  | ArrayType
  | TupleType
  | NamedTupleType;
export interface PropertyDesc<
  Type extends PropertyTypes = PropertyTypes,
  Card extends Cardinality = Cardinality,
  Exclusive extends boolean = boolean
> {
  __kind__: "property";
  target: Type;
  cardinality: Card;
  exclusive: Exclusive;
}

export type PropertyShape = {
  [k: string]: PropertyDesc;
};

export interface LinkDesc<
  Type extends SomeObjectType = SomeObjectType,
  Card extends Cardinality = Cardinality,
  LinkProps extends PropertyShape = PropertyShape,
  Exclusive extends boolean = boolean
> {
  __kind__: "link";
  target: Type;
  cardinality: Card;
  properties: LinkProps;
  exclusive: Exclusive;
}

export type ObjectTypeShape = {
  [k: string]: PropertyDesc | LinkDesc;
};

/////////////////////
/// TSTYPE HELPERS
/////////////////////

type TypeToTsType<Type extends BaseType> = Type extends ScalarType
  ? Type["__tsconsttype__"]
  : Type["__tstype__"];

export type setToTsType<Set extends TypeSet> =
  Set["__cardinality__"] extends Cardinality.Empty
    ? null
    : Set["__cardinality__"] extends Cardinality.One
    ? TypeToTsType<Set["__element__"]>
    : Set["__cardinality__"] extends Cardinality.AtLeastOne
    ? [TypeToTsType<Set["__element__"]>, ...TypeToTsType<Set["__element__"]>[]]
    : Set["__cardinality__"] extends Cardinality.AtMostOne
    ? TypeToTsType<Set["__element__"]> | null
    : Set["__cardinality__"] extends Cardinality.Many
    ? TypeToTsType<Set["__element__"]>[]
    : never;

export type propToTsType<Prop extends PropertyDesc> =
  Prop extends PropertyDesc<infer Type, infer Card>
    ? setToTsType<TypeSet<Type, Card>>
    : never;

export type linkToTsType<Link extends LinkDesc<any, any, any, any>> =
  Link extends LinkDesc<infer Type, infer Card, any>
    ? setToTsType<TypeSet<Type, Card>>
    : never;

export type shapeElementToTsType<El extends PropertyDesc | LinkDesc> =
  El extends PropertyDesc
    ? propToTsType<El>
    : El extends LinkDesc<any, any, any, any>
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
// DISCRIMINATED UNION OF ALL MATERIAL TYPES
///////////////////////////////////

export type MaterialType =
  | ScalarType
  | EnumType
  | ObjectType
  | TupleType
  | NamedTupleType
  | ArrayType;

export type NonArrayMaterialType =
  | ScalarType
  | EnumType
  | ObjectType
  | TupleType
  | NamedTupleType;

export type AnyTupleType = TupleType | NamedTupleType;
