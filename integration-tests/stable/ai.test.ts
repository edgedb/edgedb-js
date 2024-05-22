import type { Client } from "edgedb";
import e, { type $infer } from "./dbschema/edgeql-js";
import { setupTests, tc, teardownTests } from "./setupTeardown";

describe("ai", () => {
  let client: Client;
  beforeAll(async () => {
    const setup = await setupTests();
    ({ client } = setup);
  });

  afterAll(async () => {
    await teardownTests(client);
  }, 10_000);

  test("search", async () => {
    const q = e.params({ searchTerm: e.array(e.float32) }, (params) =>
      e.ext.ai.search(e.Post, params.searchTerm)
    );
    const result = await q.run(client, { searchTerm: [0.1, 0.2] });
    console.log(result);
  });
});
