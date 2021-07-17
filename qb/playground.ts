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
  shapeExprToParams,
} from "reflection";

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

// e.$Hero.__shape__.__type__.name;
// e.default.Hero;

const query = e.select(
  e.Person,
  {
    id: true,
    __type__: {
      id: true,
      name: true,
    },
    name: 1 > 0,
    computed: e.str("person"),
  }
  // e.shape(e.Hero, {secret_identity: true, __type__: {name: true}}),
  // e.shape(e.Villain, {
  //   nemesis: {id: true},
  //   name: true,
  // })
).__element__.__tstype__;

const q2 = e.select(e.Villain, {
  // number_of_movies: true,
  name: true,
  id: true,
});

type aldkjflds = exprToSelectParams<typeof q2>;

type kljgfg = typeof q2["__element__"]["__root__"];

type lakjdsfd = shapeExprToParams<typeof q2>;

const q3 = e.select(q2, {id: true});
const q4 = e.select(e.Hero, {id: true, name: true});
// const q3 = e.select(e.Hero, {id: true});

type params = selectParams<typeof q2>;
type lkjlk = typeof q2["__element__"]["__root__"]["__shape__"];
const asfdf = e.select(q2, {}).__element__.__tstype__;

const qwers = e.select(e.Movie, {
  title: true,
  id: true,
  characters: {
    name: true,
    "@ac": true,
  },
}).__element__.__tstype__;
