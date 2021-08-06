import {Hero} from "@generated/modules/default";
import _std from "@generated/modules/std";
import {$anyint, $bool, $int64, int64} from "@generated/modules/std";
import {$expr_PathNode} from "@generated/syntax/path";
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
  typeutil,
  util,
} from "reflection";
import {cast} from "./cast";
import {$expr_Operator} from "./funcops";
import {$expr_Literal} from "./literal";
import {$expr_PathLeaf, $pathify} from "./path";
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
} & SelectMethods<Set, Expr>;

// Base is PathNode &
// Filter is equality &
// Filter.args[0] is PathLeaf &
// Filter.args[0] is unique &
// Filter.args[0].parent.__element__ === Base.__element__
export type inferCardinality<
  Base extends TypeSet,
  Filter extends TypeSet
> = Base extends $expr_PathNode
  ? Filter extends $expr_Operator<"std::=", any, [infer P1, any], any>
    ? P1 extends $expr_PathLeaf
      ? P1["__exclusive__"] extends true
        ? typeutil.assertEqual<
            P1["__parent__"]["type"]["__element__"]["__name__"],
            Base["__element__"]["__name__"]
          > extends true
          ? Cardinality.AtMostOne
          : Base["__cardinality__"]
        : Base["__cardinality__"]
      : Base["__cardinality__"]
    : Base["__cardinality__"]
  : Base["__cardinality__"];

interface SelectMethods<Self extends TypeSet, Root extends BaseExpression> {
  // required so `this` passes validation
  // as a BaseExpression
  __element__: Self["__element__"];
  __cardinality__: Self["__cardinality__"];
  toEdgeQL: () => string;

  filter<Expr extends SelectFilterExpression>(
    expr: Expr
  ): $expr_Select<
    {
      __element__: Self["__element__"];
      __cardinality__: inferCardinality<Root, Expr>;
    },
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
    Self,
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
    Self,
    this,
    {
      kind: ModifierKind.offset;
      expr: Expr;
    }
  >;
  offset(expr: number): $expr_Select<
    Self,
    this,
    {
      kind: ModifierKind.offset;
      expr: $expr_Literal<$int64>;
    }
  >;

  limit<Expr extends LimitExpression>(
    expr: Expr
  ): $expr_Select<
    {
      __element__: Self["__element__"];
      __cardinality__: Expr["__element__"]["__tstype__"] extends 0
        ? Cardinality.Empty
        : Expr["__element__"]["__tstype__"] extends 1
        ? Cardinality.AtMostOne
        : Self["__cardinality__"];
    },
    this,
    {
      kind: ModifierKind.limit;
      expr: Expr;
    }
  >;
  limit<Limit extends number>(
    expr: Limit
  ): $expr_Select<
    {
      __element__: Self["__element__"];
      __cardinality__: Limit extends 0
        ? Cardinality.Empty
        : Limit extends 1
        ? Cardinality.AtMostOne
        : Self["__cardinality__"];
    },
    this,
    {
      kind: ModifierKind.limit;
      expr: $expr_Literal<$int64>;
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
  let card = this.__cardinality__;

  // extremely fiddly cardinality inference logic
  const base = this.__expr__;
  const filter: any = expr;
  // Base is PathNode
  if (base.__kind__ === ExpressionKind.PathNode) {
    // Filter is eq
    if (
      filter.__kind__ === ExpressionKind.Operator &&
      filter.__name__ === "std::="
    ) {
      // Filter.args[0] is PathLeaf
      const _arg = filter.__args__[0];
      if (_arg && _arg.__kind__ === ExpressionKind.PathLeaf) {
        const arg: $expr_PathLeaf = _arg;
        // Filter.args[0] is unique
        if (arg.__exclusive__ === true) {
          // Filter.args[0].parent.__element__ === Base.__element__)
          if (
            arg.__parent__.type.__element__.__name__ ===
            base.__element__.__name__
          ) {
            card = Cardinality.AtMostOne;
          }
        }
      }
    }
  }

  return $pathify(
    $selectify({
      __kind__: ExpressionKind.Select,
      __element__: this.__element__,
      __cardinality__: card,
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

function offsetFunc(this: any, expr: OffsetExpression | number) {
  return $pathify(
    $selectify({
      __kind__: ExpressionKind.Select,
      __element__: this.__element__,
      __cardinality__: this.__cardinality__,
      __expr__: this,
      __modifier__: {
        kind: ModifierKind.offset,
        expr: typeof expr === "number" ? int64(expr) : expr,
      },
      toEdgeQL,
    })
  );
}

function limitFunc(this: any, expr: LimitExpression | number) {
  let card = this.__cardinality__;
  if (typeof expr === "number") {
    if (expr === 1) {
      card = Cardinality.AtMostOne;
    } else if (expr === 0) {
      card = Cardinality.Empty;
    }
  }

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
      __cardinality__: card,
      __expr__: this,
      __modifier__: {
        kind: ModifierKind.limit,
        expr: typeof expr === "number" ? int64(expr) : expr,
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
