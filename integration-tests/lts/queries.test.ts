import assert from "node:assert/strict";
import type * as edgedb from "edgedb";
import * as tc from "conditional-type-checks";

import {
  getMoviesStarring,
  type GetMoviesStarringArgs,
  type GetMoviesStarringReturns,
  deepArrayInput,
  type DeepArrayInputArgs,
} from "./dbschema/queries";
import { setupTests, teardownTests } from "./setupTeardown";

describe("queries", () => {
  let client: edgedb.Client;

  beforeAll(async () => {
    const setup = await setupTests();
    ({ client } = setup);
  });

  afterAll(async () => {
    await teardownTests(client);
  });

  test("basic select", async () => {
    const result = await getMoviesStarring(client, {
      name: "Iron Man",
      years: [2012, 2016] as const, // readonly arrays accepted
    });

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
            height: string | null;
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

    assert.equal(result.length, 2);

    tc.assert<
      tc.IsExact<
        GetMoviesStarringArgs,
        {
          name?: string | null;
          years: readonly number[];
        }
      >
    >(true);

    tc.assert<tc.IsExact<GetMoviesStarringReturns, result>>(true);
  });

  test("deep array input", async () => {
    const result = await deepArrayInput(client, {
      deep: [
        ['name', 'Stark'],
        ['color', 'red'],
      ] as const,
    });

    type result = typeof result;
    tc.assert<
      tc.IsExact<
        result,
        Array<[string, string]>
      >
    >(true);

    tc.assert<
      tc.IsExact<
        DeepArrayInputArgs,
        {
          deep: ReadonlyArray<readonly [string, string]>;
        }
      >
    >(true);
  });
});
