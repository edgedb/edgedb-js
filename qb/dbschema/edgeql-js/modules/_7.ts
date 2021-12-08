import { $ } from "edgedb";
import * as _ from "../imports";
import * as _default from "./default";
type _617906a8522211ec9ee61f9c66f184eaλFuncExpr<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<_default.$_616dff56522211ec8244db8a94893b78>>,
> = $.$expr_Function<
  "💯💯💯::🚀🙀🚀",
  _.castMaps.mapLiteralToTypeSet<[P1]>,
  {},
  $.TypeSet<_default.$_616dff56522211ec8244db8a94893b78, _.castMaps.literalToTypeSet<P1>["__cardinality__"]>
>;
function _617906a8522211ec9ee61f9c66f184ea<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<_default.$_616dff56522211ec8244db8a94893b78>>,
>(
  _0: P1,
): _617906a8522211ec9ee61f9c66f184eaλFuncExpr<P1>;
function _617906a8522211ec9ee61f9c66f184ea(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('💯💯💯::🚀🙀🚀', args, _.spec, [
    {args: [{typeId: "616dff56-5222-11ec-8244-db8a94893b78", optional: false, setoftype: false, variadic: false}], returnTypeId: "616dff56-5222-11ec-8244-db8a94893b78"},
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
  "🚀🙀🚀": typeof _617906a8522211ec9ee61f9c66f184ea
};
const __defaultExports: __defaultExports = {
  "🚀🙀🚀": _617906a8522211ec9ee61f9c66f184ea
};
export default __defaultExports;
