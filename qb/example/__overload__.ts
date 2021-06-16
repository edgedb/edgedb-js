import {reflection as $} from "edgedb";
import * as types from "./__typesystem__";

const mytuple = types.EUnnamedTuple([
  types.Int16,
  types.Int32,
  types.Decimal,
  types.EArray(types.Str),
]);
console.log(mytuple.name);

const mynamedtuple = types.EUnnamedTuple([
  types.Int16,
  types.Int32,
  types.Decimal,
  types.EArray(types.Str),
]);
console.log(mynamedtuple.name);

type AnyTuple = [any, ...any[]] | [];
type getSharedAncestorElementwise<A extends AnyTuple, B extends AnyTuple> = {
  [k in keyof A]: k extends keyof B ? getSharedAncestor<A[k], B[k]> : never;
};

type tuplesAreSameLength<
  A extends AnyTuple,
  B extends AnyTuple
> = keyof A extends keyof B ? (keyof B extends keyof A ? true : false) : false;
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
  : A extends types.EArray<infer AType>
  ? B extends types.EArray<infer BType>
    ? getSharedAncestor<AType, BType> extends types.PrimitivesNoArray
      ? types.EArray<getSharedAncestor<AType, BType>>
      : never
    : never
  : A extends types.ENamedTuple<infer AShape>
  ? B extends types.ENamedTuple<infer BShape>
    ? objectsHaveSameKeys<AShape, BShape> extends true
      ? types.ENamedTuple<
          {
            [k in keyof AShape & keyof BShape]: getSharedAncestor<
              AShape[k],
              BShape[k]
            >;
          }
        >
      : never
    : never
  : A extends types.EUnnamedTuple<infer AItems>
  ? B extends types.EUnnamedTuple<infer BItems>
    ? tuplesAreSameLength<AItems, BItems> extends true
      ? getSharedAncestorElementwise<AItems, BItems> extends types.ETupleArgs
        ? types.EUnnamedTuple<getSharedAncestorElementwise<AItems, BItems>>
        : never
      : never
    : never
  : never;

type getSharedAncestorVariadic<Types extends [any, ...any[]]> = Types extends [
  infer U
]
  ? U
  : Types extends [infer A, infer B, ...infer Rest]
  ? getSharedAncestor<A, B> extends types.AnyType
    ? getSharedAncestorVariadic<[getSharedAncestor<A, B>, ...Rest]>
    : never
  : never;

type AnyTypeTuple = [types.AnyType, ...types.AnyType[]];
type ETupleTuple = [types.ETuple, ...types.ETuple[]];
// type EUnnamedTupleTuple = [EUnnamedTuple<any>, ...EUnnamedTuple<any>[]];
// type ENamedTupleTuple = [ENamedTuple<any>, ...ENamedTuple<any>[]];
type EArrayTuple = [types.EArray<any>, ...types.EArray<any>[]];
type AnyTypeContainer = ETupleTuple | EArrayTuple;

// function infer<Tuples extends TupleTuples>(...args: Tuples): getSharedAncestorVariadic<Args>; // fork case
function infer<T extends types.AnyType>(...args: T[]): T;
function infer(...args: types.Float64[]): types.Float64; // fork case
// function infer<Tuples extends ETupleTuple>(
//   ...args: Tuples
// ): getSharedAncestorVariadic<Tuples>;
// function infer<Arrays extends EArrayTuple>(
//   ...args: Arrays
// ): getSharedAncestorVariadic<Arrays>;
function infer<Items extends AnyTypeContainer>(
  ...args: Items
): getSharedAncestorVariadic<Items>;
function infer<Args extends AnyTypeTuple>(
  ...args: Args
): getSharedAncestorVariadic<Args>;
function infer(...args: any) {
  return args as any;
}

const t0 = infer(types.Int64, types.Str);
const f0: $.typeutil.assertEqual<never, typeof t0> = true;
const t8 = infer(types.Float64, types.Decimal);
const f8: $.typeutil.assertEqual<types.Decimal, typeof t4> = true;
const t1 = infer(types.EBigInt, types.Int64);
const f1: $.typeutil.assertEqual<types.EBigInt, typeof t1> = true;
const t2 = infer(types.Int64, types.Float64);
const f2: $.typeutil.assertEqual<types.Float64, typeof t2> = true;
const t3 = infer(types.Int64, types.Float32);
const f3: $.typeutil.assertEqual<types.Float64, typeof t3> = true;
const t4 = infer(types.Int64, types.Decimal);
const f4: $.typeutil.assertEqual<types.Decimal, typeof t4> = true;
const t5 = infer(types.EArray(types.Int64), types.EArray(types.Float32));
const f5: $.typeutil.assertEqual<
  types.EArray<types.Float64>,
  typeof t5
> = true;
const t6 = infer(
  types.EUnnamedTuple([types.Int64, types.Int32]),
  types.EUnnamedTuple([types.Float32, types.Int16])
);
const f6: $.typeutil.assertEqual<
  types.EUnnamedTuple<[types.Float64, types.Int32]>,
  typeof t6
> = true;
const t7 = infer(
  types.ENamedTuple({arg1: types.Int64, arg2: types.Float32}),
  types.ENamedTuple({arg1: types.Float32, arg2: types.Decimal})
);
const f7: $.typeutil.assertEqual<
  types.ENamedTuple<{
    arg1: types.Float64;
    arg2: never;
  }>,
  typeof t7
> = true;

[f1, f2, f3, f4, f5, f6, f7];
