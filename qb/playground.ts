// tslint:disable:no-console
// import {select, selectParams, simpleShape} from "@syntax/select";
import * as e from "./generated/example";

import {reflection as $} from "edgedb";
import {
  BaseExpression,
  exprToSelectParams,
  linkDescShape,
  ObjectTypeExpression,
  Poly,
  selectParams,
  shapeExprToSelectParams,
} from "reflection";
import {select} from "@syntax/select";
import {argv} from "process";

e.str("asdf");
e.bigint(BigInt(1234));

e.$Array(e.$Str);
e.$NamedTuple({asdf: e.$Str});
const asdf = e.$UnnamedTuple([e.$Str]);
e.literal(asdf, ["asdf"]);

e.cast(e.$Str, e.int64(1234));
e.set(e.Hero, e.Villain);

select(e.Hero, {
  villains: {nemesis: {villains: {nemesis: true}}},
});

// e.$Hero.__shape__.__type__.name;
// e.default.Hero;

const q2 = select(e.Villain, {
  id: true,
  name: 1 > 0,
  nemesis: {id: true},
  computed: e.str("person"),
});
type q2 = typeof q2["__element__"]["__tstype__"];

const q3 = select(q2, {
  id: true,
  name: 1 > 0,
  nemesis: {id: true},
  computed: e.str("person"),
});
type q3 = typeof q3["__element__"]["__tstype__"];

const myshape = {a: "asdf", b: "qwer"};
function test<
  A extends {shape: object},
  T extends {[k in keyof A["shape"]]?: true}
>(a: A, arg: T): T;
function test<
  A extends {nested: object},
  T extends {[k in keyof A["nested"]]?: true}
>(a: A, arg: T): T;
function test(arg: any, b: any) {
  return "asdf" as any;
}
const a = test({shape: myshape}, {a: true});
const b = test({nested: myshape}, {b: true});
