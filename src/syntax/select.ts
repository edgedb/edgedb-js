import type {$anyint, $bool} from "@generated/modules/std";
import _std from "@generated/modules/std";
import {
  $expr_PolyShapeElement,
  $scopify,
  Cardinality,
  cardinalityUtil,
  ExpressionKind,
  LinkDesc,
  ObjectType,
  ObjectTypeExpression,
  ObjectTypePointers,
  ObjectTypeSet,
  PropertyDesc,
  QueryableExpression,
  ScalarType,
  stripSet,
  stripSetShape,
  TypeKind,
  TypeSet,
  typeutil,
} from "../reflection";
import type {$expr_Literal} from "../reflection/literal";
import type {
  $expr_PathLeaf,
  $expr_PathNode,
  ExpressionRoot,
  PathParent,
} from "../reflection/path";
import {anonymizeObject} from "./casting";
import type {$expr_Operator} from "./funcops";
import {$expressionify} from "./path";
import {$queryify} from "./query";
import type {$expr_Update, UpdateShape} from "./update";

export const ASC: "ASC" = "ASC";
export const DESC: "DESC" = "DESC";
export const EMPTY_FIRST: "EMPTY FIRST" = "EMPTY FIRST";
export const EMPTY_LAST: "EMPTY LAST" = "EMPTY LAST";
export type OrderByDirection = "ASC" | "DESC";
export type OrderByEmpty = "EMPTY FIRST" | "EMPTY LAST";

export type OrderByExpr = TypeSet<ScalarType, Cardinality>;
export type OrderByObjExpr = {
  expression: OrderByExpr;
  direction?: OrderByDirection;
  empty?: OrderByEmpty;
};

export type OrderByExpression =
  | OrderByExpr
  | OrderByObjExpr
  | [OrderByExpr | OrderByObjExpr, ...(OrderByExpr | OrderByObjExpr)[]];

export type OffsetExpression = TypeSet<
  $anyint,
  Cardinality.Empty | Cardinality.One | Cardinality.AtMostOne
>;

export type SelectFilterExpression = TypeSet<$bool, Cardinality>;
export type LimitOffsetExpression = TypeSet<
  $anyint,
  Cardinality.Empty | Cardinality.One | Cardinality.AtMostOne
>;
export type LimitExpression = TypeSet<
  $anyint,
  Cardinality.Empty | Cardinality.One | Cardinality.AtMostOne
>;

export type SelectModifierNames = "filter" | "order" | "offset" | "limit";

export type SelectModifiers = {
  filter?: SelectFilterExpression;
  order?: OrderByExpression;
  offset?: OffsetExpression | number;
  limit?: LimitExpression | number;
};

export type NormalisedSelectModifiers = {
  filter?: SelectFilterExpression;
  order?: OrderByObjExpr[];
  offset?: OffsetExpression;
  limit?: LimitExpression;
};

// type NormaliseOrderByModifier<Mods extends OrderByExpression> =
//   Mods extends OrderByExpr
//     ? [{expression: Mods}]
//     : Mods extends OrderByObjExpr
//     ? [Mods]
//     : Mods extends (OrderByExpr | OrderByObjExpr)[]
//     ? {
//         [K in keyof Mods]: Mods[K] extends OrderByExpr
//           ? {expression: Mods[K]}
//           : Mods[K];
//       }
//     : [];

// type NormaliseSelectModifiers<Mods extends SelectModifiers> = {
//   filter: Mods["filter"];
//   order: Mods["order"] extends OrderByExpression
//     ? NormaliseOrderByModifier<Mods["order"]>
//     : [];
//   offset: Mods["offset"] extends number
//     ? $expr_Literal<ScalarType<"std::int64", number, Mods["offset"]>>
//     : Mods["offset"];
//   limit: Mods["offset"] extends number
//     ? $expr_Literal<ScalarType<"std::int64", number, Mods["offset"]>>
//     : Mods["offset"];
// };

export type $expr_Select<
  Set extends TypeSet = TypeSet,
  Expr extends TypeSet = TypeSet,
  Modifiers extends NormalisedSelectModifiers = NormalisedSelectModifiers
> = QueryableExpression<
  {
    __element__: Set["__element__"];
    __cardinality__: Set["__cardinality__"];
    __expr__: stripSet<Expr>; // avoid infinite recursion
    __kind__: ExpressionKind.Select;
    __modifiers__: Modifiers;
    __scope__?: ObjectTypeExpression;
  } & (Set extends ObjectTypeSet ? SelectObjectMethods<Set> : {})
>;

interface SelectObjectMethods<Root extends ObjectTypeSet> {
  __element__: Root["__element__"];
  __cardinality__: Root["__cardinality__"];
  update(shape: UpdateShape<Root>): $expr_Update<Root, UpdateShape<Root>>;
  delete(): $expr_Delete<Root>;
}

// Base is ObjectTypeSet &
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

export type InferFilterCardinality<
  Base extends TypeSet,
  Filter extends TypeSet | undefined
> = Filter extends TypeSet
  ? // Base is ObjectTypeExpression &
    Base extends ObjectTypeSet // $expr_PathNode
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
    : Base["__cardinality__"]
  : Base["__cardinality__"];

type InferLimitCardinality<
  Card extends Cardinality,
  Limit extends LimitExpression | number | undefined
> = Limit extends number
  ? Limit extends 0
    ? Cardinality.Empty
    : Limit extends 1
    ? Cardinality.AtMostOne
    : Card
  : Limit extends LimitExpression
  ? Limit["__element__"]["__tsconsttype__"] extends 0
    ? Cardinality.Empty
    : Limit["__element__"]["__tsconsttype__"] extends 1
    ? Cardinality.AtMostOne
    : Card
  : Card;

type ComputeSelectCardinality<
  Expr extends ObjectTypeExpression,
  Modifiers extends SelectModifiers
> = InferLimitCardinality<
  InferFilterCardinality<Expr, Modifiers["filter"]>,
  Modifiers["limit"]
>;

export type polymorphicShape<RawShape extends ObjectTypePointers> = {
  [k in keyof RawShape]?: k extends `<${string}`
    ? any
    : RawShape[k] extends PropertyDesc
    ? boolean
    : RawShape[k] extends LinkDesc
    ?
        | boolean
        | (pointersToSelectShape<RawShape[k]["target"]["__pointers__"]> &
            pointersToSelectShape<RawShape[k]["properties"]>)
        | ((
            scope: $scopify<RawShape[k]["target"]>
          ) => pointersToSelectShape<RawShape[k]["target"]["__pointers__"]> &
            pointersToSelectShape<RawShape[k]["properties"]>)
    : any;
};

export function is<
  Expr extends ObjectTypeExpression,
  Shape extends polymorphicShape<Expr["__element__"]["__pointers__"]>
>(
  expr: Expr,
  shape: Shape
): {
  [k in keyof Shape]: $expr_PolyShapeElement<Expr, Shape[k]>;
} {
  const mappedShape: any = {};
  // const {shape: resolvedShape, scope} = resolveShape(shape, expr);
  for (const [key, value] of Object.entries(shape)) {
    mappedShape[key] = {
      __kind__: ExpressionKind.PolyShapeElement,
      __polyType__: expr,
      __shapeElement__: value,
    };
  }
  return mappedShape;
}

function computeFilterCardinality(
  expr: SelectFilterExpression,
  cardinality: Cardinality,
  base: TypeSet
) {
  let card = cardinality;

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

  const newCard =
    arg1.__cardinality__ === Cardinality.One ||
    arg1.__cardinality__ === Cardinality.AtMostOne
      ? Cardinality.AtMostOne
      : arg1.__cardinality__ === Cardinality.Empty
      ? Cardinality.Empty
      : cardinality;

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

  return card;
}

function handleModifiers(
  modifiers: SelectModifiers,
  rootExpr: ObjectTypeExpression
): {modifiers: NormalisedSelectModifiers; cardinality: Cardinality} {
  const mods = {...modifiers};
  let card = rootExpr.__cardinality__;

  if (mods.filter) {
    card = computeFilterCardinality(mods.filter, card, rootExpr);
  }
  if (mods.order) {
    const orderExprs = Array.isArray(mods.order) ? mods.order : [mods.order];
    mods.order = orderExprs.map(expr =>
      typeof (expr as any).__element__ === "undefined"
        ? expr
        : {expression: expr}
    ) as any;
  }
  if (mods.offset) {
    mods.offset =
      typeof mods.offset === "number" ? _std.int64(mods.offset) : mods.offset;
  }
  if (mods.limit) {
    let expr = mods.limit;
    if (typeof expr === "number") {
      expr = _std.int64(expr);
    } else if ((expr as any).__kind__ === ExpressionKind.Set) {
      expr = (expr as any).__exprs__[0];
    }
    mods.limit = expr;

    if ((expr as any).__kind__ === ExpressionKind.Literal) {
      const literalExpr: $expr_Literal = expr as any;
      if (literalExpr.__value__ === 1) {
        card = Cardinality.AtMostOne;
      } else if (literalExpr.__value__ === 0) {
        card = Cardinality.Empty;
      }
    }
  }

  return {modifiers: mods as NormalisedSelectModifiers, cardinality: card};
}

function updateFunc(this: any, shape: any) {
  return $expressionify(
    $queryify({
      __kind__: ExpressionKind.Update,
      __element__: this.__element__,
      __cardinality__: this.__cardinality__,
      __expr__: this,
      __shape__: shape,
    })
  ) as $expr_Update;
}

export type $expr_Delete<Root extends ObjectTypeSet = ObjectTypeSet> =
  QueryableExpression<{
    __kind__: ExpressionKind.Delete;
    __element__: Root["__element__"];
    __cardinality__: Root["__cardinality__"];
    __expr__: Root;
  }>;

function deleteFunc(this: any) {
  return $expressionify(
    $queryify({
      __kind__: ExpressionKind.Delete,
      __element__: this.__element__,
      __cardinality__: this.__cardinality__,
      __expr__: this,
    })
  ) as $expr_Delete;
}

export function $selectify<Expr extends ExpressionRoot>(expr: Expr) {
  Object.assign(expr, {
    update: updateFunc.bind(expr),
    delete: deleteFunc.bind(expr),
  });
  return $queryify(expr);
}

export type pointersToSelectShape<Shape extends ObjectTypePointers> = Partial<{
  [k in keyof Shape]: Shape[k] extends PropertyDesc
    ?
        | boolean
        | TypeSet<
            // causes excessively deep error:
            // castableFrom<Shape[k]["target"]>
            Shape[k]["target"],
            cardinalityUtil.assignable<Shape[k]["cardinality"]>
          >
    : // | pointerToCastableExpression<Shape[k]>
    Shape[k] extends LinkDesc
    ?
        | boolean
        // | pointerToCastableExpression<Shape[k]>
        | TypeSet<
            anonymizeObject<Shape[k]["target"]>,
            cardinalityUtil.assignable<Shape[k]["cardinality"]>
          >
        | (pointersToSelectShape<Shape[k]["target"]["__pointers__"]> &
            pointersToSelectShape<Shape[k]["properties"]>)
        | ((
            scope: $scopify<Shape[k]["target"]>
          ) => pointersToSelectShape<Shape[k]["target"]["__pointers__"]> &
            pointersToSelectShape<Shape[k]["properties"]>)
    : any;
}> &
  SelectModifiers;

export function select<Expr extends ObjectTypeExpression>(
  expr: Expr
): $expr_Select<
  {
    __element__: ObjectType<
      `${Expr["__element__"]["__name__"]}`, // _shape
      Expr["__element__"]["__pointers__"],
      {id: true}
    >;
    __cardinality__: Expr["__cardinality__"];
  },
  Expr
>;
export function select<Expr extends TypeSet>(
  expr: Expr
): $expr_Select<stripSet<Expr>, Expr>;
export function select<
  Expr extends ObjectTypeExpression,
  Shape extends pointersToSelectShape<Expr["__element__"]["__pointers__"]>,
  Modifiers = Pick<Shape, SelectModifierNames>
>(
  expr: Expr,
  shape: (scope: $scopify<Expr["__element__"]>) => Readonly<Shape>
): $expr_Select<
  {
    __element__: ObjectType<
      `${Expr["__element__"]["__name__"]}`, // _shape
      Expr["__element__"]["__pointers__"],
      Omit<stripSetShape<Shape>, SelectModifierNames>
    >;
    __cardinality__: ComputeSelectCardinality<Expr, Modifiers>;
  },
  Expr
>;
export function select<Expr extends ObjectTypeExpression, Set extends TypeSet>(
  expr: Expr,
  shape: (scope: $scopify<Expr["__element__"]>) => Set
): $expr_Select<
  {
    __element__: Set["__element__"];
    __cardinality__: cardinalityUtil.multiplyCardinalities<
      Expr["__cardinality__"],
      Set["__cardinality__"]
    >;
  },
  Expr
>;
export function select<Shape extends {[key: string]: TypeSet}>(
  shape: Shape
): $expr_Select<
  {
    __element__: ObjectType<`std::FreeObject`, {}, Shape>; // _shape
    __cardinality__: Cardinality.One;
  },
  typeof _std.FreeObject
>;
export function select(...args: any[]) {
  const [expr, shapeGetter] =
    typeof args[0].__element__ !== "undefined"
      ? args
      : [_std.FreeObject, () => args[0]];

  if (!shapeGetter) {
    if (expr.__element__.__kind__ === TypeKind.object) {
      const objectExpr: ObjectTypeSet = expr as any;
      return $expressionify(
        $selectify({
          __kind__: ExpressionKind.Select,
          __element__: {
            __kind__: TypeKind.object,
            __name__: `${objectExpr.__element__.__name__}`, // _shape
            __pointers__: objectExpr.__element__.__pointers__,
            __shape__: {id: true},
          } as any,
          __cardinality__: objectExpr.__cardinality__,
          __expr__: objectExpr,
          __modifiers__: {},
        })
      );
    } else {
      return $expressionify(
        $queryify({
          __kind__: ExpressionKind.Select,
          __element__: expr.__element__,
          __cardinality__: expr.__cardinality__,
          __expr__: expr,
          __modifiers__: {},
        })
      );
    }
  }

  const objExpr: ObjectTypeExpression = expr as any;

  const {
    modifiers: mods,
    shape,
    scope,
    expr: selectExpr,
  } = resolveShape(shapeGetter, objExpr);

  if (selectExpr) {
    return $expressionify(
      $queryify({
        __kind__: ExpressionKind.Select,
        __element__: selectExpr.__element__,
        __cardinality__: cardinalityUtil.multiplyCardinalities(
          selectExpr.__cardinality__,
          objExpr.__cardinality__
        ),
        __expr__: selectExpr,
        __modifiers__: {},
        __scope__: scope,
      })
    );
  }

  const {modifiers, cardinality} = handleModifiers(mods, objExpr);
  return $expressionify(
    $selectify({
      __kind__: ExpressionKind.Select,
      __element__: {
        __kind__: TypeKind.object,
        __name__: `${objExpr.__element__.__name__}`, // _shape
        __pointers__: objExpr.__element__.__pointers__,
        __shape__: shape,
      },
      __cardinality__: cardinality,
      __expr__: expr,
      __modifiers__: modifiers,
      __scope__: expr !== _std.FreeObject ? scope : undefined,
    })
  );
}

function resolveShape(
  shapeGetter: ((scope: any) => any) | any,
  expr: ObjectTypeExpression
): {modifiers: any; shape: any; scope: TypeSet; expr?: TypeSet} {
  const modifiers: any = {};
  const shape: any = {};

  const scope = $expressionify({
    ...expr,
    __cardinality__: Cardinality.One,
  } as any);
  // const scope = makePathNode(
  //   {
  //     __element__: expr.__element__,
  //     __cardinality__: Cardinality.One,
  //   },
  //   null,
  //   true
  // );

  const selectShape =
    typeof shapeGetter === "function" ? shapeGetter(scope) : shapeGetter;

  if (typeof selectShape.__kind__ !== "undefined") {
    return {expr: selectShape, shape, modifiers, scope};
  }

  for (const [key, value] of Object.entries(selectShape)) {
    if (
      key === "filter" ||
      key === "order" ||
      key === "offset" ||
      key === "limit"
    ) {
      modifiers[key] = value;
    } else {
      shape[key] = resolveShapeElement(key, value, scope);
    }
  }
  return {shape, modifiers, scope};
}

function resolveShapeElement(
  key: any,
  value: any,
  scope: ObjectTypeExpression
): any {
  if (
    (typeof value === "function" &&
      scope.__element__.__pointers__[key]?.__kind__ === "link") ||
    (typeof value === "object" &&
      typeof (value as any).__kind__ === "undefined")
  ) {
    const childExpr = (scope as any)[key];
    const {shape: childShape, scope: childScope} = resolveShape(
      value as any,
      childExpr
    );

    return {
      __kind__: ExpressionKind.Select,
      __element__: {
        __kind__: TypeKind.object,
        __name__: `${childExpr.__name__}`,
        __pointers__: childExpr.__pointers__,
        __shape__: childShape,
      },
      __cardinality__: scope.__element__.__pointers__[key].cardinality,
      __expr__: childExpr,
      __modifiers__: {},
      __scope__: childScope,
    };
  } else if ((value as any)?.__kind__ === ExpressionKind.PolyShapeElement) {
    const polyElement = value as $expr_PolyShapeElement;
    const polyScope = (scope as any).$is(polyElement.__polyType__);
    return {
      __kind__: ExpressionKind.PolyShapeElement,
      __polyType__: polyScope,
      __shapeElement__: resolveShapeElement(
        key,
        polyElement.__shapeElement__,
        polyScope
      ),
    };
  } else {
    return value;
  }
}
