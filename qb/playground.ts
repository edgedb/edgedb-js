// tslint:disable:no-console
// import {select, selectParams, simpleShape} from "@syntax/select";
import * as e from "./generated/example";

import {reflection as $} from "edgedb";

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

const qwer = e.select(
  e.Person,
  {
    id: true,
    __type__: {
      id: true,
      name: true,
    },
    name: 1 > 0,
  },
  e.shape(e.Hero, {secret_identity: true, kind: e.str("hero")}),
  e.shape(e.Villain, {
    kind: e.str("villain"),
    nemesis: {id: true},
    name: true,
  })
);
console.log(qwer.toEdgeQL());
