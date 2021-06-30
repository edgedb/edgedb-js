import {
  ArrayType,
  BaseTypeTuple,
  Cardinality,
  Expression,
  makeSet,
  MaterialType,
  NamedTupleType,
  ObjectType,
  ObjectTypeExpression,
  PrimitiveType,
  PrimitiveExpression,
  TypeSet,
  UnnamedTupleType,
  TypeKind,
} from "../typesystem";

import {getSharedParentScalar} from "../../../qb/generated/example";
import {pathify} from "./paths";
import {mergeCardinalitiesTuple} from "../util/cardinalityUtil";
import {mergeObjectTypes} from "../hydrate";

export type SetExpression<Set extends TypeSet = TypeSet> = Expression<Set> & {
  __exprs__: Expression<Set>[];
};

type mergeTypeTuples<AItems, BItems> = {
  [k in keyof AItems]: k extends keyof BItems
    ? getSharedParentPrimitive<AItems[k], BItems[k]>
    : never;
};

// find shared parent of two primitives
export type getSharedParentPrimitive<A, B> = A extends ArrayType<infer AEl>
  ? B extends ArrayType<infer BEl>
    ? ArrayType<"asd", getSharedParentScalar<AEl, BEl>>
    : never
  : A extends NamedTupleType<infer AShape>
  ? B extends NamedTupleType<infer BShape>
    ? NamedTupleType<
        "asd",
        {
          [k in keyof AShape & keyof BShape]: getSharedParentPrimitive<
            AShape[k],
            BShape[k]
          >;
        }
      >
    : never
  : A extends UnnamedTupleType<infer AItems>
  ? B extends UnnamedTupleType<infer BItems>
    ? mergeTypeTuples<AItems, BItems> extends BaseTypeTuple
      ? UnnamedTupleType<"adsf", mergeTypeTuples<AItems, BItems>>
      : never
    : never
  : getSharedParentScalar<A, B>;

type _getSharedParentPrimitiveTuple<
  Types extends [any, ...any[]]
> = Types extends [infer U]
  ? U
  : Types extends [infer A, infer B, ...infer Rest]
  ? getSharedParentPrimitive<A, B> extends PrimitiveType
    ? getSharedParentPrimitiveTuple<[getSharedParentPrimitive<A, B>, ...Rest]>
    : never
  : never;

export type getSharedParentPrimitiveTuple<
  Types extends [any, ...any[]]
> = _getSharedParentPrimitiveTuple<Types> extends MaterialType
  ? _getSharedParentPrimitiveTuple<Types>
  : never;

// type _getSharedParentScalarTuple<
//   Types extends [MaterialType, ...MaterialType[]]
// > = Types extends [infer U]
//   ? U
//   : Types extends [infer A, infer B, ...infer Rest]
//   ? getSharedParentScalar<A, B> extends MaterialType
//     ? mergeObjectTypesTuple<[getSharedParentScalar<A, B>, ...Rest]>
//     : never
//   : never;

// type getSharedParentScalarTuple<
//   Types extends [any, ...any[]]
// > = _getSharedParentScalarTuple<Types> extends ObjectType
//   ? _getSharedParentScalarTuple<Types>
//   : never;

type _mergeObjectTypesTuple<
  Types extends [ObjectType, ...ObjectType[]]
> = Types extends [infer U]
  ? U
  : Types extends [infer A, infer B, ...infer Rest]
  ? A extends ObjectType
    ? B extends ObjectType
      ? mergeObjectTypes<A, B> extends MaterialType
        ? mergeObjectTypesTuple<[mergeObjectTypes<A, B>, ...Rest]>
        : never
      : never
    : never
  : never;

export type mergeObjectTypesTuple<
  Types extends [any, ...any[]]
> = _mergeObjectTypesTuple<Types> extends MaterialType
  ? _mergeObjectTypesTuple<Types>
  : never;

type getTypesFromExprs<Exprs extends [Expression, ...Expression[]]> = {
  [k in keyof Exprs]: Exprs[k] extends Expression
    ? Exprs[k]["__element__"]
    : never;
};

type getTypesFromObjectExprs<
  Exprs extends [ObjectTypeExpression, ...ObjectTypeExpression[]]
> = {
  [k in keyof Exprs]: Exprs[k] extends ObjectTypeExpression
    ? Exprs[k]["__element__"]
    : never;
};

type getCardsFromExprs<Exprs extends [Expression, ...Expression[]]> = {
  [k in keyof Exprs]: Exprs[k] extends Expression
    ? Exprs[k]["__cardinality__"]
    : never;
};

export function set<
  Expr extends ObjectTypeExpression,
  Exprs extends [Expr, ...Expr[]]
>(
  ...exprs: Exprs
): SetExpression<
  makeSet<
    mergeObjectTypesTuple<getTypesFromObjectExprs<Exprs>>,
    mergeCardinalitiesTuple<getCardsFromExprs<Exprs>>
  >
>;
export function set<
  Expr extends PrimitiveExpression,
  Exprs extends [Expr, ...Expr[]]
>(
  ...exprs: Exprs
): SetExpression<
  makeSet<
    getSharedParentPrimitiveTuple<getTypesFromExprs<Exprs>>,
    mergeCardinalitiesTuple<getCardsFromExprs<Exprs>>
  >
>;
export function set(..._exprs: any[]) {
  // if object set
  // return set expression with appropriate exprs
  // if scalar
  // return shared parent of scalars
  const exprs: Expression[] = _exprs;
  if (exprs.every((expr) => expr.__element__.__kind__ === TypeKind.object)) {
    // merge object types;
    return pathify({
      __element__: exprs
        .map((expr) => expr.__element__ as any)
        .reduce(mergeObjectTypes),
      __cardinality__: mergeCardinalitiesTuple(
        exprs.map((expr) => expr.__cardinality__) as any
      ),
      toEdgeQL() {
        return `{ ${this.__exprs__
          .map((expr) => expr.toEdgeQL())
          .join(", ")} }`;
      },
      __exprs__: exprs,
    }) as any;
  }

  return {
    __element__: exprs
      .map((expr) => expr.__element__ as any)
      .reduce(getSharedParentScalar),
    __cardinality__: mergeCardinalitiesTuple(
      exprs.map((expr) => expr.__cardinality__) as any
    ),
    toEdgeQL() {
      return `{ ${this.__exprs__
        .map((expr) => expr.toEdgeQL())
        .join(", ")} }`;
    },
    __exprs__: exprs,
  } as SetExpression;
}
