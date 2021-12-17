import {
  $expr_Array,
  $expr_NamedTuple,
  $expr_Tuple,
  $expr_TuplePath,
  ArrayType,
  BaseType,
  cardinalityUtil,
  ExpressionKind,
  ExpressionRoot,
  getPrimitiveBaseType,
  NamedTupleLiteralShape,
  NamedTupleShape,
  NamedTupleType,
  NonArrayType,
  TupleType,
  TypeKind,
  TypeSet,
  typeutil,
} from "../reflection";
import {$expressionify} from "./path";
import {getCardsFromExprs} from "./set";
import _std from "@generated/modules/std";
import {literal} from "./literal";

const indexSliceRegx = /^(-?\d+)(?:(:)(-?\d+)?)?|:(-?\d+)$/;

let sliceTupleType: TupleType | null = null;

const arrayProxyHandlers: ProxyHandler<ExpressionRoot> = {
  get(target: ExpressionRoot, prop: string | symbol, proxy: any) {
    const match = typeof prop === "string" ? prop.match(indexSliceRegx) : null;
    if (match) {
      const start = match[1];
      const end = match[3] ?? match[4];
      return $expressionify({
        __kind__: ExpressionKind.Operator,
        __element__: (target.__element__ as ArrayType).__element__,
        __cardinality__: target.__cardinality__,
        __name__: "std::[]",
        __opkind__: "Infix",
        __args__: [
          proxy,
          start && !match[2]
            ? _std.int64(parseInt(start, 10))
            : literal(
                sliceTupleType ??
                  (sliceTupleType = tuple([_std.int64, _std.int64])),
                [start, end] as any
              ),
        ],
      }) as any;
    }
    return (target as any)[prop];
  },
};

export function _$arrayIndexify(expr: ExpressionRoot) {
  if (expr.__element__.__kind__ !== TypeKind.array) {
    return expr;
  }

  return new Proxy(expr, arrayProxyHandlers);
}

// ARRAY
export function array<Element extends NonArrayType>(
  element: Element
): ArrayType<Element>;
export function array<
  Expr extends TypeSet<NonArrayType>,
  Exprs extends TypeSet<getPrimitiveBaseType<Expr["__element__"]>>[]
>(
  arg: [Expr, ...Exprs]
): $expr_Array<
  ArrayType<getPrimitiveBaseType<Expr["__element__"]>>,
  cardinalityUtil.multiplyCardinalitiesVariadic<
    getCardsFromExprs<[Expr, ...Exprs]>
  >
>;
export function array(arg: any) {
  if (Array.isArray(arg)) {
    const items = arg as TypeSet[];
    return $expressionify({
      __kind__: ExpressionKind.Array,
      __cardinality__: cardinalityUtil.multiplyCardinalitiesVariadic(
        items.map(item => item.__cardinality__) as any
      ),
      __element__: {
        __kind__: TypeKind.array,
        __name__: `array<${items[0].__element__.__name__}>`,
        __element__: items[0].__element__,
      } as any,
      __items__: items,
    });
  }
  if (arg.__kind__) {
    return {
      __kind__: TypeKind.array,
      __name__: `array<${arg.__name__}>`,
      __element__: arg,
    } as any;
  }

  throw new Error("Invalid array input.");
}

// TUPLE

const tuplePathsCache = new WeakMap<
  ExpressionRoot,
  {[key: string]: $expr_TuplePath}
>();

const tupleProxyHandlers: ProxyHandler<ExpressionRoot> = {
  get(target: ExpressionRoot, prop: string | symbol, proxy: any) {
    const tuplePaths = tuplePathsCache.get(target)!;
    const type = target.__element__;
    const item =
      type.__kind__ === TypeKind.tuple
        ? (type as TupleType).__items__[prop as any]
        : type.__kind__ === TypeKind.namedtuple
        ? (type as NamedTupleType).__shape__[prop as any]
        : null;
    return item
      ? tuplePaths[prop as any] ??
          (tuplePaths[prop as any] = $expr_TuplePath(proxy, item, prop as any))
      : (target as any)[prop];
  },
};

export function _$tuplePathify(expr: ExpressionRoot) {
  if (
    expr.__element__.__kind__ !== TypeKind.tuple &&
    expr.__element__.__kind__ !== TypeKind.namedtuple
  ) {
    return expr;
  }

  tuplePathsCache.set(expr, {});
  return new Proxy(expr, tupleProxyHandlers);
}

function $expr_TuplePath(
  parent: $expr_Tuple | $expr_TuplePath,
  itemType: BaseType,
  index: string
): $expr_TuplePath {
  return $expressionify({
    __kind__: ExpressionKind.TuplePath,
    __element__: itemType,
    __cardinality__: parent.__cardinality__,
    __parent__: parent,
    __index__: index,
  }) as any;
}

function makeTupleType(name: string, items: BaseType[]) {
  return {
    __kind__: TypeKind.tuple,
    __name__: name,
    __items__: items,
  } as any;
}

export function tuple<Items extends typeutil.tupleOf<BaseType>>(
  items: Items
): TupleType<Items>;
export function tuple<
  Item extends TypeSet,
  Items extends typeutil.tupleOf<Item>
>(items: Items): $expr_Tuple<Items>;
export function tuple<Shape extends NamedTupleShape>(
  shape: Shape
): NamedTupleType<Shape>;
export function tuple<Shape extends NamedTupleLiteralShape>(
  shape: Shape
): $expr_NamedTuple<Shape>;
export function tuple(input: any) {
  if (Array.isArray(input)) {
    // is tuple
    if (input.every(item => !!item.__element__)) {
      const items = input as TypeSet[];
      const name = `tuple<${items
        .map(item => item.__element__.__name__)
        .join(", ")}>`;
      return $expressionify({
        __kind__: ExpressionKind.Tuple,
        __element__: makeTupleType(
          name,
          items.map(item => item.__element__)
        ),
        __cardinality__: cardinalityUtil.multiplyCardinalitiesVariadic(
          items.map(i => i.__cardinality__) as any
        ),
        __items__: items,
      }) as any;
    }
    if (input.every(item => Object.values(TypeKind).includes(item.__kind__))) {
      const items = input as BaseType[];
      const name = `tuple<${items.map(item => item.__name__).join(", ")}>`;
      return makeTupleType(name, items);
    }

    throw new Error("Invalid tuple input.");
  } else {
    // is named tuple
    if (Object.values(input).every((el: any) => !!el.__element__)) {
      const exprShape = input as NamedTupleLiteralShape;
      const name = `tuple<${Object.entries(exprShape)
        .map(([key, val]) => `${key}: ${val.__element__.__name__}`)
        .join(", ")}>`;
      const typeShape: any = {};
      for (const key of Object.keys(exprShape)) {
        typeShape[key] = exprShape[key].__element__;
      }
      return $expressionify({
        __kind__: ExpressionKind.NamedTuple,
        __element__: {
          __kind__: TypeKind.namedtuple,
          __name__: name,
          __shape__: typeShape,
        } as any,
        __cardinality__: cardinalityUtil.multiplyCardinalitiesVariadic(
          Object.values(exprShape).map(val => val.__cardinality__) as any
        ),
        __shape__: exprShape,
      }) as any;
    }
    if (
      Object.values(input).every((el: any) =>
        Object.values(TypeKind).includes(el.__kind__)
      )
    ) {
      const name = `tuple<${Object.entries(input)
        .map(([key, val]: [string, any]) => `${key}: ${val.__name__}`)
        .join(", ")}>`;
      return {
        __kind__: TypeKind.namedtuple,
        __name__: name,
        __shape__: input,
      } as any;
    }

    throw new Error("Invalid named tuple input.");
  }
}

export type {
  ArrayType as $Array,
  NamedTupleType as $NamedTuple,
  TupleType as $Tuple,
} from "../reflection";
