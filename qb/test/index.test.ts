import * as edgedb from "edgedb";

export async function setupTests() {
  const pool = await edgedb.createPool();
  const ironMan = await pool.queryOne(`INSERT Hero {
  name := "Iron Man",
  secret_identity := "Tony Stark"
}`);
  console.log(ironMan);

  const cap = await pool.queryOne(`INSERT Hero {
  name := "Captain America",
  secret_identity := "Steve Rogers"
}`);
  console.log(cap);
  const thanos = await pool.queryOne(
    `INSERT Villain {
  name := "Thanos",
  nemesis := (SELECT Hero FILTER .id = <uuid>$nemesis_id)
}`,
    {nemesis_id: ironMan.id}
  );
  console.log(thanos);
}
export async function teardownTests() {
  const pool = await edgedb.createPool();
  await pool.execute(`DELETE Villain;`);
  await pool.execute(`DELETE Hero;`);
  await pool.execute(`DELETE Movie;`);
  await pool.execute(`DELETE Bag;`);
  await pool.execute(`DELETE Simple;`);
}

beforeAll(() => setupTests());
afterAll(() => teardownTests());

test("test", () => {
  expect(2).toEqual(2);
});
