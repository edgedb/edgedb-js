import {
  BaseExpression,
  BaseShapeType,
  BaseTypeSet,
  computeSelectShape,
  ExpressionKind,
  LinkDesc,
  linkToTsType,
  ObjectType,
  ObjectTypeExpression,
  ObjectTypeShape,
  Poly,
  PropertyDesc,
  propToTsType,
  selectParams,
  setToTsType,
  shapeElementToTsType,
  ShapeType,
  simpleShape,
  TypeSet,
  typeutil,
} from "reflection";
import {$pathify} from "./path";
import {toEdgeQL} from "./toEdgeQL";

// simple select
// object type select
export enum OrderByDirection {
  ASC = "ASC",
  DESC = "DESC",
}

export enum OrderByEmpty {
  FIRST = "FIRST",
  Last = "Last",
}

type OrderBy = {
  expression: BaseExpression;
  direction: OrderByDirection | null;
  empty: OrderByEmpty | null;
};

export type BaseSelect<Expr extends BaseExpression = BaseExpression> = Expr & {
  __expr__: Expr;
  __kind__: ExpressionKind.Select;
};

// type asdlfkjasdf = selectParams<BaseExpression>;
export type $expr_Select<
  Expr extends BaseExpression = BaseExpression,
  Params extends selectParams<Expr> = selectParams<Expr>,
  Polys extends Poly[] = any[]
  // Filters extends BaseExpression[] = BaseExpression[],
  // OrderBys extends OrderBy[] = OrderBy[],
  // Limit extends BaseExpression | null = BaseExpression | null,
  // Offset extends BaseExpression | null = BaseExpression | null
> = BaseExpression<{
  __element__: ShapeType<Expr, Params, Polys>;
  __cardinality__: Expr["__cardinality__"];
}> & {
  __expr__: Expr;
  __kind__: ExpressionKind.Select;
  __params__: Params;
  __polys__: Polys;
  // __filters__: Filters;
  // __orderBys__: OrderBys;
  // __limit__: Limit;
  // __offset__: Offset;
  // __tstype__: computeSelectShape<Expr, Params, Polys>;
};

// type mergeObjects<A, B> = typeutil.flatten<A & B>;
// type mergeObjectsVariadic<T> = T extends []
//   ? never
//   : T extends [infer U]
//   ? U
//   : T extends [infer A, infer B, ...infer Rest]
//   ? mergeObjectsVariadic<[mergeObjects<A, B>, ...Rest]>
//   : never;

export function shape<
  Expr extends ObjectTypeExpression,
  Params extends selectParams<Expr>
>(expr: Expr, params: Params) {
  return {is: expr, params};
}

// export function select<Expr extends ObjectTypeExpression>(
//   expr: Expr
// ): $expr_Select<Expr, {id: true}, []>;
// export function select<Expr extends BaseExpression>(
//   expr: Expr
// ): $expr_Select<Expr, {}, []>;
export function select<
  Expr extends BaseExpression,
  Params extends selectParams<Expr>,
  PolyExpr extends ObjectTypeExpression,
  Polys extends Poly<PolyExpr>[]
>(
  expr: Expr,
  params: Params,
  ...polys: Polys
): $expr_Select<Expr, Params, Polys>;
export function select(expr: any, params?: any, ...polys: any[]) {
  return $pathify({
    __element__: (expr as ObjectTypeExpression).__element__,
    __cardinality__: (expr as ObjectTypeExpression).__cardinality__,
    __expr__: expr,
    __kind__: ExpressionKind.Select,
    __params__: params,
    __polys__: polys || [],
    toEdgeQL,
  }) as any;
}

// export type testComputeSelectShape<
//   Expr extends BaseExpression = BaseExpression,
//   Params extends selectParams<Expr> = selectParams<Expr>,
//   Polys extends Poly[] = Poly[]
// > =
//   // if expr is shapeexpression, go deeper
//   Expr["__element__"] extends BaseShapeType
//     ? testComputeSelectShape<Expr["__element__"]["__expr__"], Params, Polys>
//     : [undefined] extends [Params]
//     ? {id: true} extends infer Default
//       ? Default extends selectParams<Expr>
//         ? computeSelectShape<Expr, Default, Polys>
//         : never
//       : never
//     : Expr extends infer U
//     ? U extends ObjectTypeExpression
//       ? simpleShape<U, Params> extends infer BaseShape
//         ? Polys extends []
//           ? BaseShape
//           : Polys[number] extends infer P
//           ? P extends Poly
//             ? typeutil.flatten<BaseShape & simpleShape<P["is"], P["params"]>>
//             : unknown
//           : unknown
//         : never
//       : setToTsType<Expr>
//     : never;

// export function testselect<
//   Expr extends BaseExpression,
//   Params extends selectParams<Expr>,
//   PolyExpr extends ObjectTypeExpression,
//   Polys extends Poly<PolyExpr>[]
// >(
//   expr: Expr,
//   params?: Params,
//   ...polys: Polys
// ): testComputeSelectShape<Expr, Params, Polys>;
// export function testselect(expr: any, params: any, ...polys: any[]) {
//   return $pathify({
//     __element__: (expr as ObjectTypeExpression).__element__,
//     __cardinality__: (expr as ObjectTypeExpression).__cardinality__,
//     __expr__: expr,
//     __kind__: ExpressionKind.Select,
//     __params__: params,
//     __polys__: polys || [],
//     toEdgeQL,
//   }) as any;
// }
