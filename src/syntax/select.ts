import {$anyint, $bool} from "@generated/modules/std";
import {
  BaseExpression,
  Cardinality,
  ExpressionKind,
  MaterialType,
  objectExprToSelectParams,
  ObjectType,
  ObjectTypeExpression,
  objectTypeToSelectParams,
  Poly,
  ScalarType,
  TypeKind,
  TypeSet,
  util,
} from "reflection";
import {$expr_Literal} from "./literal";
import {$pathify} from "./path";
import {toEdgeQL} from "./toEdgeQL";

// export type $expr_SimpleSelect<
//   Expr extends BaseExpression = BaseExpression
// > =
//   BaseExpression<{
//     __element__: Expr["__element__"];
//     __cardinality__: Expr["__cardinality__"];
//   }> & {
//     __expr__: Expr;
//     __kind__: ExpressionKind.SimpleSelect;
//   };

// filter
// order by
// offset
// limit
export enum ModifierKind {
  filter = "filter",
  order_by = "order_by",
  offset = "offset",
  limit = "limit",
}
export type SelectFilterExpression = BaseExpression<
  TypeSet<$bool, Cardinality>
>;
export type mod_Filter<Expr = SelectFilterExpression> = {
  kind: ModifierKind.filter;
  expr: Expr;
};

export const ASC: "ASC" = "ASC";
export const DESC: "DESC" = "DESC";
export const EMPTY_FIRST: "EMPTY FIRST" = "EMPTY FIRST";
export const EMPTY_LAST: "EMPTY LAST" = "EMPTY LAST";
export type OrderByDirection = "ASC" | "DESC";
export type OrderByEmpty = "EMPTY FIRST" | "EMPTY LAST";
export type OrderByExpression = BaseExpression<
  TypeSet<ScalarType, Cardinality>
>;
export type mod_OrderBy<Expr extends OrderByExpression = OrderByExpression> = {
  kind: ModifierKind.order_by;
  expr: Expr;
  direction: OrderByDirection;
  empty: OrderByEmpty;
};

export type OffsetExpression = BaseExpression<
  TypeSet<$anyint, Cardinality.Empty | Cardinality.One | Cardinality.AtMostOne>
>;
export type mod_Offset<Expr extends OffsetExpression = OffsetExpression> = {
  kind: ModifierKind.offset;
  expr: Expr;
};

export type LimitExpression = BaseExpression<
  TypeSet<$anyint, Cardinality.Empty | Cardinality.One | Cardinality.AtMostOne>
>;
export type mod_Limit<Expr extends OffsetExpression = OffsetExpression> = {
  kind: ModifierKind.limit;
  expr: Expr;
};

export type SelectModifier = mod_Filter | mod_OrderBy | mod_Offset | mod_Limit;

export type $expr_Select<
  Set extends TypeSet = TypeSet,
  Expr extends BaseExpression = BaseExpression,
  Modifier extends SelectModifier | null = SelectModifier | null
  // Params extends object | null,
  // Polys extends Poly[]
> = BaseExpression<Set> & {
  __expr__: Expr;
  __kind__: ExpressionKind.Select;
  __modifier__: Modifier;
} & SelectMethods<{
    __element__: Set["__element__"];
    __cardinality__: Set["__cardinality__"];
    toEdgeQL: () => string;
  }>;

interface SelectMethods<Self extends BaseExpression> {
  // required so `this` passes validation
  // as a BaseExpression
  __element__: Self["__element__"];
  __cardinality__: Self["__cardinality__"];
  toEdgeQL: Self["toEdgeQL"];

  filter<Expr extends SelectFilterExpression>(
    expr: Expr
  ): $expr_Select<
    Expr,
    this,
    {
      kind: ModifierKind.filter;
      expr: Expr;
    }
  >;
  orderBy<Expr extends OrderByExpression>(
    expr: Expr,
    dir?: OrderByDirection,
    empty?: OrderByEmpty
  ): $expr_Select<
    Expr,
    this,
    {
      kind: ModifierKind.order_by;
      expr: Expr;
      direction: OrderByDirection;
      empty: OrderByEmpty;
    }
  >;
  offset<Expr extends OffsetExpression>(
    expr: Expr
  ): $expr_Select<
    Expr,
    this,
    {
      kind: ModifierKind.offset;
      expr: Expr;
    }
  >;
  limit<Expr extends LimitExpression>(
    expr: Expr
  ): $expr_Select<
    {
      __element__: Expr["__element__"];
      __cardinality__: Expr["__element__"]["__tstype__"] extends 0
        ? Cardinality.Empty
        : Expr["__element__"]["__tstype__"] extends 1
        ? Cardinality.AtMostOne
        : Expr["__cardinality__"];
    },
    this,
    {
      kind: ModifierKind.limit;
      expr: Expr;
    }
  >;
}

export function is<
  Expr extends ObjectTypeExpression,
  Params extends objectTypeToSelectParams<Expr["__element__"]>
>(expr: Expr, params: Params): Poly<Expr["__element__"], Params> {
  return {type: expr.__element__, params};
}

function filterFunc(this: any, expr: SelectFilterExpression) {
  return $pathify(
    $selectify({
      __kind__: ExpressionKind.Select,
      __element__: this.__element__,
      __cardinality__: this.__cardinality__,
      __expr__: this,
      __modifier__: {
        kind: ModifierKind.filter,
        expr,
      },
      toEdgeQL,
    })
  );
}

function orderByFunc(
  this: any,
  expr: OrderByExpression,
  dir?: OrderByDirection,
  empty?: OrderByEmpty
) {
  return $pathify(
    $selectify({
      __kind__: ExpressionKind.Select,
      __element__: this.__element__,
      __cardinality__: this.__cardinality__,
      __expr__: this,
      __modifier__: {
        kind: ModifierKind.order_by,
        expr,
        direction: dir || ASC,
        empty: empty || dir === "DESC" ? EMPTY_LAST : EMPTY_FIRST,
      },
      toEdgeQL,
    })
  );
}

function offsetFunc(this: any, expr: OffsetExpression) {
  return $pathify(
    $selectify({
      __kind__: ExpressionKind.Select,
      __element__: this.__element__,
      __cardinality__: this.__cardinality__,
      __expr__: this,
      __modifier__: {
        kind: ModifierKind.offset,
        expr,
      },
      toEdgeQL,
    })
  );
}

function limitFunc(this: any, expr: LimitExpression) {
  let card = this.__cardinality__;
  if ((expr as any).__kind__ === ExpressionKind.Literal) {
    const literalExpr: $expr_Literal = expr as any;
    if (literalExpr.__value__ === 1) {
      card = Cardinality.AtMostOne;
    } else if (literalExpr.__value__ === 0) {
      card = Cardinality.Empty;
    }
  }
  return $pathify(
    $selectify({
      __kind__: ExpressionKind.Select,
      __element__: this.__element__,
      __cardinality__: this.__cardinality__,
      __expr__: this,
      __modifier__: {
        kind: ModifierKind.limit,
        expr,
      },
      toEdgeQL,
    })
  );
}

export function $selectify<Expr extends TypeSet>(expr: Expr) {
  Object.assign(expr, {
    filter: filterFunc.bind(expr),
    orderBy: orderByFunc.bind(expr),
    offset: offsetFunc.bind(expr),
    limit: limitFunc.bind(expr),
  });
  return expr;
}

export function select<Expr extends ObjectTypeExpression>(
  expr: Expr
): $expr_Select<
  {
    __element__: ObjectType<
      `${Expr["__element__"]["__name__"]}_shape`,
      Expr["__element__"]["__shape__"],
      {id: true},
      []
    >;
    __cardinality__: Expr["__cardinality__"];
  },
  Expr,
  null
>;
export function select<Expr extends BaseExpression>(
  expr: Expr
): $expr_Select<Expr, Expr, null>;
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
): $expr_Select<
  {
    __element__: ObjectType<
      `${Expr["__element__"]["__name__"]}_shape`,
      Expr["__element__"]["__shape__"],
      Params,
      Polys
    >;
    __cardinality__: Expr["__cardinality__"];
  },
  Expr,
  null
>;
export function select(expr: BaseExpression, params?: any, ...polys: any[]) {
  if (!params) {
    if (expr.__element__.__kind__ === TypeKind.object) {
      const objectExpr: ObjectTypeExpression = expr as any;
      return $pathify(
        $selectify({
          __kind__: ExpressionKind.Select,
          __element__: {
            __kind__: TypeKind.object,
            __name__: `${objectExpr.__element__.__name__}_shape`,
            __shape__: objectExpr.__element__.__shape__,
            __params__: {id: true},
            __polys__: [],
            __tstype__: undefined as any,
          },
          __cardinality__: objectExpr.__cardinality__,
          __expr__: objectExpr,
          __modifier__: null,
          toEdgeQL,
        })
      );
    } else {
      return $selectify({
        __kind__: ExpressionKind.Select,
        __element__: expr.__element__,
        __cardinality__: expr.__cardinality__,
        __expr__: expr,
        __modifier__: null,
        toEdgeQL,
      });
    }
  }

  const objExpr: ObjectTypeExpression = expr as any;
  return $pathify(
    $selectify({
      __kind__: ExpressionKind.Select,
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
      __modifier__: null,
      toEdgeQL,
    })
  );
}
