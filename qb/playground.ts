// tslint:disable:no-console
// import {select, selectParams, simpleShape} from "@syntax/select";
import * as e from "./generated/example";
// import {is, select} from "../src/syntax/syntax";
// import {argv} from "process";

e.str("asdf");
e.bigint(BigInt(1234));

e.$Array(e.$Str);
e.$NamedTuple({asdf: e.$Str});
const asdf = e.$UnnamedTuple([e.$Str]);
e.literal(asdf, ["asdf"]);

e.cast(e.$Str, e.int64(1234));
e.set(e.Hero, e.Villain);

e.select(e.Hero, {
  villains: {nemesis: {villains: {nemesis: true}}},
});

const villainShape = e.is(e.Villain, {
  nemesis: {name: true},
});

const q2 = e.select(
  e.Person,
  {
    id: true,
    name: true,
    computed: e.str("person"),
  },
  e.is(e.Hero, {
    secret_identity: true,
  }),
  e.is(e.Villain, {
    nemesis: {name: true},
  })
);
type q2 = typeof q2["__element__"]["__tstype__"];

/*
{
    id: string;
    name: string;
    computed: "asdfsadf";
    secret_identity: string | null;
    computed: ["asdfsadf", ..."asdfsadf"[]];
    nemesis: {
        ...;
    };
}
*/

const result = e.select(e.Hero);
type result = typeof result["__element__"]["__tstype__"];

const asldfkj = e.select(e.str("asdf"));
type asldfkj = typeof asldfkj["__element__"]["__tstype__"];

const q3 = e.select(q2, {
  id: true,
  name: true,
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
function test(arg: any, _b: any) {
  return "asdf" as any;
}
const a = test({shape: myshape}, {a: true});
const b = test({nested: myshape}, {b: true});
