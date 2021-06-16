// primitive branded types
// https://medium.com/@KevinBGreene/surviving-the-typescript-ecosystem-branding-and-type-tagging-6cf6e516523d
import {reflection as $} from "edgedb";
namespace types {
  type AnyTypeTuple = [AnyType<unknown, any>, ...AnyType<unknown, any>[]] | [];
  const ANYTYPE: unique symbol = Symbol("std::anytype");
  export type AnyType<T, Castable extends AnyTypeTuple> = {
    [ANYTYPE]: true;
    __tstype: T;
    name: string;
    castable: Castable;
  };

  const STR: unique symbol = Symbol("std::str");
  export type Str = AnyType<string, []> & {[STR]: true};
  export const Str: Str = {[STR]: true, castable: [], name: "str"} as any;

  const BOOL: unique symbol = Symbol("std::bool");
  export type Bool = AnyType<boolean, []> & {[BOOL]: true};
  export const Bool: Bool = {
    [BOOL]: true,
    castable: [],
    name: "bool",
  } as any;

  const DECIMAL: unique symbol = Symbol("std::decimal");
  export type Decimal = AnyType<never, []> & {[DECIMAL]: true};
  export const Decimal: Decimal = {
    [DECIMAL]: true,
    castable: [],
    name: "decimal",
  } as any;

  export type Float64 = AnyType<number, [Decimal]> & {__float64: true};
  export const Float64: Float64 = {
    __float64: true,
    castable: [Decimal],
    name: "float64",
  } as any;

  export type Float32 = AnyType<number, [Float64]> & {__float32: true};
  export const Float32: Float32 = {
    __float32: true,
    castable: [Float64],
    name: "float32",
  } as any;

  export type EBigInt = AnyType<bigint, [Decimal]> & {__bigint: true};
  export const EBigInt: EBigInt = {
    __bigint: true,
    castable: [Decimal],
    name: "bigint",
  } as any;
  export type Int64 = AnyType<number, [Float64]> & {__int64: true};
  export const Int64: Int64 = {
    __int64: true,
    castable: [EBigInt, Float64],
    name: "int64",
  } as any;
  export type Int32 = AnyType<number, [Int64]> & {__int32: true};
  export const Int32: Int32 = {
    __int32: true,
    castable: [Int64],
    name: "int32",
  } as any;
  export type Int16 = AnyType<number, [Int32]> & {__int16: true};
  export const Int16: Int16 = {
    __int16: true,
    castable: [Int32],
    name: "int16",
  } as any;
}
// type tuplesAreSameLength<
//   A extends AnyTuple,
//   B extends AnyTuple
// > = keyof A extends keyof B ? (keyof B extends keyof A ? true : false) : false;
type objectsHaveSameKeys<
  A extends object,
  B extends object
> = keyof A extends keyof B ? (keyof B extends keyof A ? true : false) : false;

type getSharedAncestor<A, B> = A extends B
  ? B
  : B extends A
  ? A
  : A extends types.Float64
  ? B extends types.Float64
    ? types.Float64
    : never
  : // : A extends types.EArray<infer AType>
    // ? B extends types.EArray<infer BType>
    //   ? getSharedAncestor<AType, BType> extends types.PrimitivesNoArray
    //     ? types.EArray<getSharedAncestor<AType, BType>>
    //     : never
    //   : never
    // : A extends types.ENamedTuple<infer AShape>
    // ? B extends types.ENamedTuple<infer BShape>
    //   ? objectsHaveSameKeys<AShape, BShape> extends true
    //     ? types.ENamedTuple<
    //         {
    //           [k in keyof AShape & keyof BShape]: getSharedAncestor<
    //             AShape[k],
    //             BShape[k]
    //           >;
    //         }
    //       >
    //     : never
    //   : never
    // : A extends types.EUnnamedTuple<infer AItems>
    // ? B extends types.EUnnamedTuple<infer BItems>
    //   ? tuplesAreSameLength<AItems, BItems> extends true
    //     ? getSharedAncestorElementwise<AItems, BItems> extends types.ETupleArgs
    //       ? types.EUnnamedTuple<getSharedAncestorElementwise<AItems, BItems>>
    //       : never
    //     : never
    //   : never
    never;

type getSharedAncestorVariadic<Types extends [any, ...any[]]> = Types extends [
  infer U
]
  ? U
  : Types extends [infer A, infer B, ...infer Rest]
  ? getSharedAncestor<A, B> extends types.AnyType<any, any>
    ? getSharedAncestorVariadic<[getSharedAncestor<A, B>, ...Rest]>
    : never
  : never;

// function infer<T extends AnyType<any>>(...args: T[]): T;
// function infer(...args: types.Float64[]): types.Float64; // fork case
// function infer<Tuples extends ETupleTuple>(
//   ...args: Tuples
// ): getSharedAncestorVariadic<Tuples>;
// function infer<Arrays extends EArrayTuple>(
//   ...args: Arrays
// ): getSharedAncestorVariadic<Arrays>;
type AnyAnyType = types.AnyType<any, any>;
function infer<Items extends [AnyAnyType, ...AnyAnyType[]]>(
  ...args: Items
): getSharedAncestorVariadic<Items>;
// function infer<Args extends AnyTypeTuple>(...args: Args): getSharedAncestorVariadic<Args>;
function infer(...args: any) {
  return args as any;
}

const t0 = infer(types.Float32, types.Float64);
const f0: $.typeutil.assertEqual<types.Float64, typeof t0> = true;
// const t1 = infer(types.EBigInt, types.Int64);
// const f1: $.typeutil.assertEqual<types.EBigInt, typeof t1> = true;
// const t2 = infer(types.Int64, types.Float64);
// const f2: $.typeutil.assertEqual<types.Float64, typeof t2> = true;
// const t3 = infer(types.Int64, types.Float32);
// const f3: $.typeutil.assertEqual<types.Float64, typeof t3> = true;
// const t4 = infer(types.Int64, types.Decimal);
// const f4: $.typeutil.assertEqual<types.Decimal, typeof t4> = true;
// const t5 = infer(types.EArray(types.Int64), types.EArray(types.Float32));
// const f5: $.typeutil.assertEqual<
//   types.EArray<types.Float64>,
//   typeof t5
// > = true;
// const t6 = infer(
//   types.EUnnamedTuple([types.Int64, types.Int32]),
//   types.EUnnamedTuple([types.Float32, types.Int16])
// );
// const f6: $.typeutil.assertEqual<
//   types.EUnnamedTuple<[types.Float64, types.Int32]>,
//   typeof t6
// > = true;
// const t7 = infer(
//   types.ENamedTuple({arg1: types.Int64, arg2: types.Float32}),
//   types.ENamedTuple({arg1: types.Float32, arg2: types.Decimal})
// );
// const f7: $.typeutil.assertEqual<
//   types.ENamedTuple<{
//     arg1: types.Float64;
//     arg2: never;
//   }>,
//   typeof t7
// > = true;

export {};
