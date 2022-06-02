import type * as edgedb from "edgedb";
import {$} from "edgedb";
import * as tc from "conditional-type-checks";

import e, {$infer} from "../dbschema/edgeql-js";
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

test("basic group", () => {
  const result = e.group(e.Movie, movie => ({
    title: movie.title,
    arg: movie.title,
  }));

  type result = $infer<typeof result>;
  tc.assert<tc.IsExact<result, "asdf">>(false);
});
