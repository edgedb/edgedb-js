import type {Executor} from "edgedb";
import {
  Expression,
  ExpressionKind,
  ParamType,
  Cardinality,
  setToTsType,
  TypeSet,
  unwrapCastableType,
  TypeKind,
  BaseTypeToTsType,
} from "../reflection";
import {$expressionify} from "./path";

export type $expr_OptionalParam<Type extends ParamType = ParamType> = {
  __kind__: ExpressionKind.OptionalParam;
  __type__: Type;
};

export function optional<Type extends ParamType>(
  type: Type
): $expr_OptionalParam<Type> {
  return {
    __kind__: ExpressionKind.OptionalParam,
    __type__: type,
  };
}

export type QueryableWithParamsExpression<
  Set extends TypeSet = TypeSet,
  Params extends {
    [key: string]: ParamType | $expr_OptionalParam;
  } = {}
> = Expression<Set, false> & {
  run(
    cxn: Executor,
    args: paramsToParamArgs<Params>
  ): Promise<setToTsType<Set>>;
};

export type $expr_WithParams<
  Params extends {
    [key: string]: ParamType | $expr_OptionalParam;
  } = {},
  Expr extends Expression = Expression
> = QueryableWithParamsExpression<
  {
    __kind__: ExpressionKind.WithParams;
    __element__: Expr["__element__"];
    __cardinality__: Expr["__cardinality__"];
    __expr__: Expr;
    __params__: $expr_Param[];
  },
  Params
>;

type paramsToParamArgs<
  Params extends {
    [key: string]: ParamType | $expr_OptionalParam;
  }
> = {
  [key in keyof Params as Params[key] extends ParamType
    ? key
    : never]: Params[key] extends ParamType
    ? BaseTypeToTsType<Params[key]>
    : never;
} & {
  [key in keyof Params as Params[key] extends $expr_OptionalParam
    ? key
    : never]?: Params[key] extends $expr_OptionalParam
    ? BaseTypeToTsType<Params[key]["__type__"]> | null
    : never;
};

export type $expr_Param<
  Name extends string | number | symbol = string,
  Type extends ParamType = ParamType,
  Optional extends boolean = boolean
> = Expression<{
  __kind__: ExpressionKind.Param;
  __element__: unwrapCastableType<Type>;
  __cardinality__: Optional extends true
    ? Cardinality.AtMostOne
    : Cardinality.One;
  __name__: Name;
  __isComplex__: boolean;
}>;

type paramsToParamExprs<
  Params extends {
    [key: string]: ParamType | $expr_OptionalParam;
  }
> = {
  [key in keyof Params]: Params[key] extends $expr_OptionalParam
    ? $expr_Param<key, Params[key]["__type__"], true>
    : Params[key] extends ParamType
    ? $expr_Param<key, Params[key], false>
    : never;
};

const complexParamKinds = new Set([TypeKind.tuple, TypeKind.namedtuple]);

export function params<
  Params extends {
    [key: string]: ParamType | $expr_OptionalParam;
  } = {},
  Expr extends Expression = Expression
>(
  paramsDef: Params,
  expr: (params: paramsToParamExprs<Params>) => Expr
): $expr_WithParams<Params, Expr> {
  const paramExprs: {[key: string]: $expr_Param} = {};
  for (const [key, param] of Object.entries(paramsDef)) {
    const paramType =
      param.__kind__ === ExpressionKind.OptionalParam ? param.__type__ : param;
    const isComplex =
      complexParamKinds.has(paramType.__kind__) ||
      (paramType.__kind__ === TypeKind.array &&
        complexParamKinds.has(paramType.__element__.__kind__));
    paramExprs[key] = $expressionify({
      __kind__: ExpressionKind.Param,
      __element__: paramType,
      __cardinality__:
        param.__kind__ === ExpressionKind.OptionalParam
          ? Cardinality.AtMostOne
          : Cardinality.One,
      __name__: key,
      __isComplex__: isComplex,
    }) as any;
  }

  const returnExpr = expr(paramExprs as any);

  return $expressionify({
    __kind__: ExpressionKind.WithParams,
    __element__: returnExpr.__element__,
    __cardinality__: returnExpr.__cardinality__,
    __expr__: returnExpr,
    __params__: Object.values(paramExprs),
  }) as any;
}

function jsonStringify(type: ParamType, val: any): string {
  if (type.__kind__ === TypeKind.array) {
    if (Array.isArray(val)) {
      return `[${val
        .map(item => jsonStringify(type.__element__, item))
        .join()}]`;
    }
    throw new Error(`Param with array type is not an array`);
  }
  if (type.__kind__ === TypeKind.tuple) {
    if (!Array.isArray(val)) {
      throw new Error(`Param with tuple type is not an array`);
    }
    if (val.length !== type.__items__.length) {
      throw new Error(
        `Param with tuple type has incorrect number of items. Got ${val.length} expected ${type.__items__.length}`
      );
    }
    return `[${val
      .map((item, i) => jsonStringify(type.__items__[i], item))
      .join()}]`;
  }
  if (type.__kind__ === TypeKind.namedtuple) {
    if (typeof val !== "object") {
      throw new Error(`Param with named tuple type is not an object`);
    }
    if (Object.keys(val).length !== Object.keys(type.__shape__).length) {
      throw new Error(
        `Param with named tuple type has incorrect number of items. Got ${
          Object.keys(val).length
        } expected ${Object.keys(type.__shape__).length}`
      );
    }
    return `{${Object.entries(val)
      .map(([key, item]) => {
        if (!type.__shape__[key]) {
          throw new Error(
            `Unexpected key in named tuple param: ${key}, expected keys: ${Object.keys(
              type.__shape__
            ).join()}`
          );
        }
        return `"${key}": ${jsonStringify(type.__shape__[key], item)}`;
      })
      .join()}}`;
  }
  if (
    type.__kind__ === TypeKind.scalar
    // || type.__kind__ === TypeKind.castonlyscalar
  ) {
    switch (type.__name__) {
      case "std::bigint":
        return val.toString();
      case "std::json":
        return val;
      case "std::bytes":
        return `"${val.toString("base64")}"`;
      case "cfg::memory":
        return `"${val.toString()}"`;
      default:
        return JSON.stringify(val);
    }
  }
  throw new Error(`Invalid param type: ${(type as any).__kind__}`);
}

export function jsonifyComplexParams(expr: any, _args: any) {
  if (_args && expr.__kind__ === ExpressionKind.WithParams) {
    const args = {..._args};
    for (const param of (expr as $expr_WithParams).__params__) {
      if (param.__isComplex__) {
        args[param.__name__] = jsonStringify(
          param.__element__ as any,
          args[param.__name__]
        );
      }
    }

    return args;
  }
  return _args;
}
