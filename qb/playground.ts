// tslint:disable:no-console
import e from "./generated/example";
import * as edgedb from "edgedb";

// async function run() {
//   const asdf = await edgedb.connect();
//   const pool = await edgedb.createPool();
//   pool.query<{asdf: string}>(`asdf`);
//   asdf.query<{asdf: string}>(`asdf`);
// }
const q1 = e.select(
  e.Person,
  {
    id: true,
    qwer: e.plus(e.int64(1234), e.int64(1)),
  },
  e.is(e.Hero, {
    secret_identity: true,
  }),
  e.is(e.Villain, {
    nemesis: {name: true},
  })
);
type q1 = typeof q1;

console.log(q1);

// e.Hero.name.

const asdf = q1
  .filter(e.eq(e.Person.name, e.str("Iron Man")))
  .orderBy(e.Person.name, e.DESC, e.EMPTY_FIRST)
  .offset(e.set(e.$int64))
  .limit(e.int64(10));
type asdf = typeof asdf["__expr__"];

const one = e.std.int64(1);
const single = q1.limit(one);
// console.log(asdf.toEdgeQL());
console.log(e.select(asdf).toEdgeQL());
