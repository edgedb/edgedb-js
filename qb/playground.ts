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

const oneHero = e.select(e.Hero).limit(1);
const singleHero = e.eq(e.Hero, oneHero);
