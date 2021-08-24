import * as edgedb from "edgedb/src/index.node";

// insert tony
// insert cap
// insert spidey
// insert thanos
// insert doc ock
// insert "The Avengers"
type depromisify<T> = T extends Promise<infer U> ? U : T;
export type TestData = depromisify<ReturnType<typeof setupTests>>;

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

export async function setupTests() {
  await teardownTests();

  // tslint:disable-next-line: no-console
  console.log(`Seeding database...`);
  const pool = await edgedb.createPool();
  const iron_man: Hero = await pool.queryOne(`SELECT (INSERT Hero {
  name := "Iron Man",
  secret_identity := "Tony Stark"
}) {id, name, secret_identity}`);

  const cap: Hero = await pool.queryOne(`SELECT (INSERT Hero {
  name := "Captain America",
  secret_identity := "Steve Rogers"
}) { id, name, secret_identity }`);

  const spidey: Hero = await pool.queryOne(`SELECT (INSERT Hero {
  name := "Spider-Man",
  secret_identity := "Peter Parket"
}) { id, name, secret_identity }`);

  const thanos: Villain = await pool.queryOne(
    `SELECT (INSERT Villain {
  name := "Thanos",
  nemesis := (SELECT Hero FILTER .id = <uuid>$nemesis_id)
}) { id, name, nemesis: { id, name }}`,
    {nemesis_id: iron_man.id}
  );

  const docock: Villain = await pool.queryOne(
    `SELECT (INSERT Villain {
  name := "Doc Ock",
  nemesis := (SELECT Hero FILTER .id = <uuid>$nemesis_id)
}) {id, name, nemesis: { id, name }}`,
    {nemesis_id: spidey.id}
  );

  const the_avengers: Movie = await pool.queryOne(
    `WITH char_ids := array_unpack(<array<uuid>>$character_ids)
SELECT (INSERT Movie {
  title := "The Avengers",
  rating := 10,
  genre := Genre.Action,
  characters := (SELECT Hero FILTER .id IN char_ids)
}) {id, title, rating, genre, characters: {id}};`,
    {character_ids: [iron_man.id, cap.id]}
  );
  const civil_war: Movie = await pool.queryOne(
    `SELECT (INSERT Movie {
  title := "Captain America: Civil War",
  rating := 10,
  genre := Genre.Action,
  characters := (SELECT Hero)
}) {id, title, rating, genre, characters: {id}};`
  );

  await pool.close();

  return {
    iron_man,
    cap,
    spidey,
    thanos,
    docock,
    the_avengers,
    civil_war,
  };
}

export async function teardownTests() {
  // tslint:disable-next-line: no-console
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
  // tslint:disable-next-line: no-console
  return "done";
}
