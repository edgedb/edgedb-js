import {
  ArrayType,
  BaseTypeTuple,
  Expression,
  makeSet,
  MaterialType,
  NamedTupleType,
  ObjectType,
  ObjectTypeExpression,
  PrimitiveExpression,
  TypeSet,
  UnnamedTupleType,
  TypeKind,
  PrimitiveType,
} from "../typesystem";

import {getSharedParentScalar} from "../../../qb/generated/example";
import {pathify} from "./paths";
import {mergeCardinalitiesVariadic} from "../util/cardinalityUtil";
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
type getSharedParentPrimitive<A, B> = A extends ArrayType<infer AEl>
  ? B extends ArrayType<infer BEl>
    ? ArrayType<getSharedParentScalar<AEl, BEl>>
    : never
  : A extends NamedTupleType<infer AShape>
  ? B extends NamedTupleType<infer BShape>
    ? NamedTupleType<
        {
          [k in keyof AShape & keyof BShape]: getSharedParentScalar<
            AShape[k],
            BShape[k]
          >;
        }
      >
    : never
  : A extends UnnamedTupleType<infer AItems>
  ? B extends UnnamedTupleType<infer BItems>
    ? mergeTypeTuples<AItems, BItems> extends BaseTypeTuple
      ? UnnamedTupleType<mergeTypeTuples<AItems, BItems>>
      : never
    : never
  : getSharedParentScalar<A, B>;

// type getSharedParentPrimitive<A, B> = {
//   array: ArrayType<getSharedParentScalar<A["__element__"], B>>;
//   never: never;
// }[A extends ArrayType<infer AEl>
//   ? B extends ArrayType<infer BEl>
//     ? "array"
//     : "never"
//   : "never"];
// : A extends NamedTupleType<infer AShape>
// ? B extends NamedTupleType<infer BShape>
//   ? NamedTupleType<mergeTypeTuples<AShape, BShape>>
//   : never
// : A extends UnnamedTupleType<infer AItems>
// ? B extends UnnamedTupleType<infer BItems>
//   ? mergeTypeTuples<AItems, BItems> extends BaseTypeTuple
//     ? UnnamedTupleType<mergeTypeTuples<AItems, BItems>>
//     : never
//   : never
// : getSharedParentScalar<A, B>;

type _getSharedParentPrimitiveVariadic<
  Types extends [any, ...any[]]
> = Types extends [infer U]
  ? U
  : Types extends [infer A, infer B, ...infer Rest]
  ? // this object trick is required to prevent
    // "instantiation is excessively deep"
    {
      istype: _getSharedParentPrimitiveVariadic<
        [getSharedParentPrimitive<A, B>, ...Rest]
      >;
      nev: never;
    }[getSharedParentPrimitive<A, B> extends PrimitiveType ? "istype" : "nev"]
  : never;

export type getSharedParentPrimitiveVariadic<
  Types extends [any, ...any[]]
> = _getSharedParentPrimitiveVariadic<Types> extends MaterialType
  ? _getSharedParentPrimitiveVariadic<Types>
  : never;

// type _getSharedParentScalarVariadic<
//   Types extends [MaterialType, ...MaterialType[]]
// > = Types extends [ U]
//   ? U
//   : Types extends [infer A, infer B, ...infer Rest]
//   ? getSharedParentScalar<A, B> extends MaterialType
//     ? mergeObjectTypesVariadic<[getSharedParentScalar<A, B>, ...Rest]>
//     : never
//   : never;

// type getSharedParentScalarVariadic<
//   Types extends [any, ...any[]]
// > = _getSharedParentScalarVariadic<Types> extends ObjectType
//   ? _getSharedParentScalarVariadic<Types>
//   : never;

type _mergeObjectTypesVariadic<
  Types extends [ObjectType, ...ObjectType[]]
> = Types extends [infer U]
  ? U
  : Types extends [infer A, infer B, ...infer Rest]
  ? A extends ObjectType
    ? B extends ObjectType
      ? mergeObjectTypes<A, B> extends MaterialType
        ? mergeObjectTypesVariadic<[mergeObjectTypes<A, B>, ...Rest]>
        : never
      : never
    : never
  : never;

export type mergeObjectTypesVariadic<
  Types extends [any, ...any[]]
> = _mergeObjectTypesVariadic<Types> extends MaterialType
  ? _mergeObjectTypesVariadic<Types>
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
    mergeObjectTypesVariadic<getTypesFromObjectExprs<Exprs>>,
    mergeCardinalitiesVariadic<getCardsFromExprs<Exprs>>
  >
>;
export function set<
  Expr extends PrimitiveExpression,
  Exprs extends [Expr, ...Expr[]]
>(
  ...exprs: Exprs
): SetExpression<
  makeSet<
    getSharedParentPrimitiveVariadic<getTypesFromExprs<Exprs>>,
    mergeCardinalitiesVariadic<getCardsFromExprs<Exprs>>
  >
>;
export function set(..._exprs: any[]) {
  // if object set
  //   merged objects
  // if primitive
  //   return shared parent of scalars
  const exprs: Expression[] = _exprs;
  if (exprs.every((expr) => expr.__element__.__kind__ === TypeKind.object)) {
    // merge object types;
    return pathify({
      __element__: exprs
        .map((expr) => expr.__element__ as any)
        .reduce(mergeObjectTypes),
      __cardinality__: mergeCardinalitiesVariadic(
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
  if (exprs.every((expr) => expr.__element__.__kind__ !== TypeKind.object)) {
    return {
      __element__: exprs
        .map((expr) => expr.__element__ as any)
        .reduce(getSharedParentScalar),
      __cardinality__: mergeCardinalitiesVariadic(
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
  throw new Error(
    `Invalid arguments to set constructor: ${(_exprs as Expression[])
      .map((expr) => expr.__element__.__name__)
      .join(", ")}`
  );
}
