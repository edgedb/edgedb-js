import {
  Cardinality,
  ExpressionKind,
  TypeKind,
  type typeutil,
} from "edgedb/dist/reflection/index";
import { cardutil } from "./cardinality";
import type {
  $expr_Array,
  $expr_NamedTuple,
  $expr_Tuple,
  $expr_TuplePath,
  ArrayType,
  BaseType,
  getPrimitiveBaseType,
  NamedTupleLiteralShape,
  NamedTupleShape,
  NamedTupleType,
  NonArrayType,
  ObjectTypeExpression,
  ObjectTypePointers,
  PropertyDesc,
  TupleType,
  TypeSet,
} from "./typesystem";

import { $expressionify, type ExpressionRoot } from "./path";
import type { getCardsFromExprs } from "./set";
import {
  type literalToScalarType,
  literalToTypeSet,
  type mapLiteralToTypeSet,
  type orScalarLiteral,
  type scalarLiterals,
} from "./castMaps";

const indexSliceRegx = /^(-?\d+)(?:(:)(-?\d+)?)?|:(-?\d+)$/;

const arrayLikeProxyHandlers: ProxyHandler<ExpressionRoot> = {
  get(target: ExpressionRoot, prop: string | symbol, proxy: any) {
    const match = typeof prop === "string" ? prop.match(indexSliceRegx) : null;
    if (match) {
      const start = match[1];
      const end = match[3] ?? match[4];
      const isIndex = start && !match[2];
      return $expressionify({
        __kind__: ExpressionKind.Operator,
        __element__:
          target.__element__.__kind__ === TypeKind.array && isIndex
            ? (target.__element__ as ArrayType).__element__
            : target.__element__,
        __cardinality__: target.__cardinality__,
        __name__: "[]",
        __opkind__: "Infix",
        __args__: [
          proxy,
          isIndex
            ? literalToTypeSet(Number(start))
            : [
                start && literalToTypeSet(Number(start)),
                end && literalToTypeSet(Number(end)),
              ],
        ],
      }) as any;
    }
    return (target as any)[prop];
  },
};

function arrayLikeIndex(this: ExpressionRoot, index: any) {
  const indexTypeSet = literalToTypeSet(index);
  return $expressionify({
    __kind__: ExpressionKind.Operator,
    __element__:
      this.__element__.__kind__ === TypeKind.array
        ? (this.__element__ as ArrayType).__element__
        : this.__element__,
    __cardinality__: cardutil.multiplyCardinalities(
      this.__cardinality__,
      indexTypeSet.__cardinality__
    ),
    __name__: "[]",
    __opkind__: "Infix",
    __args__: [this, indexTypeSet],
  }) as any;
}

function arrayLikeSlice(this: ExpressionRoot, start: any, end: any) {
  const startTypeSet = start && literalToTypeSet(start);
  const endTypeSet = end && literalToTypeSet(end);
  return $expressionify({
    __kind__: ExpressionKind.Operator,
    __element__: this.__element__,
    __cardinality__: cardutil.multiplyCardinalities(
      cardutil.multiplyCardinalities(
        this.__cardinality__,
        startTypeSet?.__cardinality__ ?? Cardinality.One
      ),
      endTypeSet?.__cardinality__ ?? Cardinality.One
    ),
    __name__: "[]",
    __opkind__: "Infix",
    __args__: [this, [startTypeSet, endTypeSet]],
  }) as any;
}

export function $arrayLikeIndexify(_expr: ExpressionRoot) {
  if (
    _expr.__element__.__kind__ === TypeKind.array ||
    (_expr.__element__.__kind__ === TypeKind.scalar &&
      (_expr.__element__.__name__ === "std::str" ||
        _expr.__element__.__name__ === "std::bytes"))
  ) {
    const expr = new Proxy(_expr, arrayLikeProxyHandlers) as any;

    expr.index = arrayLikeIndex.bind(expr);
    expr.slice = arrayLikeSlice.bind(expr);

    return expr;
  }

  return _expr;
}

// ARRAY
export function array<Element extends NonArrayType>(
  element: Element
): ArrayType<Element>;
export function array<
  Expr extends TypeSet<NonArrayType> | scalarLiterals,
  Exprs extends orScalarLiteral<
    TypeSet<
      Expr extends TypeSet
        ? getPrimitiveBaseType<Expr["__element__"]>
        : getPrimitiveBaseType<literalToScalarType<Expr>>
    >
  >[]
>(
  arg: [Expr, ...Exprs]
): $expr_Array<
  ArrayType<
    Expr extends TypeSet
      ? getPrimitiveBaseType<Expr["__element__"]>
      : getPrimitiveBaseType<literalToScalarType<Expr>>
  >,
  cardutil.multiplyCardinalitiesVariadic<
    getCardsFromExprs<mapLiteralToTypeSet<[Expr, ...Exprs]>>
  >
>;
export function array(arg: any) {
  if (Array.isArray(arg)) {
    const items = arg.map((a) => literalToTypeSet(a));
    return $expressionify({
      __kind__: ExpressionKind.Array,
      __cardinality__: cardutil.multiplyCardinalitiesVariadic(
        items.map((item) => item.__cardinality__) as any
      ),
      __element__: {
        __kind__: TypeKind.array,
        __name__: `array<${items[0]!.__element__.__name__}>`,
        __element__: items[0]!.__element__,
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

const tupleProxyHandlers: ProxyHandler<ExpressionRoot> = {
  get(target: ExpressionRoot, prop: string | symbol, proxy: any) {
    const type = target.__element__;
    const items =
      type.__kind__ === TypeKind.tuple
        ? (type as TupleType).__items__
        : type.__kind__ === TypeKind.namedtuple
        ? (type as NamedTupleType).__shape__
        : null;
    return items && Object.prototype.hasOwnProperty.call(items, prop)
      ? tuplePath(proxy, (items as any)[prop], prop as any)
      : (target as any)[prop];
  },
};

export function $tuplePathify(expr: ExpressionRoot) {
  if (
    expr.__element__.__kind__ !== TypeKind.tuple &&
    expr.__element__.__kind__ !== TypeKind.namedtuple
  ) {
    return expr;
  }

  return new Proxy(expr, tupleProxyHandlers);
}

function tuplePath(
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

const typeKinds = new Set(Object.values(TypeKind));

export function tuple<Items extends typeutil.tupleOf<BaseType>>(
  items: Items
): TupleType<Items>;
export function tuple<Items extends typeutil.tupleOf<TypeSet | scalarLiterals>>(
  items: Items
): $expr_Tuple<
  Items extends typeutil.tupleOf<any> ? mapLiteralToTypeSet<Items> : never
>;
export function tuple<Shape extends NamedTupleShape>(
  shape: Shape
): NamedTupleType<Shape>;
export function tuple<Shape extends Record<string, TypeSet | scalarLiterals>>(
  shape: Shape
): $expr_NamedTuple<mapLiteralToTypeSet<Shape>>;
export function tuple(input: any) {
  if (Array.isArray(input)) {
    // is tuple
    if (input.every((item) => typeKinds.has(item.__kind__))) {
      const typeItems = input as BaseType[];
      const typeName = `tuple<${typeItems
        .map((item) => item.__name__)
        .join(", ")}>`;
      return makeTupleType(typeName, typeItems);
    }

    const items = input.map((item) => literalToTypeSet(item));
    const name = `tuple<${items
      .map((item) => item.__element__.__name__)
      .join(", ")}>`;
    return $expressionify({
      __kind__: ExpressionKind.Tuple,
      __element__: makeTupleType(
        name,
        items.map((item) => item.__element__)
      ),
      __cardinality__: cardutil.multiplyCardinalitiesVariadic(
        items.map((i) => i.__cardinality__) as any
      ),
      __items__: items,
    }) as any;
  } else {
    // is named tuple
    if (Object.values(input).every((el: any) => typeKinds.has(el.__kind__))) {
      const typeName = `tuple<${Object.entries(input)
        .map(([key, val]: [string, any]) => `${key}: ${val.__name__}`)
        .join(", ")}>`;
      return {
        __kind__: TypeKind.namedtuple,
        __name__: typeName,
        __shape__: input,
      } as any;
    }

    const exprShape: NamedTupleLiteralShape = {};
    const typeShape: NamedTupleShape = {};
    for (const [key, val] of Object.entries(input)) {
      const typeSet = literalToTypeSet(val);
      exprShape[key] = typeSet;
      typeShape[key] = typeSet.__element__;
    }
    const name = `tuple<${Object.entries(exprShape)
      .map(([key, val]) => `${key}: ${val.__element__.__name__}`)
      .join(", ")}>`;
    return $expressionify({
      __kind__: ExpressionKind.NamedTuple,
      __element__: {
        __kind__: TypeKind.namedtuple,
        __name__: name,
        __shape__: typeShape,
      } as any,
      __cardinality__: cardutil.multiplyCardinalitiesVariadic(
        Object.values(exprShape).map((val) => val.__cardinality__) as any
      ),
      __shape__: exprShape,
    }) as any;
  }
}

type PropertyNamesFromPointers<Pointers extends ObjectTypePointers> = {
  [k in keyof Pointers as Pointers[k] extends PropertyDesc
    ? Pointers[k]["computed"] extends true
      ? never
      : k
    : never]: Pointers[k];
};

export function $objectTypeToTupleType<Expr extends ObjectTypeExpression>(
  objectType: Expr
): PropertyNamesFromPointers<
  Expr["__element__"]["__pointers__"]
> extends infer Pointers
  ? Pointers extends ObjectTypePointers
    ? NamedTupleType<{
        [k in keyof Pointers as k extends "id"
          ? never
          : k]: Pointers[k]["target"];
      }>
    : never
  : never;
export function $objectTypeToTupleType<
  Expr extends ObjectTypeExpression,
  Fields extends keyof PropertyNamesFromPointers<
    Expr["__element__"]["__pointers__"]
  >
>(
  objectType: Expr,
  includeFields: Fields[]
): NamedTupleType<{
  [k in Fields]: Expr["__element__"]["__pointers__"][k] extends PropertyDesc
    ? Expr["__element__"]["__pointers__"][k]["target"]
    : never;
}>;
export function $objectTypeToTupleType(...args: any[]): any {
  const [objExpr, fields] = args as [
    ObjectTypeExpression,
    string[] | undefined
  ];
  const shape = Object.entries(objExpr.__element__.__pointers__).reduce(
    (_shape, [key, val]) => {
      if (
        fields?.length
          ? fields.includes(key)
          : key !== "id" && val.__kind__ === "property" && !val.computed
      ) {
        _shape[key] = val.target;
      }
      return _shape;
    },
    {} as NamedTupleShape
  );
  return tuple(shape);
}
