// primitive branded types
// https://medium.com/@KevinBGreene/surviving-the-typescript-ecosystem-branding-and-type-tagging-6cf6e516523d

export type AnyType = {
  __istype: true;
  name: string;
  castable: AnyType[];
};
export const AnyType: AnyType = {
  __istype: true,
  castable: [],
  get name() {
    throw new Error("Cannot get name of abstract type.");
    return "";
  },
} as any;

export type Str = AnyType & {__str: true};
export const Str: Str = {...AnyType, __str: true, castable: [], name: "str"};
export type Bool = AnyType & {__bool: true};
export const Bool: Bool = {
  ...AnyType,
  __bool: true,
  castable: [],
  name: "bool",
};
export type Decimal = AnyType & {__decimal: true};
export const Decimal: Decimal = {
  ...AnyType,
  __decimal: true,
  castable: [],
  name: "decimal",
};
export type Float64 = AnyType & {__float64: true};
export const Float64: Float64 = {
  ...Decimal,
  __float64: true,
  castable: [Decimal],
  name: "float64",
};
export type Float32 = Float64 & {__float32: true};
export const Float32: Float32 = {
  ...Float64,
  __float32: true,
  castable: [Float64],
  name: "float32",
};
export type EBigInt = Decimal & {__bigint: true};
export const EBigInt: EBigInt = {
  ...Decimal,
  __bigint: true,
  castable: [Decimal],
  name: "bigint",
};
export type Int64 = EBigInt & Float64 & {__int64: true};
export const Int64: Int64 = {
  ...EBigInt,
  ...Float64,
  __int64: true,
  castable: [EBigInt, Float64],
  name: "int64",
} as any;
export type Int32 = Int64 & {__int32: true};
export const Int32: Int32 = {
  ...Int64,
  __int32: true,
  castable: [Int64],
  name: "int32",
};
export type Int16 = Int32 & {__int16: true};
export const Int16: Int16 = {
  ...Int32,
  __int16: true,
  castable: [Int32],
  name: "int16",
};

export type Scalars =
  | Int16
  | Int32
  | Int64
  | Float32
  | Float64
  | EBigInt
  | Decimal
  | Str
  | Bool;

export type PrimitivesNoArray = Scalars | ETuple;
export type Primitives = Scalars | ETuple | EArray<any>;

export type EArray<El extends PrimitivesNoArray> = AnyType & {
  __array: true;
  __element: El;
};

export const EArray = <El extends PrimitivesNoArray>(el: El): EArray<El> =>
  ({
    __istype: true,
    __array: true,
    __element: el,
    get name() {
      return `array<${this.__element.name}>`;
    },
    castable: [],
  } as any);

export type ETupleArgs = [AnyType, ...AnyType[]] | [];
export type ETuple = AnyType & {__tuple: true};

export type EUnnamedTuple<Items extends ETupleArgs> = ETuple & {
  __unnamedtuple: true;
  __items: Items;
};
export const EUnnamedTuple = <Items extends ETupleArgs>(
  items: Items
): EUnnamedTuple<Items> => ({
  __istype: true,
  __tuple: true,
  __unnamedtuple: true,
  __items: items,
  get name() {
    return `tuple<${items.map((el) => el.name).join(", ")}>`;
  },
  castable: [],
});

export type ENamedTupleItems = {[k: string]: AnyType};
export type ENamedTuple<Items extends ENamedTupleItems> = AnyType & {
  __tuple: true;
  __namedtuple: true;
  __items: Items;
};
export const ENamedTuple = <Items extends ENamedTupleItems>(
  items: Items
): ENamedTuple<Items> => ({
  __istype: true,
  __tuple: true,
  __namedtuple: true,
  __items: items,
  get name() {
    return `tuple<${Object.keys(items)
      .map((k) => items[k].name)
      .join(", ")}>`;
  },
  castable: [],
});

export {};
