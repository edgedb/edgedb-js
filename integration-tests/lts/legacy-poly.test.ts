import assert from "node:assert/strict";
import * as edgedb from "edgedb";
import * as $ from "../../packages/generate/src/syntax/reflection";

import e, { type $infer } from "./dbschema/edgeql-js";
import { setupTests, teardownTests, tc, type TestData } from "./setupTeardown";

declare module "./dbschema/edgeql-js/typesystem" {
  export interface SetTypesystemOptions {
    future: {
      polymorphismAsDiscriminatedUnions: false; // legacy behavior
      strictTypeNames: false; // legacy behavior
    };
  }
}

let client: edgedb.Client;
let data: TestData;

describe("legacy polymorphic query behavior", () => {
  beforeAll(async () => {
    const setup = await setupTests();
    ({ client, data } = setup);
  });

  afterAll(async () => {
    await teardownTests(client);
  });

  test("deep shape", () => {
    const deep = e.select(e.Hero, () => ({
      id: true,
      __type__: {
        name: true,
        __type__: {
          id: true,
          __type__: {
            id: true,
            name: true,
          },
        },
      },
    }));

    type deep = $infer<typeof deep>;
    tc.assert<
      tc.IsExact<
        deep,
        {
          id: string;
          __type__: {
            name: string;
            __type__: {
              id: string;
              __type__: {
                id: string;
                name: string;
              };
            };
          };
        }[]
      >
    >(true);
  });

  test("polymorphism", () => {
    const query = e.select(e.Person, () => ({
      id: true,
      name: true,
      ...e.is(e.Hero, { secret_identity: true }),
      ...e.is(e.Villain, {
        nemesis: { name: true },
      }),
    }));

    assert.deepEqual(query.__kind__, $.ExpressionKind.Select);
    assert.deepEqual(query.__element__.__kind__, $.TypeKind.object);
    assert.equal(query.__element__.__name__, "default::Person");

    type result = $infer<typeof query>[number];
    tc.assert<
      tc.IsExact<
        result,
        {
          id: string;
          name: string;
          nemesis: {
            name: string;
          } | null;
          secret_identity: string | null;
        }
      >
    >(true);
  });

  test("computables in polymorphics", () => {
    const q = e.select(e.Person, () => ({
      id: true,
      ...e.is(e.Hero, {
        secret_identity: true,
      }),
      ...e.is(e.Villain, {
        nemesis: { id: true, computable: e.int64(1234) },
        computable: e.int64(1234),
      }),
    }));

    type actual = $infer<typeof q>[number];
    interface expected {
      id: string;
      nemesis: { id: string; computable: 1234 } | null;
      secret_identity: string | null;
    }
    tc.assert<tc.IsExact<actual, expected>>(true);
  });

  test("parent type props in polymorphic", () => {
    const q = e.select(e.Person, () => ({
      ...e.is(e.Hero, {
        // name is prop of Person
        name: true,
        secret_identity: true,
      }),
      ...e.is(e.Villain, { nemesis: { name: true } }),
    }));

    tc.assert<
      tc.IsExact<
        $infer<typeof q>,
        {
          name: string | null;
          secret_identity: string | null;
          nemesis: { name: string } | null;
        }[]
      >
    >(true);
  });

  test("* in polymorphic", async () => {
    const q = e.select(e.Person, () => ({
      ...e.is(e.Hero, e.Hero["*"]),
      name: true,
    }));
    type result = $infer<typeof q>;

    // 'id' is filtered out since it is not valid in a polymorphic expr
    tc.assert<
      tc.IsExact<
        result,
        {
          name: string;
          age: number | null;
          height: string | null;
          isAdult: boolean | null;
          number_of_movies: number | null;
          secret_identity: string | null;
        }[]
      >
    >(true);

    const result = await q.run(client);
    assert.deepEqual(result, []);
  });

  test("polymorphic link properties in expressions", async () => {
    const query = e.select(e.Object, () => ({
      id: true,
      ...e.is(e.Movie, {
        title: true,
        characters: (char) => ({
          name: true,
          "@character_name": true,
          char_name: char["@character_name"],
          person_name: char.name,

          filter: e.op(char["@character_name"], "ilike", "a%"),
        }),
      }),
    }));

    const result = await query.run(client);

    tc.assert<
      tc.IsExact<
        typeof result,
        {
          id: string;
          title: string | null;
          characters:
            | {
                name: string;
                "@character_name": string | null;
                char_name: string | null;
                person_name: string;
              }[]
            | null;
        }[]
      >
    >(true);
  });
});
