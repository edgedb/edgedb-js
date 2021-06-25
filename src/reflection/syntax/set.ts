import {
  Cardinality,
  Expression,
  makeSet,
  MaterialType,
  TypeSet,
} from "../typesystem";
import {typeutil} from "../util/typeutil";

import {getSharedParentObject} from "../../../qb/generated/example";
import {mergeCardinalitiesTuple} from "../util/cardinalityUtil";

export type SetExpression<Set extends TypeSet> = Set & {
  __exprs__: Expression<Set>[];
  toEdgeQL(): string;
};

type _getSharedAncestorTupleObject<
  Types extends [any, ...any[]]
> = Types extends [infer U]
  ? U
  : Types extends [infer A, infer B, ...infer Rest]
  ? getSharedParentObject<A, B> extends MaterialType
    ? getSharedAncestorTupleObject<[getSharedParentObject<A, B>, ...Rest]>
    : never
  : never;

type getSharedAncestorTupleObject<
  Types extends [any, ...any[]]
> = _getSharedAncestorTupleObject<Types> extends MaterialType
  ? _getSharedAncestorTupleObject<Types>
  : never;

type getTypesFromExprs<Exprs extends [Expression, ...Expression[]]> = {
  [k in keyof Exprs]: Exprs[k] extends Expression
    ? Exprs[k]["__element__"]
    : never;
};

type getCardsFromExprs<Exprs extends [Expression, ...Expression[]]> = {
  [k in keyof Exprs]: Exprs[k] extends Expression
    ? Exprs[k]["__cardinality__"]
    : never;
};

// export function set<Expr extends Expression>(
//   expr: Expr
// ): SetExpression<makeSet<Expr["__element__"], Expr["__cardinality__"]>> & {
//   toEdgeQL(): string;
//   __exprs__: [Expr];
// };
export function set<Expr extends Expression, Exprs extends [Expr, ...Expr[]]>(
  args: Exprs
): SetExpression<
  makeSet<
    getSharedAncestorTupleObject<getTypesFromExprs<Exprs>>,
    mergeCardinalitiesTuple<getCardsFromExprs<Exprs>>
  >
>;
export function set<Arg extends MaterialType, Args extends [Arg, ...Arg[]]>(
  args: Args
) {
  // TODO
  // requires a runtime representation of implicit cast maps
  return "asdf" as any;
}
