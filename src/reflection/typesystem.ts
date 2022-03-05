import type {Executor} from "../ifaces";
import type {$expr_TypeIntersection, $pathify, $expr_PathNode} from "./path";
import type {$expr_Literal} from "./literal";
import type {$expr_Operator} from "./funcops";
import type {typeutil} from "./util/typeutil";
import {Cardinality, ExpressionKind, OperatorKind, TypeKind} from "./enums";
import {cardinalityUtil} from "./util/cardinalityUtil";

//////////////////
// BASETYPE
//////////////////

export interface BaseType {
  __kind__: TypeKind;
  __name__: string;
}
export type BaseTypeSet = {
  __element__: BaseType;
  __cardinality__: Cardinality;
};
export type BaseTypeTuple = typeutil.tupleOf<BaseType>;

//////////////////
// SCALARTYPE
//////////////////

export interface ScalarType<
  Name extends string = string,
  TsType extends any = any,
  Castable extends boolean = boolean,
  TsConstType extends TsType = TsType
> extends BaseType {
  __kind__: TypeKind.scalar;
  __tstype__: TsType;
  __tsconsttype__: TsConstType;
  __castable__: Castable;
  __name__: Name;
}

export type scalarTypeWithConstructor<
  S extends ScalarType,
  ExtraTsTypes extends any = never
> = S & {
  // tslint:disable-next-line
  <T extends S["__tstype__"] | ExtraTsTypes>(val: T): $expr_Literal<
    ScalarType<
      S["__name__"],
      S["__tstype__"],
      S["__castable__"],
      T extends S["__tstype__"] ? T : S["__tstype__"]
    >
  >;
};
// export type scalarTypeWithConstructor<
//   Root extends ScalarType,
//   ExtraTsTypes extends any = never,
//   ConstructorType extends ScalarType = Root
// > = Root & {
//   // tslint:disable-next-line
//   <T extends ConstructorType["__tstype__"] | ExtraTsTypes>(
//     val: T
//   ): $expr_Literal<
//     ScalarType<
//       ConstructorType["__name__"],
//       ConstructorType["__tstype__"],
//       ConstructorType["__castable__"],
//       T extends ConstructorType["__tstype__"]
//         ? T
//         : ConstructorType["__tstype__"]
//     >
//   >;
// };

// export interface CastOnlyScalarType<
//   Name extends string = string,
//   CastType extends ScalarType = ScalarType
// > extends BaseType {
//   __kind__: TypeKind.castonlyscalar;
//   __name__: Name;
//   __casttype__: CastType;
// }

type $jsonDestructure<Set extends TypeSet> =
  Set["__element__"] extends ScalarType<"std::json">
    ? {
        [path: string]: $expr_Operator<
          "[]",
          OperatorKind.Infix,
          [Set, TypeSet],
          TypeSet<Set["__element__"], Set["__cardinality__"]>
        >;
      } & {
        destructure<T extends TypeSet<ScalarType<"std::str">> | string>(
          path: T
        ): $expr_Operator<
          "[]",
          OperatorKind.Infix,
          [Set, TypeSet],
          TypeSet<
            Set["__element__"],
            cardinalityUtil.multiplyCardinalities<
              Set["__cardinality__"],
              T extends TypeSet ? T["__cardinality__"] : Cardinality.One
            >
          >
        >;
      }
    : unknown;

////////////////////
// SETS AND EXPRESSIONS
////////////////////

export interface TypeSet<
  T extends BaseType = BaseType,
  Card extends Cardinality = Cardinality
> {
  __element__: T;
  __cardinality__: Card;
}

// utility function for creating set
export function $toSet<Root extends BaseType, Card extends Cardinality>(
  root: Root,
  card: Card
): TypeSet<Root, Card> {
  return {
    __element__: root,
    __cardinality__: card,
  };
}

export type Expression<
  Set extends TypeSet = TypeSet,
  Runnable extends boolean = true
> = Set &
  (BaseType extends Set["__element__"] // short-circuit non-specific types
    ? {
        run(cxn: Executor): any;
        toEdgeQL(): string;
        is: any;
        assert_single: any;
        // warning: any;
      }
    : $pathify<Set> &
        ExpressionMethods<stripSet<Set>> &
        (Runnable extends true
          ? {run(cxn: Executor): Promise<setToTsType<Set>>}
          : {}) &
        $tuplePathify<Set> &
        $arrayLikeIndexify<Set> &
        $jsonDestructure<Set>);

export type stripSet<T> = "__element__" extends keyof T
  ? "__cardinality__" extends keyof T
    ? {
        __element__: T["__element__"];
        __cardinality__: T["__cardinality__"];
      }
    : T
  : T;

// export type stripSet<T> = T extends {__element__: any; __cardinality__: any}
//   ? {
//       __element__: T["__element__"];
//       __cardinality__: T["__cardinality__"];
//     }
//   : any;

export type stripSetShape<T> = {
  [k in keyof T]: stripSet<T[k]>;
};

// importing the actual alias from
// generated/modules/std didn't work.
// returned 'any' every time
export type assert_single<Expr extends TypeSet> = Expression<{
  __element__: Expr["__element__"];
  __cardinality__: cardinalityUtil.overrideUpperBound<
    Expr["__cardinality__"],
    "One"
  >;
  __kind__: ExpressionKind.Function;
  __name__: "std::assert_single";
  __args__: [TypeSet]; // discard wrapped expression
  __namedargs__: {};
}>;

export type ExpressionMethods<Set extends TypeSet> = {
  toEdgeQL(): string;

  is<T extends ObjectTypeSet>(
    ixn: T
  ): $expr_TypeIntersection<
    {__cardinality__: Set["__cardinality__"]; __element__: Set["__element__"]},
    // might cause performance issues
    ObjectType<
      T["__element__"]["__name__"],
      T["__element__"]["__pointers__"],
      {id: true}
    >
  >;
  assert_single(): assert_single<stripSet<Set>>;
};

//////////////////
// ENUMTYPE
//////////////////
export interface EnumType<
  Name extends string = string,
  TsType extends any = any
> extends BaseType {
  __kind__: TypeKind.enum;
  __tstype__: TsType;
  __name__: Name;
  // (val: TsType | Vals): $expr_Literal<this>;
}

//////////////////
// OBJECTTYPE
//////////////////

export type ObjectTypeSet = TypeSet<ObjectType, Cardinality>;
export type ObjectTypeExpression = TypeSet<ObjectType, Cardinality>;

export interface ObjectType<
  Name extends string = string,
  Pointers extends ObjectTypePointers = ObjectTypePointers,
  Shape extends object | null = any
  // Polys extends Poly[] = any[]
> extends BaseType {
  __kind__: TypeKind.object;
  __name__: Name;
  __pointers__: Pointers;
  __shape__: Shape;
}

export type PropertyTypes =
  | ScalarType
  | EnumType
  | ArrayType
  | TupleType
  | NamedTupleType;

export interface PropertyDesc<
  Type extends BaseType = BaseType,
  Card extends Cardinality = Cardinality,
  Exclusive extends boolean = boolean,
  Computed extends boolean = boolean,
  Readonly extends boolean = boolean,
  HasDefault extends boolean = boolean
> {
  __kind__: "property";
  target: Type;
  cardinality: Card;
  exclusive: Exclusive;
  computed: Computed;
  readonly: Readonly;
  hasDefault: HasDefault;
}

export type $scopify<Type extends ObjectType> = $expr_PathNode<
  TypeSet<Type, Cardinality.One>,
  null,
  true // exclusivity
>;

export type PropertyShape = {
  [k: string]: PropertyDesc;
};

export interface LinkDesc<
  Type extends ObjectType = any,
  Card extends Cardinality = Cardinality,
  LinkProps extends PropertyShape = any,
  Exclusive extends boolean = boolean,
  Computed extends boolean = boolean,
  Readonly extends boolean = boolean,
  HasDefault extends boolean = boolean
> {
  __kind__: "link";
  target: Type;
  cardinality: Card;
  properties: LinkProps;
  exclusive: Exclusive;
  computed: Computed;
  readonly: Readonly;
  hasDefault: HasDefault;
}

export type ObjectTypePointers = {
  [k: string]: PropertyDesc | LinkDesc;
};

export type stripBacklinks<T extends ObjectTypePointers> = {
  [k in keyof T]: k extends `<${string}` ? never : T[k];
};

export type omitBacklinks<T extends string | number | symbol> =
  T extends `<${string}` ? never : T extends string ? T : never;

export type stripNonUpdateables<T extends ObjectTypePointers> = {
  [k in keyof T]: [T[k]["computed"]] extends [true]
    ? never
    : [T[k]["readonly"]] extends [true]
    ? never
    : k extends "__type__"
    ? never
    : k extends "id"
    ? never
    : T[k];
};

export type stripNonInsertables<T extends ObjectTypePointers> = {
  [k in keyof T]: [T[k]["computed"]] extends [true]
    ? never
    : [k] extends ["__type__"]
    ? never
    : [k] extends ["id"]
    ? never
    : T[k];
};

type shapeElementToTs<Pointer extends PropertyDesc | LinkDesc, Element> = [
  Element
] extends [true]
  ? pointerToTsType<Pointer>
  : [Element] extends [false]
  ? never
  : [Element] extends [boolean]
  ? pointerToTsType<Pointer> | undefined
  : Element extends TypeSet
  ? setToTsType<TypeSet<Element["__element__"], Pointer["cardinality"]>>
  : Pointer extends LinkDesc
  ? Element extends object
    ? computeTsTypeCard<
        computeObjectShape<
          Pointer["target"]["__pointers__"] & Pointer["properties"],
          Element
        >,
        Pointer["cardinality"]
      >
    : never
  : never;

// Element extends (scope: any) => any
// ? Pointer["target"] extends ObjectType
//   ? computeObjectShape<
//       Pointer["target"]["__pointers__"],
//       ReturnType<Element>
//     >
//   : never
// : Element extends object
// ? Pointer["target"] extends ObjectType
//   ? computeObjectShape<Pointer["target"]["__pointers__"], Element>
//   : never
// : never;

export type $expr_PolyShapeElement<
  PolyType extends ObjectTypeSet = ObjectTypeSet,
  ShapeElement extends any = any
> = {
  __kind__: ExpressionKind.PolyShapeElement;
  __polyType__: PolyType;
  __shapeElement__: ShapeElement;
};

export type computeObjectShape<
  Pointers extends ObjectTypePointers,
  Shape
> = typeutil.flatten<
  keyof Shape extends never
    ? {id: string}
    : {
        [k in keyof Shape]: Shape[k] extends $expr_PolyShapeElement<
          infer PolyType,
          infer ShapeEl
        >
          ? [k] extends [keyof PolyType["__element__"]["__pointers__"]]
            ? shapeElementToTs<
                PolyType["__element__"]["__pointers__"][k],
                ShapeEl
              > | null
            : never
          : [k] extends [keyof Pointers]
          ? shapeElementToTs<Pointers[k], Shape[k]>
          : Shape[k] extends TypeSet
          ? setToTsType<Shape[k]>
          : never;
      }
>;

export type pointerToTsTypeSimple<El extends PropertyDesc | LinkDesc> =
  El extends PropertyDesc
    ? propToTsType<El>
    : El extends LinkDesc<any, any, any, any>
    ? {id: string}
    : never;

export type PrimitiveType =
  | ScalarType
  | EnumType
  | TupleType
  | NamedTupleType
  | ArrayType;

export type PrimitiveTypeSet = TypeSet<PrimitiveType, Cardinality>;

/////////////////////////
/// ARRAYTYPE
/////////////////////////

type $arrayLikeIndexify<Set extends TypeSet> = Set["__element__"] extends
  | ArrayType
  | ScalarType<"std::str">
  | ScalarType<"std::bytes">
  ? {
      [index: number]: $expr_Operator<
        "[]",
        OperatorKind.Infix,
        [Set, TypeSet],
        TypeSet<
          getPrimitiveBaseType<
            Set["__element__"] extends ArrayType
              ? Set["__element__"]["__element__"]
              : Set["__element__"]
          >,
          Set["__cardinality__"]
        >
      >;
      [slice: `${number}:${number | ""}` | `:${number}`]: $expr_Operator<
        "[]",
        OperatorKind.Infix,
        [Set, TypeSet],
        TypeSet<
          getPrimitiveBaseType<Set["__element__"]>,
          Set["__cardinality__"]
        >
      >;
      index<T extends TypeSet<ScalarType<"std::number">> | number>(
        index: T
      ): $expr_Operator<
        "[]",
        OperatorKind.Infix,
        [Set, TypeSet],
        TypeSet<
          getPrimitiveBaseType<
            Set["__element__"] extends ArrayType
              ? Set["__element__"]["__element__"]
              : Set["__element__"]
          >,
          cardinalityUtil.multiplyCardinalities<
            Set["__cardinality__"],
            T extends TypeSet ? T["__cardinality__"] : Cardinality.One
          >
        >
      >;
      slice<
        S extends TypeSet<ScalarType<"std::number">> | number,
        E extends
          | TypeSet<ScalarType<"std::number">>
          | number
          | undefined
          | null
      >(
        start: S,
        end: E
      ): $expr_Operator<
        "[]",
        OperatorKind.Infix,
        [Set, TypeSet],
        TypeSet<
          getPrimitiveBaseType<Set["__element__"]>,
          cardinalityUtil.multiplyCardinalities<
            cardinalityUtil.multiplyCardinalities<
              Set["__cardinality__"],
              S extends TypeSet ? S["__cardinality__"] : Cardinality.One
            >,
            E extends TypeSet ? E["__cardinality__"] : Cardinality.One
          >
        >
      >;
      slice<
        E extends
          | TypeSet<ScalarType<"std::number">>
          | number
          | undefined
          | null
      >(
        start: undefined | null,
        end: E
      ): $expr_Operator<
        "[]",
        OperatorKind.Infix,
        [Set, TypeSet],
        TypeSet<
          getPrimitiveBaseType<Set["__element__"]>,
          cardinalityUtil.multiplyCardinalities<
            Set["__cardinality__"],
            E extends TypeSet ? E["__cardinality__"] : Cardinality.One
          >
        >
      >;
    }
  : unknown;

export type $expr_Array<
  Type extends ArrayType = ArrayType,
  Card extends Cardinality = Cardinality
  // Items extends typeutil.tupleOf<TypeSet<Type>>
> = Expression<{
  __kind__: ExpressionKind.Array;
  __items__: typeutil.tupleOf<TypeSet<Type["__element__"]>>;
  __element__: Type;
  __cardinality__: Card;
}>;

export interface ArrayType<
  Element extends NonArrayType = NonArrayType,
  Name extends string = `array<${Element["__name__"]}>`
> extends BaseType {
  __name__: Name;
  __kind__: TypeKind.array;
  __element__: Element;
}

type ArrayTypeToTsType<Type extends ArrayType> = BaseTypeToTsType<
  Type["__element__"]
>[];

/////////////////////////
/// TUPLE TYPE
/////////////////////////

type $tuplePathify<Set extends TypeSet> = Set["__element__"] extends TupleType
  ? addTuplePaths<Set["__element__"]["__items__"], Set["__cardinality__"]>
  : Set["__element__"] extends NamedTupleType
  ? addNamedTuplePaths<Set["__element__"]["__shape__"], Set["__cardinality__"]>
  : unknown;

export type $expr_TuplePath<
  ItemType extends BaseType = BaseType,
  ParentCard extends Cardinality = Cardinality
> = Expression<{
  __kind__: ExpressionKind.TuplePath;
  __element__: ItemType;
  __cardinality__: ParentCard;
  __parent__: $expr_Tuple | $expr_NamedTuple | $expr_TuplePath;
  __index__: string | number;
}>;

export type baseTupleElementsToTupleType<T extends typeutil.tupleOf<TypeSet>> =
  {
    [k in keyof T]: T[k] extends TypeSet
      ? getPrimitiveBaseType<T[k]["__element__"]>
      : never;
  };
export type tupleElementsToTupleType<T extends typeutil.tupleOf<TypeSet>> =
  baseTupleElementsToTupleType<T> extends BaseTypeTuple
    ? TupleType<baseTupleElementsToTupleType<T>>
    : never;

export type baseTupleElementsToCardTuple<T> = {
  [k in keyof T]: T[k] extends TypeSet<any, infer C> ? C : never;
};

export type tupleElementsToCardTuple<T> =
  baseTupleElementsToCardTuple<T> extends [Cardinality, ...Cardinality[]]
    ? baseTupleElementsToCardTuple<T>
    : never;

export type $expr_Tuple<
  Items extends typeutil.tupleOf<TypeSet> = typeutil.tupleOf<TypeSet>
> = Expression<{
  __kind__: ExpressionKind.Tuple;
  __items__: Items;
  __element__: tupleElementsToTupleType<Items>;
  __cardinality__: cardinalityUtil.multiplyCardinalitiesVariadic<
    tupleElementsToCardTuple<Items>
  >;
}>;

export type indexKeys<T> = T extends `${number}` ? T : never;

type addTuplePaths<
  Items extends BaseType[],
  ParentCard extends Cardinality
> = {
  [k in indexKeys<keyof Items>]: Items[k] extends BaseType
    ? $expr_TuplePath<Items[k], ParentCard>
    : never;
};

export interface TupleType<Items extends BaseTypeTuple = BaseTypeTuple>
  extends BaseType {
  __name__: string;
  __kind__: TypeKind.tuple;
  __items__: Items;
}

type TupleItemsToTsType<Items extends BaseTypeTuple> = {
  [k in keyof Items]: Items[k] extends BaseType
    ? BaseTypeToTsType<Items[k]>
    : never;
};

/////////////////////////
/// NAMED TUPLE TYPE
/////////////////////////
type literalShapeToType<T extends NamedTupleLiteralShape> = NamedTupleType<{
  [k in keyof T]: getPrimitiveBaseType<T[k]["__element__"]>;
}>;
type shapeCardinalities<Shape extends NamedTupleLiteralShape> =
  Shape[keyof Shape]["__cardinality__"];
type inferNamedTupleCardinality<Shape extends NamedTupleLiteralShape> = [
  Cardinality.Many
] extends [shapeCardinalities<Shape>]
  ? Cardinality.Many
  : [Cardinality.Empty] extends [shapeCardinalities<Shape>]
  ? Cardinality.Empty
  : [shapeCardinalities<Shape>] extends [Cardinality.AtMostOne]
  ? Cardinality.AtMostOne
  : [shapeCardinalities<Shape>] extends [
      Cardinality.AtMostOne | Cardinality.One
    ]
  ? Cardinality.One
  : Cardinality.Many;

export type $expr_NamedTuple<
  Shape extends NamedTupleLiteralShape = NamedTupleLiteralShape
> = Expression<{
  __kind__: ExpressionKind.NamedTuple;
  __element__: literalShapeToType<Shape>;
  __cardinality__: inferNamedTupleCardinality<Shape>;
  __shape__: Shape;
}>;

type addNamedTuplePaths<
  Shape extends NamedTupleShape,
  ParentCard extends Cardinality
> = {
  [k in keyof Shape]: Shape[k] extends BaseType
    ? $expr_TuplePath<Shape[k], ParentCard>
    : never;
};

export type NamedTupleLiteralShape = {[k: string]: TypeSet};
export type NamedTupleShape = {[k: string]: BaseType};
export interface NamedTupleType<
  Shape extends NamedTupleShape = NamedTupleShape
> extends BaseType {
  __name__: string;
  __kind__: TypeKind.namedtuple;
  __shape__: Shape;
}

type NamedTupleTypeToTsType<Type extends NamedTupleType> = {
  [k in keyof Type["__shape__"]]: BaseTypeToTsType<Type["__shape__"][k]>;
};

/////////////////////
/// TSTYPE COMPUTATION
/////////////////////

export type BaseTypeToTsType<Type extends BaseType> = typeutil.flatten<
  Type extends ScalarType
    ? Type["__tsconsttype__"]
    : // Type extends CastOnlyScalarType
    // ? Type["__casttype__"]["__tsconsttype__"]
    // :
    Type extends EnumType
    ? Type["__tstype__"]
    : Type extends ArrayType<any>
    ? ArrayTypeToTsType<Type>
    : Type extends TupleType
    ? TupleItemsToTsType<Type["__items__"]>
    : Type extends NamedTupleType
    ? NamedTupleTypeToTsType<Type>
    : Type extends ObjectType
    ? computeObjectShape<Type["__pointers__"], Type["__shape__"]>
    : never
>;

export type setToTsType<Set extends TypeSet> = computeTsType<
  Set["__element__"],
  Set["__cardinality__"]
>;

export type computeTsTypeCard<
  T extends any,
  C extends Cardinality
> = Cardinality extends C
  ? unknown
  : C extends Cardinality.Empty
  ? null
  : C extends Cardinality.One
  ? T
  : C extends Cardinality.AtLeastOne
  ? [T, ...T[]]
  : C extends Cardinality.AtMostOne
  ? T | null
  : C extends Cardinality.Many
  ? T[]
  : C extends Cardinality
  ? unknown
  : never;

export type computeTsType<
  T extends BaseType,
  C extends Cardinality
> = BaseType extends T ? unknown : computeTsTypeCard<BaseTypeToTsType<T>, C>;

export type propToTsType<Prop extends PropertyDesc> =
  Prop extends PropertyDesc<infer Type, infer Card>
    ? setToTsType<TypeSet<Type, Card>>
    : never;

export type linkToTsType<Link extends LinkDesc> = computeTsType<
  Link["target"],
  Link["cardinality"]
>;

export type pointerToTsType<El extends PropertyDesc | LinkDesc> =
  El extends PropertyDesc
    ? propToTsType<El>
    : El extends LinkDesc<any, any, any, any>
    ? linkToTsType<El>
    : never;

///////////////////
// TYPE HELPERS
///////////////////

export type getPrimitiveBaseType<T extends BaseType> = T extends ScalarType
  ? ScalarType<T["__name__"], T["__tstype__"], T["__castable__"]>
  : T;

export type getPrimitiveNonArrayBaseType<T extends BaseType> =
  T extends NonArrayType ? getPrimitiveBaseType<T> : never;

export function isScalarType(type: BaseType): type is ScalarType {
  return type.__kind__ === TypeKind.scalar;
}
export function isEnumType(type: BaseType): type is EnumType {
  return type.__kind__ === TypeKind.enum;
}
export function isObjectType(type: BaseType): type is ObjectType {
  return type.__kind__ === TypeKind.object;
}
export function isTupleType(type: BaseType): type is TupleType {
  return type.__kind__ === TypeKind.tuple;
}
export function isNamedTupleType(type: BaseType): type is NamedTupleType {
  return type.__kind__ === TypeKind.namedtuple;
}
export function isArrayType(type: BaseType): type is ArrayType {
  return type.__kind__ === TypeKind.array;
}

export type CastableScalarType = ScalarType<string, any, true>;
// | CastOnlyScalarType;

export type NonArrayType =
  | ScalarType
  | EnumType
  | ObjectType
  | TupleType
  | NamedTupleType;

export type CastableNonArrayType =
  | CastableScalarType
  | EnumType
  | ObjectType
  | TupleType
  | NamedTupleType;

export type AnyTupleType = TupleType | NamedTupleType;

export type CastableArrayType = ArrayType<CastableNonArrayType>;

export type unwrapCastableType<T> =
  // T extends CastOnlyScalarType
  //   ? T["__casttype__"]
  //   :
  T extends CastableArrayType
    ? ArrayType<unwrapCastableType<T["__element__"]>>
    : T;

export type ParamType =
  | CastableScalarType
  | ArrayType<
      | CastableScalarType
      | TupleType<typeutil.tupleOf<ParamType>>
      | NamedTupleType<{[k: string]: ParamType}>
    >
  | TupleType<typeutil.tupleOf<ParamType>>
  | NamedTupleType<{[k: string]: ParamType}>;
