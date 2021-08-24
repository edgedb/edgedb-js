import * as edgedb from "edgedb";

import {
  Expression,
  Cardinality,
  ExpressionKind,
  objectExprToSelectParams,
  ObjectType,
  ObjectTypeExpression,
  objectTypeToSelectParams,
  Poly,
  ScalarType,
  TypeKind,
  TypeSet,
  typeutil,
  SelectModifierKind,
  setToTsType,
  ObjectTypeSet,
  PropertyDesc,
  LinkDesc,
  ObjectTypeShape,
  assignableCardinality,
  ArrayType,
  TupleType,
  NamedTupleType,
  MaterialType,
  BaseTypeTuple,
  NonArrayMaterialType,
  SomeObjectType,
  BaseType,
} from "reflection";
import {$expr_Operator} from "./funcops";
import {$expr_Literal} from "./literal";
import {
  $expr_PathLeaf,
  $expr_PathNode,
  $expressionify,
  PathParent,
} from "./path";
import _std from "@generated/modules/std";
import type {$anyint, $bool, $int64} from "@generated/modules/std";
import {FreeObject} from "@generated/modules/std";
import {Movie} from "@generated/modules/default";
import {scalarAssignableBy} from "@generated/castMaps";

// filter
// order by
// offset
// limit

export type SelectFilterExpression = TypeSet<$bool, Cardinality>;
export type mod_Filter<Expr = SelectFilterExpression> = {
  kind: SelectModifierKind.filter;
  expr: Expr;
};

export const ASC: "ASC" = "ASC";
export const DESC: "DESC" = "DESC";
export const EMPTY_FIRST: "EMPTY FIRST" = "EMPTY FIRST";
export const EMPTY_LAST: "EMPTY LAST" = "EMPTY LAST";
export type OrderByDirection = "ASC" | "DESC";
export type OrderByEmpty = "EMPTY FIRST" | "EMPTY LAST";
export type OrderByExpression = TypeSet<ScalarType, Cardinality>;
export type mod_OrderBy<Expr extends OrderByExpression = OrderByExpression> = {
  kind: SelectModifierKind.order_by;
  expr: Expr;
  direction: OrderByDirection;
  empty: OrderByEmpty;
};

export type OffsetExpression = TypeSet<
  $anyint,
  Cardinality.Empty | Cardinality.One | Cardinality.AtMostOne
>;

export type mod_Offset<Expr extends OffsetExpression = OffsetExpression> = {
  kind: SelectModifierKind.offset;
  expr: Expr;
};

export type LimitExpression = TypeSet<
  $anyint,
  Cardinality.Empty | Cardinality.One | Cardinality.AtMostOne
>;
export type mod_Limit<Expr extends OffsetExpression = OffsetExpression> = {
  kind: SelectModifierKind.limit;
  expr: Expr;
};

export type SelectModifier = mod_Filter | mod_OrderBy | mod_Offset | mod_Limit;

export type SelectMethodNames = "filter" | "orderBy" | "offset" | "limit";
// export type $expr_Select<
//   Set extends TypeSet = TypeSet,
//   Expr extends TypeSet = TypeSet,
//   Modifier extends SelectModifier | null = SelectModifier | null,
//   Methods extends SelectMethodNames = never
// > = $expr_Select<Set, Expr, Modifier> &
//   Pick<SelectMethods<Set, Expr>, Methods>;

export type $expr_Select<
  Set extends TypeSet = TypeSet,
  Expr extends TypeSet = TypeSet,
  Modifier extends SelectModifier | null = SelectModifier | null,
  Methods extends SelectMethodNames = never
> = Expression<
  {
    __element__: Set["__element__"];
    __cardinality__: Set["__cardinality__"];
    __expr__: Expr;
    __kind__: ExpressionKind.Select;
    __modifier__: Modifier;
    query(
      cxn: edgedb.Pool | edgedb.Connection
    ): Promise<
      setToTsType<TypeSet<Set["__element__"], Set["__cardinality__"]>>
    >;
  } & Pick<SelectMethods<Set, Expr>, Methods> &
    (Set extends ObjectTypeSet ? SelectObjectMethods<Set> : {})
>;

// select User filter User.id = 'adsf'
// select User filter User = someUser
// select User filter User.profile = someProfile

// Base is ObjectTypeExpression &
// Filter is equality &
// Filter.args[0] is PathLeaf
//   Filter.args[0] is __exclusive__ &
//   Filter.args[0].parent.__element__ === Base.__element__
//   Filter.args[1].__cardinality__ is AtMostOne or One
// if Filter.args[0] is PathNode:
//   Filter.args[0] is __exclusive__ &
//   if Filter.args[0].parent === null
//     Filter.args[0].parent.__element__ === Base.__element__
//     Filter.args[1].__cardinality__ is AtMostOne or One
//   else
//     Filter.args[0].type.__element__ === Base.__element__ &
//     Filter.args[1].__cardinality__ is AtMostOne or One

export type argCardToResultCard<
  OpCard extends Cardinality,
  BaseCase extends Cardinality
> = [OpCard] extends [Cardinality.AtMostOne | Cardinality.One]
  ? Cardinality.AtMostOne
  : [OpCard] extends [Cardinality.Empty]
  ? Cardinality.Empty
  : BaseCase;
export type inferCardinality<Base extends TypeSet, Filter extends TypeSet> =
  // Base is ObjectTypeExpression &
  Base extends ObjectTypeExpression // $expr_PathNode
    ? // Filter is equality
      Filter extends $expr_Operator<"std::=", any, infer Args, any>
      ? // Filter.args[0] is PathLeaf
        Args[0] extends $expr_PathLeaf
        ? // Filter.args[0] is unique
          Args[0]["__exclusive__"] extends true
          ? //   Filter.args[0].parent.__element__ === Base.__element__
            typeutil.assertEqual<
              Args[0]["__parent__"]["type"]["__element__"]["__name__"],
              Base["__element__"]["__name__"]
            > extends true
            ? // Filter.args[1].__cardinality__ is AtMostOne or One
              argCardToResultCard<
                Args[1]["__cardinality__"],
                Base["__cardinality__"]
              >
            : Base["__cardinality__"]
          : Base["__cardinality__"]
        : Args[0] extends $expr_PathNode
        ? Args[0]["__exclusive__"] extends true
          ? //   Filter.args[0].parent.__element__ === Base.__element__
            Args[0]["__parent__"] extends null
            ? typeutil.assertEqual<
                Args[0]["__element__"]["__name__"],
                Base["__element__"]["__name__"]
              > extends true
              ? // Filter.args[1].__cardinality__ is AtMostOne or One
                argCardToResultCard<
                  Args[1]["__cardinality__"],
                  Base["__cardinality__"]
                >
              : Base["__cardinality__"]
            : Args[0]["__parent__"] extends infer Parent
            ? Parent extends PathParent
              ? typeutil.assertEqual<
                  Parent["type"]["__element__"]["__name__"],
                  Base["__element__"]["__name__"]
                > extends true
                ? // Filter.args[1].__cardinality__ is AtMostOne or One
                  argCardToResultCard<
                    Args[1]["__cardinality__"],
                    Base["__cardinality__"]
                  >
                : Base["__cardinality__"]
              : Base["__cardinality__"]
            : Base["__cardinality__"]
          : Base["__cardinality__"]
        : Base["__cardinality__"]
      : Base["__cardinality__"]
    : Base["__cardinality__"];

interface SelectMethods<Self extends TypeSet, Root extends TypeSet> {
  // required so `this` passes validation
  // as a TypeSet
  __element__: Self["__element__"];
  __cardinality__: Self["__cardinality__"];

  filter<Expr extends SelectFilterExpression, This extends this = this>(
    expr: Expr
  ): $expr_Select<
    {
      __element__: Self["__element__"];
      __cardinality__: inferCardinality<Root, Expr>;
    },
    This,
    {
      kind: SelectModifierKind.filter;
      expr: Expr;
    },
    SelectMethodNames // all methods
  >;
  orderBy<Expr extends OrderByExpression, This extends this = this>(
    expr: Expr,
    dir?: OrderByDirection,
    empty?: OrderByEmpty
  ): $expr_Select<
    Self,
    This,
    {
      kind: SelectModifierKind.order_by;
      expr: Expr;
      direction: OrderByDirection;
      empty: OrderByEmpty;
    },
    "orderBy" | "limit" | "offset" // all methods
  >;
  offset<Expr extends OffsetExpression, This extends this = this>(
    expr: Expr
  ): $expr_Select<
    Self,
    This,
    {
      kind: SelectModifierKind.offset;
      expr: Expr;
    },
    "limit" // all methods
  >;
  offset<This extends this = this>(
    expr: number
  ): $expr_Select<
    Self,
    This,
    {
      kind: SelectModifierKind.offset;
      expr: $expr_Literal<$int64>;
    },
    "limit"
  >;

  limit<Expr extends LimitExpression, This extends this = this>(
    expr: Expr
  ): $expr_Select<
    {
      __element__: Self["__element__"];
      __cardinality__: Expr["__element__"]["__tsconsttype__"] extends 0
        ? Cardinality.Empty
        : Expr["__element__"]["__tsconsttype__"] extends 1
        ? Cardinality.AtMostOne
        : Self["__cardinality__"];
    },
    This,
    {
      kind: SelectModifierKind.limit;
      expr: Expr;
    },
    never
  >;
  limit<Limit extends number, This extends this = this>(
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
    This,
    {
      kind: SelectModifierKind.limit;
      expr: $expr_Literal<$int64>;
    },
    never
  >;
}

/////////////////
/// UPDATE
/////////////////

type anonymizeObject<T extends SomeObjectType> = ObjectType<
  string,
  T["__shape__"],
  any,
  any[]
>;

export type assignableTuple<Items extends BaseTypeTuple> = {
  [k in keyof Items]: Items[k] extends MaterialType
    ? assignableBy<Items[k]>
    : never;
} extends infer NewItems
  ? NewItems extends BaseTypeTuple
    ? NewItems
    : never
  : never;

export type assignableBy<T extends BaseType> = T extends ScalarType
  ? scalarAssignableBy<T>
  : T extends SomeObjectType
  ? anonymizeObject<T>
  : T extends ArrayType
  ? assignableBy<T["__element__"]> extends NonArrayMaterialType
    ? ArrayType<assignableBy<T["__element__"]>>
    : never
  : T extends TupleType
  ? TupleType<assignableTuple<T["__items__"]>>
  : T extends NamedTupleType
  ? NamedTupleType<
      {
        [k in keyof T["__shape__"]]: assignableBy<T["__shape__"][k]>;
      }
    >
  : never;

type stripBacklinks<T extends ObjectTypeShape> = {
  [k in keyof T]: k extends `<${string}` ? never : T[k];
};

type stripNonWritables<T extends ObjectTypeShape> = {
  [k in keyof T]: [T[k]["writable"]] extends [true] ? T[k] : never;
};

type UpdateUser = UpdateShape<typeof Movie>["characters"];

export type shapeElementToAssignmentExpression<
  Element extends PropertyDesc | LinkDesc
> = [Element] extends [PropertyDesc]
  ? // TypeSet<
    // required to avoid excessively deep
    // [Element["target"]] extends [infer A]
    //   ? [A] extends [BaseType]
    //     ? assignableBy<A>
    //     : never
    //   : never,
    {
      __element__: assignableBy<Element["target"]>;
      __cardinality__: assignableCardinality<Element["cardinality"]>;
    }
  : // >
  [Element] extends [LinkDesc]
  ? TypeSet<
      ObjectType<
        // anonymize the link target
        // generated object types are too limiting
        // they have no shape or polys
        string,
        Element["target"]["__shape__"]
      >,
      assignableCardinality<Element["cardinality"]>
    >
  : never;

export type UpdateShape<Root extends ObjectTypeSet> = typeutil.stripNever<
  stripNonWritables<stripBacklinks<Root["__element__"]["__shape__"]>>
> extends infer Shape
  ? Shape extends ObjectTypeShape
    ? {
        [k in keyof Shape]?: shapeElementToAssignmentExpression<
          Shape[k]
        > extends infer S
          ? S | {"+=": S} | {"-=": S}
          : never;
      }
    : never
  : never;

export type $expr_Update<
  Root extends ObjectTypeSet = ObjectTypeSet,
  Shape extends UpdateShape<Root> = any
> = Expression<{
  __kind__: ExpressionKind.Update;
  __element__: Root["__element__"];
  __cardinality__: Root["__cardinality__"];
  __expr__: Root;
  __shape__: Shape;
}>;

type SelectObjectMethods<Root extends ObjectTypeSet> = {
  __element__: Root["__element__"];
  __cardinality__: Root["__cardinality__"];
  update(shape: UpdateShape<Root>): $expr_Update<Root, UpdateShape<Root>>;
};

export function is<
  Expr extends ObjectTypeExpression,
  Params extends objectTypeToSelectParams<Expr["__element__"]>
>(expr: Expr, params: Params): Poly<Expr["__element__"], Params> {
  return {type: expr.__element__, params};
}

function filterFunc(this: any, expr: SelectFilterExpression) {
  let card = this.__cardinality__;

  // extremely fiddly cardinality inference logic
  const base: TypeSet = this.__expr__;

  const filter: any = expr;
  // Base is ObjectExpression
  const baseIsObjectExpr = base?.__element__?.__kind__ === TypeKind.object;
  const filterExprIsEq =
    filter.__kind__ === ExpressionKind.Operator &&
    filter.__name__ === "std::=";
  const arg0: $expr_PathLeaf | $expr_PathNode = filter?.__args__?.[0];
  const arg1: TypeSet = filter?.__args__?.[1];
  const argsExist = !!arg0 && !!arg1 && !!arg1.__cardinality__;
  const arg0IsUnique = arg0?.__exclusive__ === true;

  // const baseEqualsArg0Parent =
  //   arg0.__parent__.type.__element__.__name__ === base.__element__.__name__;

  const newCard =
    arg1.__cardinality__ === Cardinality.One ||
    arg1.__cardinality__ === Cardinality.AtMostOne
      ? Cardinality.AtMostOne
      : arg1.__cardinality__ === Cardinality.Empty
      ? Cardinality.Empty
      : this.__cardinality__;

  if (baseIsObjectExpr && filterExprIsEq && argsExist && arg0IsUnique) {
    if (arg0.__kind__ === ExpressionKind.PathLeaf) {
      const arg0ParentMatchesBase =
        arg0.__parent__.type.__element__.__name__ ===
        base.__element__.__name__;
      if (arg0ParentMatchesBase) {
        card = newCard;
      }
    } else if (arg0.__kind__ === ExpressionKind.PathNode) {
      // if Filter.args[0] is PathNode:
      //   Filter.args[0] is __exclusive__ &
      //   if Filter.args[0].parent === null
      //     Filter.args[0].__element__ === Base.__element__
      //     Filter.args[1].__cardinality__ is AtMostOne or One
      //   else
      //     Filter.args[0].type.__element__ === Base.__element__ &
      //     Filter.args[1].__cardinality__ is AtMostOne or One
      const parent = arg0.__parent__;
      if (parent === null) {
        const arg0MatchesBase =
          arg0.__element__.__name__ === base.__element__.__name__;
        if (arg0MatchesBase) {
          card = newCard;
        }
      } else {
        const arg0ParentMatchesBase =
          parent?.type.__element__.__name__ === base.__element__.__name__;
        if (arg0ParentMatchesBase) {
          card = newCard;
        }
      }
    }
  }

  return $expressionify(
    $selectify({
      __kind__: ExpressionKind.Select,
      __element__: this.__element__,
      __cardinality__: card,
      __expr__: this,
      __modifier__: {
        kind: SelectModifierKind.filter,
        expr,
      },
    })
  );
}

function orderByFunc(
  this: any,
  expr: OrderByExpression,
  dir?: OrderByDirection,
  empty?: OrderByEmpty
) {
  return $expressionify(
    $selectify({
      __kind__: ExpressionKind.Select,
      __element__: this.__element__,
      __cardinality__: this.__cardinality__,
      __expr__: this,
      __modifier__: {
        kind: SelectModifierKind.order_by,
        expr,
        direction: dir || ASC,
        empty: empty || dir === "DESC" ? EMPTY_LAST : EMPTY_FIRST,
      },
    })
  );
}

function offsetFunc(this: any, expr: OffsetExpression | number) {
  return $expressionify(
    $selectify({
      __kind__: ExpressionKind.Select,
      __element__: this.__element__,
      __cardinality__: this.__cardinality__,
      __expr__: this,
      __modifier__: {
        kind: SelectModifierKind.offset,
        expr: typeof expr === "number" ? _std.int64(expr) : expr,
      },
    })
  );
}

function limitFunc(this: any, expr: LimitExpression | number) {
  const self = this;
  let card = this.__cardinality__;
  if (typeof expr === "number") {
    if (expr === 1) {
      card = Cardinality.AtMostOne;
    } else if (expr === 0) {
      card = Cardinality.Empty;
    }
  }

  if ((expr as any).__kind__ === ExpressionKind.Set) {
    expr = (expr as any).__exprs__[0];
  }

  if ((expr as any).__kind__ === ExpressionKind.Literal) {
    const literalExpr: $expr_Literal = expr as any;
    if (literalExpr.__value__ === 1) {
      card = Cardinality.AtMostOne;
    } else if (literalExpr.__value__ === 0) {
      card = Cardinality.Empty;
    }
  }

  return $expressionify(
    $selectify({
      __kind__: ExpressionKind.Select,
      __element__: self.__element__,
      __cardinality__: card,
      __expr__: self,
      __modifier__: {
        kind: SelectModifierKind.limit,
        expr: typeof expr === "number" ? _std.int64(expr) : expr,
      },
    })
  );
}

function updateFunc(this: any, shape: any) {
  return $expressionify(
    $selectify({
      __kind__: ExpressionKind.Update,
      __element__: this.__element__,
      __cardinality__: this.__cardinality__,
      __expr__: this,
      __shape__: shape,
    })
  ) as $expr_Update;
}

async function queryFunc(this: any, cxn: edgedb.Connection | edgedb.Pool) {
  if (
    this.__cardinality__ === Cardinality.One ||
    this.__cardinality__ === Cardinality.AtMostOne
  ) {
    return await cxn.queryOne(this.toEdgeQL());
  } else {
    return cxn.query(this.toEdgeQL());
  }
}

export function $selectify<Expr extends TypeSet>(expr: Expr) {
  Object.assign(expr, {
    filter: filterFunc.bind(expr),
    orderBy: orderByFunc.bind(expr),
    offset: offsetFunc.bind(expr),
    limit: limitFunc.bind(expr),
    update: updateFunc.bind(expr),
    query: queryFunc.bind(expr),
  });
  return expr;
}

export function select<Expr extends ObjectTypeExpression>(
  expr: Expr
): $expr_Select<
  {
    __element__: ObjectType<
      `${Expr["__element__"]["__name__"]}`, // _shape
      Expr["__element__"]["__shape__"],
      {id: true},
      []
    >;
    __cardinality__: Expr["__cardinality__"];
  },
  Expr,
  null,
  SelectMethodNames
>;
export function select<Expr extends TypeSet>(
  expr: Expr
): $expr_Select<Expr, Expr, null, SelectMethodNames>;
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
      `${Expr["__element__"]["__name__"]}`, // _shape
      Expr["__element__"]["__shape__"],
      Params,
      Polys
    >;
    __cardinality__: Expr["__cardinality__"];
  },
  Expr,
  null,
  SelectMethodNames
>;
export function select<Params extends {[key: string]: TypeSet}>(
  params: Params
): $expr_Select<
  {
    __element__: ObjectType<`std::FreeObject`, {}, Params, []>; // _shape
    __cardinality__: Cardinality.One;
  },
  typeof FreeObject,
  null,
  SelectMethodNames
>;
export function select(...args: any[]) {
  const [expr, params, ...polys] =
    typeof args[0].__element__ !== "undefined" ? args : [FreeObject, ...args];

  if (!params) {
    if (expr.__element__.__kind__ === TypeKind.object) {
      const objectExpr: ObjectTypeExpression = expr as any;
      return $expressionify(
        $selectify({
          __kind__: ExpressionKind.Select,
          __element__: {
            __kind__: TypeKind.object,
            __name__: `${objectExpr.__element__.__name__}`, // _shape
            __shape__: objectExpr.__element__.__shape__,
            __params__: {id: true},
            __polys__: [],
            __tstype__: undefined as any,
          },
          __cardinality__: objectExpr.__cardinality__,
          __expr__: objectExpr,
          __modifier__: null,
        })
      );
    } else {
      return $expressionify(
        $selectify({
          __kind__: ExpressionKind.Select,
          __element__: expr.__element__,
          __cardinality__: expr.__cardinality__,
          __expr__: expr,
          __modifier__: null,
        })
      );
    }
  }

  const objExpr: ObjectTypeExpression = expr as any;
  return $expressionify(
    $selectify({
      __kind__: ExpressionKind.Select,
      __element__: {
        __kind__: TypeKind.object,
        __name__: `${objExpr.__element__.__name__}`, // _shape
        __shape__: objExpr.__element__.__shape__,
        __params__: params,
        __polys__: polys,
        __tstype__: undefined as any,
      },
      __cardinality__: objExpr.__cardinality__,
      __expr__: expr,
      __modifier__: null,
    })
  );
}
