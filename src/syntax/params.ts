import {
  Expression,
  ExpressionKind,
  BaseExpression,
  ParamType,
  Cardinality,
  TypeKind,
} from "reflection";
import {$expressionify} from "./path";

export type $expr_WithParams<
  Params extends {
    [key: string]: ParamType;
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
    [key: string]: ParamType;
  }
> = {
  [key in keyof Params]: Params[key] extends ParamType
    ? Params[key]["__tstype__"]
    : never;
};

export type $expr_Param<
  Name extends string | number | symbol = string,
  Type extends ParamType = ParamType
> = Expression<{
  __kind__: ExpressionKind.Param;
  __element__: Type;
  __cardinality__: ParamType extends Type
    ? Cardinality.AtMostOne | Cardinality.One
    : undefined extends Type["__tstype__"]
    ? Cardinality.AtMostOne
    : Cardinality.One;
  __name__: Name;
}>;

type paramsToParamExprs<
  Params extends {
    [key: string]: ParamType;
  }
> = {
  [key in keyof Params]: Params[key] extends ParamType
    ? $expr_Param<key, Params[key]>
    : never;
};

export function withParams<
  Params extends {
    [key: string]: ParamType;
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
      __element__: param,
      __cardinality__:
        param.__kind__ === TypeKind.scalar &&
        param.__name__.includes("OPTIONAL")
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
