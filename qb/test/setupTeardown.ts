import * as edgedb from "edgedb/src/index.node";

// insert tony
// insert cap
// insert spidey
// insert thanos
// insert doc ock
// insert "The Avengers"
type depromisify<T> = T extends Promise<infer U> ? U : T;
export type TestData = depromisify<ReturnType<typeof setupTests>>;
export async function setupTests() {
  interface Hero {
    id: string;
    name: string;
    secret_identity: string;
  }
  interface Villain {
    id: string;
    name: string;
    nemesis: {id: string; name: string};
  }
  interface Movie {
    id: string;
    title: string;
    genre: string;
    characters: {id: string}[];
  }
  // tslint:disable-next-line: no-console
  console.log(`Seeding database...`);
  const pool = await edgedb.createPool();
  const ironMan: Hero = await pool.queryOne(`SELECT (INSERT Hero {
  name := "Iron Man",
  secret_identity := "Tony Stark"
}) {id, name, secret_identity}`);
  console.log(JSON.stringify(ironMan, null, 2));

  const cap: Hero = await pool.queryOne(`SELECT (INSERT Hero {
  name := "Captain America",
  secret_identity := "Steve Rogers"
}) { id, name, secret_identity }`);
  console.log(JSON.stringify(cap, null, 2));
  const spidey: Hero = await pool.queryOne(`SELECT (INSERT Hero {
  name := "Spider-Man",
  secret_identity := "Peter Parket"
}) { id, name, secret_identity }`);
  console.log(JSON.stringify(cap, null, 2));
  const thanos: Villain = await pool.queryOne(
    `SELECT (INSERT Villain {
  name := "Thanos",
  nemesis := (SELECT Hero FILTER .id = <uuid>$nemesis_id)
}) { id, name, nemesis: { id, name }}`,
    {nemesis_id: ironMan.id}
  );
  console.log(JSON.stringify(thanos, null, 2));
  const docock: Villain = await pool.queryOne(
    `SELECT (INSERT Villain {
  name := "Doc Ock",
  nemesis := (SELECT Hero FILTER .id = <uuid>$nemesis_id)
}) {id, name, nemesis: { id, name }}`,
    {nemesis_id: spidey.id}
  );
  console.log(JSON.stringify(docock, null, 2));
  const avengers: Movie = await pool.queryOne(
    `WITH char_ids := array_unpack(<array<uuid>>$character_ids)
INSERT Movie {
  title := "The Avengers",
  rating := 10,
  genre := Genre.Action,
  characters := (SELECT Hero FILTER .id IN char_ids)
}`,
    {character_ids: [ironMan.id, cap.id]}
  );
  console.log(avengers);

  return {
    ironMan,
    cap,
    spidey,
    thanos,
    docock,
    avengers,
  };
}

export async function teardownTests() {
  // tslint:disable-next-line: no-console
  console.log(`Deleting database contents...`);
  const pool = await edgedb.createPool();

  await pool.execute(`DELETE \`S p a M\``);
  await pool.execute(`DELETE A`);
  await pool.execute(`DELETE Łukasz`);
  await pool.execute(`DELETE Bag;`);
  await pool.execute(`DELETE Simple;`);
  await pool.execute(`DELETE Movie;`);
  await pool.execute(`DELETE Villain;`);
  await pool.execute(`DELETE Hero;`);

  await pool.close();

  return "done";
}
