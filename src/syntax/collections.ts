import {
  $expr_Array,
  $expr_NamedTuple,
  $expr_Tuple,
  ArrayType,
  BaseType,
  cardinalityUtil,
  ExpressionKind,
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
import {getCardsFromExprs, getPrimitiveBaseType} from "./set";

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
  ArrayType<Expr["__element__"]>,
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
export function tuple(_items: any[]) {
  if (_items.every(item => !!item.__element__)) {
    const items = _items as TypeSet[];
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
    });
  }
  if (_items.every(item => Object.values(TypeKind).includes(item.__kind__))) {
    const items = _items as BaseType[];
    const name = `tuple<${items.map(item => item.__name__).join(", ")}>`;
    return makeTupleType(name, items);
  }
  throw new Error("Invalid tuple input.");
}

// NAMED TUPLE

export function namedTuple<Shape extends NamedTupleShape>(
  shape: Shape
): NamedTupleType<Shape>;
export function namedTuple<Shape extends NamedTupleLiteralShape>(
  shape: Shape
): $expr_NamedTuple<Shape>;
export function namedTuple(shape: any): any {
  if (Object.values(shape).every((el: any) => !!el.__element__)) {
    const exprShape = shape as NamedTupleLiteralShape;
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
    });
  }
  if (
    Object.values(shape).every((el: any) =>
      Object.values(TypeKind).includes(el.__kind__)
    )
  ) {
    const name = `tuple<${Object.entries(shape)
      .map(([key, val]: [string, any]) => `${key}: ${val.__name__}`)
      .join(", ")}>`;
    return {
      __kind__: TypeKind.namedtuple,
      __name__: name,
      __shape__: shape,
    } as any;
  }

  throw new Error("Invalid named tuple input.");
}

export type {
  ArrayType as $Array,
  NamedTupleType as $NamedTuple,
  TupleType as $Tuple,
} from "../reflection";

// export { array,  tuple,  namedTuple};
// from "../reflection";
