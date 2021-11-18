import type {Executor} from "edgedb";
import {
  Expression,
  ExpressionKind,
  ParamType,
  Cardinality,
  ScalarType,
  ArrayType,
  setToTsType,
  TypeSet,
} from "../reflection";
import {$expressionify} from "./path";
import {$queryify} from "./query";

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
> = Expression<Set> & {
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
    __paramststype__: paramsToParamTypes<Params>;
  },
  Params
>;

type getParamTsType<Param extends ParamType> = Param extends ScalarType
  ? Param["__tstype__"]
  : Param extends ArrayType
  ? Param["__element__"]["__tstype__"][]
  : never;

type paramsToParamTypes<
  Params extends {
    [key: string]: ParamType | $expr_OptionalParam;
  }
> = {
  [key in keyof Params]: Params[key] extends $expr_OptionalParam
    ? getParamTsType<Params[key]["__type__"]> | null
    : Params[key] extends ParamType
    ? getParamTsType<Params[key]>
    : never;
};

type paramsToParamArgs<
  Params extends {
    [key: string]: ParamType | $expr_OptionalParam;
  }
> = {
  [key in keyof Params as Params[key] extends ParamType
    ? key
    : never]: Params[key] extends ParamType
    ? getParamTsType<Params[key]>
    : never;
} &
  {
    [key in keyof Params as Params[key] extends $expr_OptionalParam
      ? key
      : never]?: Params[key] extends $expr_OptionalParam
      ? getParamTsType<Params[key]["__type__"]> | null
      : never;
  };

export type $expr_Param<
  Name extends string | number | symbol = string,
  Type extends ParamType = ParamType,
  Optional extends boolean = boolean
> = Expression<{
  __kind__: ExpressionKind.Param;
  __element__: Type;
  __cardinality__: Optional extends true
    ? Cardinality.AtMostOne
    : Cardinality.One;
  __name__: Name;
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

export function withParams<
  Params extends {
    [key: string]: ParamType | $expr_OptionalParam;
  } = {},
  Expr extends Expression = Expression
>(
  params: Params,
  expr: (params: paramsToParamExprs<Params>) => Expr
): $expr_WithParams<Params, Expr> {
  const paramExprs: {[key: string]: $expr_Param} = {};
  for (const [key, param] of Object.entries(params)) {
    paramExprs[key] = $expressionify({
      __kind__: ExpressionKind.Param,
      __element__:
        param.__kind__ === ExpressionKind.OptionalParam
          ? param.__type__
          : param,
      __cardinality__:
        param.__kind__ === ExpressionKind.OptionalParam
          ? Cardinality.AtMostOne
          : Cardinality.One,
      __name__: key,
    });
  }

  const returnExpr = expr(paramExprs as any);

  return $expressionify(
    $queryify({
      __kind__: ExpressionKind.WithParams,
      __element__: returnExpr.__element__,
      __cardinality__: returnExpr.__cardinality__,
      __expr__: returnExpr,
    })
  ) as any;
}
