import {
  BaseExpression,
  BaseShapeExpression,
  BaseShapeType,
  BaseTypeSet,
  computeSelectShape,
  ExpressionKind,
  exprToSelectParams,
  LinkDesc,
  linkToTsType,
  makeSet,
  ObjectType,
  ObjectTypeExpression,
  ObjectTypeShape,
  Poly,
  PropertyDesc,
  propToTsType,
  selectParams,
  setToTsType,
  shapeElementToTsType,
  shapeExprToParams,
  ShapeType,
  simpleShape,
  TypeKind,
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

export type $expr_ShapeSelect<
  Expr extends ObjectTypeExpression | BaseShapeExpression =
    | ObjectTypeExpression
    | BaseShapeExpression,
  Params extends any = {},
  Polys extends Poly[] = []
  // Filters extends BaseExpression[] = BaseExpression[],
  // OrderBys extends OrderBy[] = OrderBy[],
  // Limit extends BaseExpression | null = BaseExpression | null,
  // Offset extends BaseExpression | null = BaseExpression | null
> = BaseExpression<{
  __element__: ShapeType<Expr, Params, Polys>;
  __cardinality__: Expr["__cardinality__"];
}> & {
  __expr__: Expr;
  __kind__: ExpressionKind.ShapeSelect;
  __params__: Params;
  __polys__: Polys;
  // __filters__: Filters;
  // __orderBys__: OrderBys;
  // __limit__: Limit;
  // __offset__: Offset;
  // __tstype__: computeSelectShape<Expr, Params, Polys>;
};

export type $expr_SimpleSelect<
  Expr extends BaseExpression = BaseExpression
> = BaseExpression<{
  __element__: Expr["__element__"];
  __cardinality__: Expr["__cardinality__"];
}> & {
  __expr__: Expr;
  __kind__: ExpressionKind.SimpleSelect;
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
  Params extends selectParams<Expr["__element__"]>
>(expr: Expr, params: Params) {
  return {is: expr, params};
}

export function select<
  Expr extends ObjectTypeExpression | BaseShapeExpression,
  // ShapeExpr extends {__element__: {__root__: OT}},
  // Expr extends {__element__: {__root__: OT}},
  Params extends exprToSelectParams<Expr>
>(
  expr: Expr,
  params: Params
  // ...polys: Polys
): $expr_ShapeSelect<Expr, Params>;
// export function select<
//   Expr extends ObjectTypeExpression,
//   Params extends selectParams<Expr["__element__"]>,
//   PolyExpr extends ObjectTypeExpression,
//   Polys extends Poly<PolyExpr>[]
// >(
//   expr: Expr,
//   params: Params,
//   ...polys: Polys
// ): $expr_ShapeSelect<Expr, Params, Polys>;
export function select<Expr extends ObjectTypeExpression>(
  expr: Expr
): $expr_ShapeSelect<Expr, {id: true}, []>;
export function select<Expr extends BaseExpression>(
  expr: Expr
): $expr_SimpleSelect<Expr>;
// export function select<
//   Expr extends BaseShapeExpression,
//   Params extends shapeExprToParams<Expr>
//   // PolyExpr extends ObjectTypeExpression,
//   // Polys extends Poly<PolyExpr>[]
// >(
//   expr: Expr,
//   params: Params
//   // ...polys: Polys
// ): Params; //$expr_ShapeSelect<Expr, Params>;
export function select(expr: any, params?: any, ...polys: any[]) {
  if (!params) {
    return $pathify({
      __element__: (expr as ObjectTypeExpression).__element__,
      __cardinality__: (expr as ObjectTypeExpression).__cardinality__,
      __expr__: expr,
      __kind__: ExpressionKind.SimpleSelect,
      toEdgeQL,
    }) as any;
  }
  return $pathify({
    // __root__: (expr as ObjectTypeExpression).__element__,
    __element__: {
      __root__: (expr as ObjectTypeExpression).__element__,
      __expr__: expr,
      __kind__: TypeKind.shape,
      __name__: expr,
      __params__: params,
      __polys__: polys,
    } as any, //
    __cardinality__: (expr as ObjectTypeExpression).__cardinality__,
    __expr__: expr,
    __kind__: ExpressionKind.ShapeSelect,
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
//             ? typeutil.flatten<BaseShape
// & simpleShape<P["is"], P["params"]>>
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
