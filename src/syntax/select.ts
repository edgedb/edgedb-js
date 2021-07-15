import {
  BaseExpression,
  ExpressionKind,
  LinkDesc,
  linkToTsType,
  ObjectType,
  ObjectTypeExpression,
  ObjectTypeShape,
  PropertyDesc,
  propToTsType,
  setToTsType,
  shapeElementToTsType,
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

export type selectParams<
  T extends BaseExpression
> = T["__element__"] extends ObjectType
  ? shapeToSelectParams<T["__element__"]["__shape__"]>
  : {};

export type shapeToSelectParams<Shape extends ObjectTypeShape> = Partial<
  {
    [k in keyof Shape]: Shape[k] extends PropertyDesc
      ? boolean
      : Shape[k] extends LinkDesc
      ?
          | true
          | (shapeToSelectParams<Shape[k]["target"]["__shape__"]> &
              linkDescShape<Shape[k]>)
      : any;
  }
>;

export type linkDescShape<Link extends LinkDesc> = addAtSigns<
  Link["properties"]
> extends ObjectTypeShape
  ? shapeToSelectParams<addAtSigns<Link["properties"]>>
  : never;

export type addAtSigns<T> = {[k in string & keyof T as `@${k}`]: T[k]};

export type $expr_Select<
  Expr extends BaseExpression = BaseExpression,
  Params extends selectParams<Expr> = selectParams<Expr>,
  Polys extends Poly[] = Poly[]
  // Filters extends BaseExpression[] = BaseExpression[],
  // OrderBys extends OrderBy[] = OrderBy[],
  // Limit extends BaseExpression | null = BaseExpression | null,
  // Offset extends BaseExpression | null = BaseExpression | null
> = BaseExpression<{
  __element__: Expr["__element__"];
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
  __tstype__: computeSelectShape<Expr, Params, Polys>;
};

// type mergeObjects<A, B> = typeutil.flatten<A & B>;
// type mergeObjectsVariadic<T> = T extends []
//   ? never
//   : T extends [infer U]
//   ? U
//   : T extends [infer A, infer B, ...infer Rest]
//   ? mergeObjectsVariadic<[mergeObjects<A, B>, ...Rest]>
//   : never;

type computeSelectShape<
  Expr extends BaseExpression = BaseExpression,
  Params extends selectParams<Expr> = selectParams<Expr>,
  Polys extends Poly[] = Poly[]
> = Expr extends infer U
  ? U extends ObjectTypeExpression
    ? simpleShape<U, Params> extends infer BaseShape
      ? Polys[number] extends infer P
        ? P extends Poly
          ? typeutil.flatten<BaseShape & simpleShape<P["is"], P["params"]>>
          : unknown
        : unknown
      : never
    : never
  : never;

// if object: compute type from shape
// else: return ts representation of expression
export type simpleShape<
  Expr extends ObjectTypeExpression,
  Params
> = Expr extends ObjectTypeExpression
  ? {
      [k in string &
        keyof Params]: k extends keyof Expr["__element__"]["__shape__"]
        ? Params[k] extends true
          ? shapeElementToTsTypeSimple<Expr["__element__"]["__shape__"][k]>
          : Params[k] extends false
          ? never
          : Params[k] extends boolean
          ?
              | shapeElementToTsType<Expr["__element__"]["__shape__"][k]>
              | undefined
          : Params[k] extends object
          ? Expr["__element__"]["__shape__"][k]["target"] extends ObjectType
            ? simpleShape<
                {
                  __cardinality__: Expr["__element__"]["__shape__"][k]["cardinality"];
                  __element__: Expr["__element__"]["__shape__"][k]["target"];
                  toEdgeQL: any;
                },
                Params[k]
              >
            : never
          : never
        : Params[k] extends infer U
        ? U extends TypeSet
          ? setToTsType<U>
          : never
        : "invalid key";
    }
  : setToTsType<Expr>;

export type shapeElementToTsTypeSimple<
  El extends PropertyDesc | LinkDesc
> = El extends PropertyDesc
  ? propToTsType<El>
  : El extends LinkDesc<any, any, any>
  ? {id: string}
  : never;

export type Poly<Expr extends ObjectTypeExpression = ObjectTypeExpression> = {
  is: Expr;
  params: selectParams<Expr>;
};
export function shape<
  Expr extends ObjectTypeExpression,
  Params extends selectParams<Expr>
>(expr: Expr, params: Params) {
  return {is: expr, params};
}

export function select<
  Expr extends ObjectTypeExpression,
  Params extends selectParams<Expr>,
  PolyExpr extends ObjectTypeExpression,
  Polys extends Poly<PolyExpr>[]
>(
  expr: Expr,
  params: Params,
  ...polys: Polys
): $expr_Select<Expr, Params, Polys>;
export function select(expr: any, params: any, ...polys: any[]) {
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
