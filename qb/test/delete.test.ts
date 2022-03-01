import type * as edgedb from "edgedb";

import e, {Cardinality} from "../dbschema/edgeql-js";
import {setupTests, teardownTests, tc} from "./setupTeardown";

let client: edgedb.Client;

beforeAll(async () => {
  const setup = await setupTests();
  ({client} = setup);
});

afterAll(async () => {
  await teardownTests(client);
});

test("basic delete", async () => {
  const insertBlackWidow = e.insert(e.Hero, {
    name: e.str("Black Widow"),
    secret_identity: e.str("Natasha Romanoff"),
  });

  const insertedResult = await insertBlackWidow.run(client);

  const deleteBlackWidow = e.delete(e.Hero, hero => ({
    filter: e.op(hero.name, "=", "Black Widow"),
  }));
  const deletedResult = await deleteBlackWidow.run(client);

  expect(deletedResult).not.toEqual(null);
  expect(deletedResult!.id).toEqual(insertedResult.id);

  const deleteWrappingSelect = e.delete(
    e.select(e.Hero, hero => ({
      name: true,
      filter: e.op(hero.name, "=", "Black Widow"),
    }))
  );
  const wrappingDeleteResult = await deleteWrappingSelect.run(client);

  tc.assert<tc.IsExact<typeof wrappingDeleteResult, {id: string} | null>>(
    true
  );
  expect(wrappingDeleteResult).toEqual(null);

  const deleteAll = e.delete(e.Hero);
  tc.assert<tc.IsExact<typeof deleteAll["__cardinality__"], Cardinality.Many>>(
    true
  );
});
