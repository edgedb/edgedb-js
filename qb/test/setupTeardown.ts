import * as tc from "conditional-type-checks";
import {Client, createClient} from "edgedb";

export {tc};

// insert tony
// insert cap
// insert spidey
// insert thanos
// insert doc ock
// insert "The Avengers"
type depromisify<T> = T extends Promise<infer U> ? U : T;
export type TestData = depromisify<ReturnType<typeof setupTests>>["data"];

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
  const client = createClient();

  await cleanupData(client);

  const iron_man: Hero =
    await client.queryRequiredSingle(`SELECT (INSERT Hero {
  name := "Iron Man",
  secret_identity := "Tony Stark"
}) {id, name, secret_identity}`);

  const cap: Hero = await client.queryRequiredSingle(`SELECT (INSERT Hero {
  name := "Captain America",
  secret_identity := "Steve Rogers"
}) { id, name, secret_identity }`);

  const spidey: Hero = await client.queryRequiredSingle(`SELECT (INSERT Hero {
  name := "Spider-Man",
  secret_identity := "Peter Parker"
}) { id, name, secret_identity }`);

  const thanos: Villain = await client.queryRequiredSingle(
    `SELECT (INSERT Villain {
  name := "Thanos",
  nemesis := (SELECT Hero FILTER .id = <uuid>$nemesis_id)
}) { id, name, nemesis: { id, name }}`,
    {nemesis_id: iron_man.id}
  );

  const docOck: Villain = await client.queryRequiredSingle(
    `SELECT (INSERT Villain {
  name := "Doc Ock",
  nemesis := (SELECT Hero FILTER .id = <uuid>$nemesis_id)
}) {id, name, nemesis: { id, name }}`,
    {nemesis_id: spidey.id}
  );

  const the_avengers: Movie = await client.queryRequiredSingle(
    `WITH char_ids := array_unpack(<array<uuid>>$character_ids)
SELECT (INSERT Movie {
  title := "The Avengers",
  rating := 10,
  genre := Genre.Action,
  characters := (SELECT Person FILTER .id IN char_ids)
}) {id, title, rating, genre, characters: {id}};`,
    {character_ids: [iron_man.id, cap.id]}
  );
  const civil_war: Movie = await client.queryRequiredSingle(
    `SELECT (INSERT Movie {
  title := "Captain America: Civil War",
  rating := 10,
  genre := Genre.Action,
  characters := (SELECT Hero)
}) {id, title, rating, genre, characters: {id}};`
  );

  return {
    data: {
      iron_man,
      cap,
      spidey,
      thanos,
      docOck,
      the_avengers,
      civil_war,
    },
    client,
  };
}

async function cleanupData(client: Client) {
  await client.execute(`DELETE \`S p a M\``);
  await client.execute(`DELETE A`);
  await client.execute(`DELETE Łukasz`);
  await client.execute(`DELETE Bag;`);
  await client.execute(`DELETE Simple;`);
  await client.execute(`DELETE Movie;`);
  await client.execute(`DELETE Villain;`);
  await client.execute(`DELETE Hero;`);
}

export async function teardownTests(client: Client) {
  await cleanupData(client);

  await client.close();
}
