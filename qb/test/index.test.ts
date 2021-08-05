import * as edgedb from "edgedb";

export async function setupTests() {
  // tslint:disable-next-line: no-console
  console.log(`Seeding database...`);
  const pool = await edgedb.createPool();
  const ironMan = await pool.queryOne(`INSERT Hero {
  name := "Iron Man",
  secret_identity := "Tony Stark"
}`);
  // console.log(ironMan);

  const cap = await pool.queryOne(`INSERT Hero {
  name := "Captain America",
  secret_identity := "Steve Rogers"
}`);
  // console.log(cap);
  const thanos = await pool.queryOne(
    `INSERT Villain {
  name := "Thanos",
  nemesis := (SELECT Hero FILTER .id = <uuid>$nemesis_id)
}`,
    {nemesis_id: ironMan.id}
  );

  await pool.close();

  return "done";
}
export async function teardownTests() {
  // tslint:disable-next-line: no-console
  console.log(`Deleting database contents...`);
  const pool = await edgedb.createPool();
  await pool.execute(`DELETE Villain;`);
  await pool.execute(`DELETE Hero;`);
  await pool.execute(`DELETE Movie;`);
  await pool.execute(`DELETE Bag;`);
  await pool.execute(`DELETE Simple;`);

  await pool.close();

  return "done";
}

beforeAll(() => setupTests());
afterAll(() => teardownTests());

test("2=2", () => {
  expect(2).toEqual(2);
});
