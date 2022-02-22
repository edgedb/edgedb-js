import type {
  ArrayType,
  BaseTypeTuple,
  BaseType,
  NamedTupleType,
  ObjectTypeSet,
  TypeSet,
  TupleType,
  Expression,
  ExpressionKind,
  mergeObjectTypes,
  ObjectType,
  Cardinality,
  getPrimitiveBaseType,
} from "../reflection";

// "@generated/" path gets replaced during generation step
// @ts-ignore
import {getSharedParentScalar} from "../castMaps";

// @ts-ignore
export {set} from "./setImpl";

export type $expr_Set<Set extends LooseTypeSet = LooseTypeSet> = Expression<{
  __element__: Set["__element__"];
  __cardinality__: Set["__cardinality__"];
  __exprs__: Expression<Set>[];
  __kind__: ExpressionKind.Set;
}>;

type mergeTypeTuples<AItems, BItems> = {
  [k in keyof AItems]: k extends keyof BItems
    ? getSharedParentPrimitive<AItems[k], BItems[k]>
    : never;
};

// find shared parent of two primitives
export type getSharedParentPrimitive<A, B> = A extends undefined
  ? B extends undefined
    ? undefined
    : B
  : B extends undefined
  ? A
  : A extends ArrayType<infer AEl>
  ? B extends ArrayType<infer BEl>
    ? ArrayType<getSharedParentScalar<AEl, BEl>>
    : never
  : A extends NamedTupleType<infer AShape>
  ? B extends NamedTupleType<infer BShape>
    ? NamedTupleType<{
        [k in keyof AShape & keyof BShape]: getSharedParentScalar<
          AShape[k],
          BShape[k]
        >;
      }>
    : never
  : A extends TupleType<infer AItems>
  ? B extends TupleType<infer BItems>
    ? mergeTypeTuples<AItems, BItems> extends BaseTypeTuple
      ? TupleType<mergeTypeTuples<AItems, BItems>>
      : never
    : never
  : getSharedParentScalar<A, B>;

type _getSharedParentPrimitiveVariadic<Types extends [any, ...any[]]> =
  Types extends [infer U]
    ? U
    : Types extends [infer A, infer B, ...infer Rest]
    ? _getSharedParentPrimitiveVariadic<
        [getSharedParentPrimitive<A, B>, ...Rest]
      >
    : never;

export type getSharedParentPrimitiveVariadic<Types extends [any, ...any[]]> =
  _getSharedParentPrimitiveVariadic<Types>;

export type LooseTypeSet<
  T extends any = any,
  C extends Cardinality = Cardinality
> = {
  __element__: T;
  __cardinality__: C;
};

export type {mergeObjectTypes};

type _mergeObjectTypesVariadic<Types extends [ObjectType, ...ObjectType[]]> =
  Types extends [infer U]
    ? U
    : Types extends [infer A, infer B, ...infer Rest]
    ? A extends ObjectType
      ? B extends ObjectType
        ? mergeObjectTypes<A, B> extends BaseType
          ? mergeObjectTypesVariadic<[mergeObjectTypes<A, B>, ...Rest]>
          : never
        : never
      : never
    : never;

export type mergeObjectTypesVariadic<Types extends [any, ...any[]]> =
  _mergeObjectTypesVariadic<Types>;

export type getTypesFromExprs<Exprs extends [TypeSet, ...TypeSet[]]> = {
  [k in keyof Exprs]: Exprs[k] extends TypeSet<infer El, any>
    ? getPrimitiveBaseType<El>
    : never;
};

export type getTypesFromObjectExprs<
  Exprs extends [ObjectTypeSet, ...ObjectTypeSet[]]
> = {
  [k in keyof Exprs]: Exprs[k] extends TypeSet<infer El, any> ? El : never;
};

export type getCardsFromExprs<Exprs extends [TypeSet, ...TypeSet[]]> = {
  [k in keyof Exprs]: Exprs[k] extends TypeSet<any, infer Card> ? Card : never;
};
