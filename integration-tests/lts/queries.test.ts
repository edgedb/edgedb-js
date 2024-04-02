import assert from "node:assert/strict";
import type * as edgedb from "edgedb";
import * as tc from "conditional-type-checks";

import {
  exclusive,
  type ExclusiveArgs,
  type ExclusiveReturns,
  getMoviesStarring,
  type GetMoviesStarringArgs,
  type GetMoviesStarringReturns,
  deepArrayInput,
  type DeepArrayInputArgs,
} from "./dbschema/queries";
import { type TestData, setupTests, teardownTests } from "./setupTeardown";

describe("queries", () => {
  let client: edgedb.Client;
  let data: TestData;

  beforeAll(async () => {
    const setup = await setupTests();
    ({ client, data } = setup);
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
        ["name", "Stark"],
        ["color", "red"],
      ] as const,
    });

    type result = typeof result;
    tc.assert<tc.IsExact<result, Array<[string, string]>>>(true);

    tc.assert<
      tc.IsExact<
        DeepArrayInputArgs,
        {
          deep: ReadonlyArray<readonly [string, string]>;
        }
      >
    >(true);
  });

  test("select filtered on exclusive property", async () => {
    const result = await exclusive(client, {
      id: data.cap.id,
    });

    tc.assert<tc.IsExact<ExclusiveReturns, typeof result>>(true);

    tc.assert<
      tc.IsExact<
        ExclusiveArgs,
        {
          id: string;
        }
      >
    >(true);

    assert.ok(result);
    assert.equal(result.id, data.cap.id);

    const missing = await exclusive(client, {
      id: "00000000-0000-0000-0000-000000000000",
    });

    assert.equal(missing, null);
  });
});
