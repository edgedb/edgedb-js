import { $ } from "edgedb";
import * as _ from "../imports.mjs";
import type * as _default from "./default.mjs";
type _b50a35a806ef11edb10303fe27bec226λFuncExpr<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<_default.$_b5016c1606ef11edb2bb3bd5ba8089d5>>,
> = $.$expr_Function<
  "💯💯💯::🚀🙀🚀",
  _.castMaps.mapLiteralToTypeSet<[P1]>,
  {},
  $.TypeSet<_default.$_b5016c1606ef11edb2bb3bd5ba8089d5, $.cardinalityUtil.paramCardinality<P1>>
>;
function _b50a35a806ef11edb10303fe27bec226<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<_default.$_b5016c1606ef11edb2bb3bd5ba8089d5>>,
>(
  _0: P1,
): _b50a35a806ef11edb10303fe27bec226λFuncExpr<P1>;
function _b50a35a806ef11edb10303fe27bec226(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('💯💯💯::🚀🙀🚀', args, _.spec, [
    {args: [{typeId: "b5016c16-06ef-11ed-b2bb-3bd5ba8089d5", optional: false, setoftype: false, variadic: false}], returnTypeId: "b5016c16-06ef-11ed-b2bb-3bd5ba8089d5"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "💯💯💯::🚀🙀🚀",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};



type __defaultExports = {
  "🚀🙀🚀": typeof _b50a35a806ef11edb10303fe27bec226
};
const __defaultExports: __defaultExports = {
  "🚀🙀🚀": _b50a35a806ef11edb10303fe27bec226
};
export default __defaultExports;
