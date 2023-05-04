import type * as edgedb from "edgedb";
import * as tc from "conditional-type-checks";

import { getMoviesStarring } from "../dbschema/queries";
import { setupTests, teardownTests, TestData } from "./setupTeardown";
let client: edgedb.Client;

beforeAll(async () => {
  const setup = await setupTests();
  ({ client } = setup);
});

afterAll(async () => {
  await teardownTests(client);
});

test("basic select", async () => {
  const result = await getMoviesStarring(client, { name: "Iron Man" });

  type result = typeof result;
  tc.assert<
    tc.IsExact<
      result,
      {
        id: string;
        title: string;
        release_year: number;
        characters: {
          name: string;
          "@character_name": string | null;
        }[];
        tuple: [number, string, bigint[]];
        version: {
          major: number;
          minor: number;
          stage: "dev" | "rc" | "beta" | "alpha" | "final";
          stage_no: number;
          local: string[];
        };
        range: edgedb.Range<number>;
        local_date: edgedb.LocalDate;
      }[]
    >
  >(true);

  expect(result.length).toEqual(2);
});
