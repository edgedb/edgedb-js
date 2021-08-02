import {
  BaseExpression,
  ExpressionKind,
  objectExprToSelectParams,
  ObjectType,
  ObjectTypeExpression,
  objectTypeToSelectParams,
  Poly,
  TypeKind,
} from "reflection";
import {$pathify} from "./path";

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

export type $expr_SimpleSelect<
  Expr extends BaseExpression = BaseExpression
> = BaseExpression<{
  __element__: Expr["__element__"];
  __cardinality__: Expr["__cardinality__"];
}> & {
  __expr__: Expr;
  __kind__: ExpressionKind.SimpleSelect;
};

export type $expr_ShapeSelect<
  Expr extends ObjectTypeExpression,
  Params extends object | null,
  Polys extends Poly[]
> = BaseExpression<{
  __element__: ObjectType<
    `${Expr["__element__"]["__name__"]}_shape`,
    Expr["__element__"]["__shape__"],
    Params,
    Polys
  >;
  __cardinality__: Expr["__cardinality__"];
}> & {
  __expr__: Expr;
  __kind__: ExpressionKind.ShapeSelect;
};

export function is<
  Expr extends ObjectTypeExpression,
  Params extends objectTypeToSelectParams<Expr["__element__"]>
>(expr: Expr, params: Params): Poly<Expr["__element__"], Params> {
  return {type: expr.__element__, params};
}

export function select<Expr extends ObjectTypeExpression>(
  expr: Expr
): $expr_ShapeSelect<Expr, {id: true}, []>;
export function select<Expr extends BaseExpression>(
  expr: Expr
): $expr_SimpleSelect<Expr>;
export function select<
  Expr extends ObjectTypeExpression,
  Params extends objectExprToSelectParams<Expr>,
  // variadic inference doesn't work properly
  // if additional constraints are placed on Polys
  Polys extends any[]
>(
  expr: Expr,
  params: Params,
  ...polys: Polys
): $expr_ShapeSelect<Expr, Params, Polys>;
export function select(expr: BaseExpression, params?: any, ...polys: any[]) {
  if (!params) {
    if (expr.__element__.__kind__ === TypeKind.object) {
      const objectExpr: ObjectTypeExpression = expr as any;
      let defaultParams = {id: true};
      let defaultPolys = [];

      // if another select expression is passed into select
      // its shape is inherited
      if ((objectExpr as any).__kind__ === ExpressionKind.ShapeSelect) {
        const selectExpr: $expr_ShapeSelect<any, any, any> = objectExpr as any;
        defaultParams = selectExpr.__element__.__params__;
        defaultPolys = selectExpr.__element__.__polys__;
      }

      return $pathify({
        __kind__: ExpressionKind.ShapeSelect,
        __element__: {
          __kind__: TypeKind.object,
          __name__: `${objectExpr.__element__.__name__}_shape`,
          __shape__: objectExpr.__element__.__shape__,
          __params__: defaultParams,
          __polys__: defaultPolys,
          __tstype__: undefined as any,
        },
        __cardinality__: objectExpr.__cardinality__,
        __expr__: objectExpr,
      }) as any;
    } else {
      return {
        __kind__: ExpressionKind.SimpleSelect,
        __element__: expr.__element__,
        __cardinality__: expr.__cardinality__,
        __expr__: expr,
      };
    }
  }

  const objExpr: ObjectTypeExpression = expr as any;
  return $pathify({
    __kind__: ExpressionKind.ShapeSelect,
    __element__: {
      __kind__: TypeKind.object,
      __name__: `${objExpr.__element__.__name__}_shape`,
      __shape__: objExpr.__element__.__shape__,
      __params__: params,
      __polys__: polys,
      __tstype__: undefined as any,
    },
    __cardinality__: objExpr.__cardinality__,
    __expr__: expr,
  });
}
