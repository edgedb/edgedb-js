import {
  Expression,
  ExpressionKind,
  BaseExpression,
  ParamType,
  Cardinality,
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

export type $expr_WithParams<
  Params extends {
    [key: string]: ParamType | $expr_OptionalParam;
  } = {},
  Expr extends BaseExpression = BaseExpression
> = Expression<{
  __kind__: ExpressionKind.WithParams;
  __element__: Expr["__element__"];
  __cardinality__: Expr["__cardinality__"];
  __expr__: Expr;
  __paramststype__: paramsToParamTypes<Params>;
}>;

type paramsToParamTypes<
  Params extends {
    [key: string]: ParamType | $expr_OptionalParam;
  }
> = {
  [key in keyof Params]: Params[key] extends $expr_OptionalParam
    ? Params[key]["__type__"]["__tstype__"] | null
    : Params[key] extends ParamType
    ? Params[key]["__tstype__"]
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
  Expr extends BaseExpression = BaseExpression
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

  return $expressionify({
    __kind__: ExpressionKind.WithParams,
    __element__: returnExpr.__element__,
    __cardinality__: returnExpr.__cardinality__,
    __expr__: returnExpr,
  }) as any;
}
