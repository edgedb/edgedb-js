import type * as edgedb from "edgedb";
import {$} from "edgedb";
import * as tc from "conditional-type-checks";

import e, {$infer} from "../dbschema/edgeql-js";
import {number} from "../dbschema/edgeql-js/modules/std";
import {setupTests, teardownTests, TestData} from "./setupTeardown";

let client: edgedb.Client;
let data: TestData;

beforeAll(async () => {
  const setup = await setupTests();
  ({client, data} = setup);
});

afterAll(async () => {
  await teardownTests(client);
});

test("basic select", async () => {
  const query = e.select(e.Movie, movie => ({
    title: true,
    order_by: movie.title,
  }));

  const result = await query.runJSON(client);
  tc.assert<tc.IsExact<typeof result, string>>(true);
  expect(result).toEqual(
    '[{"title" : "Captain America: Civil War"}, {"title" : "The Avengers"}]'
  );
});

test("select one", async () => {
  const query = e.select(e.Movie, movie => ({
    title: true,
    filter: e.op(movie.title, "=", "The Avengers"),
  }));

  const result = await query.runJSON(client);
  tc.assert<tc.IsExact<typeof result, string>>(true);
  expect(result).toEqual('{"title" : "The Avengers"}');
});
