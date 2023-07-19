import assert from "node:assert/strict";
import { type Client } from "edgedb";
import e, { type $infer } from "./dbschema/edgeql-js";
import { setupTests, tc, teardownTests } from "./setupTeardown";

describe("pgvector", () => {
  let client: Client;
  beforeAll(async () => {
    const setup = await setupTests();
    ({ client } = setup);
  });

  afterAll(async () => {
    await teardownTests(client);
  }, 10_000);

  test("test casting UUID to object", async () => {
    const vec1234 = Float32Array.from(
      Array.from({ length: 1234 }).fill(0) as number[]
    );
    const inserted = await e
      .insert(e.PgVectorTest, {
        test_embedding: e.ext.pgvector.vector(vec1234),
      })
      .run(client);

    const castToObject = e.select(e.PgVectorTest, () => ({
      internal: e.cast(e.PgVectorTest, e.cast(e.uuid, inserted.id)),
    }));

    tc.assert<
      tc.IsExact<
        $infer<typeof castToObject>,
        {
          internal: {
            id: string;
          };
        }[]
      >
    >(true);

    assert.equal(
      castToObject.toEdgeQL(),
      `\
WITH
  __scope_0_defaultPgVectorTest := DETACHED default::PgVectorTest
SELECT __scope_0_defaultPgVectorTest {
  single internal := <default::PgVectorTest>(<std::uuid>("${inserted.id}"))
}`
    );

    e.select(e.PgVectorTest, () => ({
      // @ts-expect-error: does not allow assignment of non UUID
      internal: e.cast(e.PgVectorTest, inserted.id),
    }));
  });
});
