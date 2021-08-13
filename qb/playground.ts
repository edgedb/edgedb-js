// tslint:disable:no-console
import e from "./generated/example";
import * as edgedb from "edgedb";

// async function run() {
//   const asdf = await edgedb.connect();
//   const pool = await edgedb.createPool();
//   pool.query<{asdf: string}>(`asdf`);
//   asdf.query<{asdf: string}>(`asdf`);
// }

// select Movie filter .title = 'asdf'; // not exclusive
// select Movie filter .profile = p; // exclusive
// select Profile filter .<profile[IS Movie] = p; // exclusive
// select Person filter .<owner[IS Shirt] = ; // not exclusive
// select Shirt filter .<shirts[IS Person] = p; // not exclusive

console.log(e.Hero);
const heroMovie = e.Hero["<characters[IS default::Movie]"];
console.log(heroMovie.toEdgeQL());

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
  .offset(e.set(e.int64(4)))
  .limit(e.int64(10));
type asdf = typeof asdf["__expr__"];

const one = e.std.int64(1);
const single = q1.limit(one);
// console.log(asdf.toEdgeQL());
console.log(e.select(asdf).toEdgeQL());

console.log(e.sys.VersionStage);
console.log(e.sys.VersionStage.dev);
console.log(e.sys.VersionStage("alpha"));
console.log(e.sys.VersionStage("beta").toEdgeQL());

const simpleFor = e.for(e.set(e.int64(1), e.int64(2), e.int64(3)), (x) =>
  e.mult(x, e.int32(2))
);

console.log(simpleFor);
console.log(simpleFor.toEdgeQL());

const abc = e.set(e.str("a"), e.str("b"), e.str("c"));
const nestedFor = e.for(abc, (x) =>
  e.for(e.int64(3), (n) => e.concat(x, e.cast(e.str, n)))
);

console.log(nestedFor.toEdgeQL());
