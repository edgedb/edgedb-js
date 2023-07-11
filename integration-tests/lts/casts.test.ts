import assert from "node:assert/strict";
import e from "./dbschema/edgeql-js";
import type { $Movie } from "./dbschema/edgeql-js/modules/default";

import { setupTests, tc, teardownTests } from "./setupTeardown";
import type { Client } from "edgedb";

describe("casts", () => {
  let client: Client;

  beforeAll(async () => {
    const setup = await setupTests();
    ({ client } = setup);
  });

  afterAll(async () => {
    await teardownTests(client);
  });

  test("casting", () => {
    const primitiveCast = e.cast(e.float32, e.float64(3.14));
    tc.assert<
      tc.IsExact<(typeof primitiveCast)["__element__"], (typeof e)["float64"]>
    >(true);
    assert.equal(
      primitiveCast.toEdgeQL(),
      `<std::float32>(<std::float64>3.14)`
    );
  });

  test("enums", async () => {
    assert.equal(
      e.cast(e.Genre, e.str("Horror")).toEdgeQL(),
      `<default::Genre>("Horror")`
    );
    const result = await e.cast(e.Genre, e.str("Horror")).run(client);
    assert.equal(result, "Horror");
  });

  test("scalar literals", () => {
    assert.equal(e.cast(e.json, "hello").toEdgeQL(), `<std::json>("hello")`);
  });

  test("object type empty set", () => {
    const expr = e.cast(e.Movie, e.set());

    assert.equal(expr.toEdgeQL(), `<default::Movie>{}`);

    tc.assert<tc.IsExact<(typeof expr)["__element__"], $Movie>>(true);
  });
});
