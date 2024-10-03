import type * as edgedb from "edgedb";

import e, { type $infer } from "./dbschema/edgeql-js";
import { setupTests, teardownTests, tc } from "./setupTeardown";

let client: edgedb.Client;

describe("select", () => {
  beforeAll(async () => {
    const setup = await setupTests();
    ({ client } = setup);
  });

  afterAll(async () => {
    await teardownTests(client);
  }, 10_000);

  test("union of polymorphic types in computed schema field", () => {
    const WatchingList = e.shape(e.User.watching_list, () => ({
      index: true,
      title: true,
      ...e.is(e.Movie, {
        plot: true,
      }),
      ...e.is(e.Show, {
        seasons: true,
      }),
    }));

    const user = e.select(e.User, () => ({
      watching_list: WatchingList,
    }));

    type user = $infer<typeof user>;

    tc.assert<
      tc.IsExact<
        user,
        {
          watching_list: (
            | {
                index: number;
                title: string;
                plot: string;
                __typename: "default::Movie";
              }
            | {
                index: number;
                title: string;
                seasons: number;
                __typename: "default::Show";
              }
          )[];
        }[]
      >
    >(true);
  });
});
