// tslint:disable:no-console
import e, {cast, set, $Array, literal} from "./generated/example";

const asdf = set(e.int16(15), e.int16(15));
const cast1 = cast(e.$int32, asdf);
console.log(cast1);

const cast2 = cast(e.$float32, e.float64(3.14));
console.log(cast2);

console.log(e.len(set(e.$bytes)).toEdgeQL());

const haystack = literal($Array(e.$str), ["hello", "world"]);
// @ts-expect-error
e.contains(haystack, e.int32(5));

const func = e.contains(haystack, set(e.str("world"), e.str("hello")));
console.log(func);

console.log(func.toEdgeQL());

const variadicFunc = e.json_get(e.json("json"), e.str("some"), e.str("path"));

console.log(variadicFunc);
console.log(variadicFunc.toEdgeQL());

const namedVariadicFunc = e.json_get(
  {default: e.json("defaultjson")},
  e.json("json"),
  e.str("some"),
  e.str("path")
);

console.log(namedVariadicFunc);
console.log(namedVariadicFunc.toEdgeQL());
