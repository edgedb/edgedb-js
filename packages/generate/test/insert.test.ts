import type {Client} from "edgedb";
import type {Villain} from "../dbschema/edgeql-js/modules/default";
import type {InsertShape} from "../dbschema/edgeql-js/syntax/insert";
import e from "../dbschema/edgeql-js";
import {$} from "edgedb";

import {
  setupTests,
  teardownTests,
  TestData,
  tc,
  version_lt
} from "./setupTeardown";

let client: Client;
let data: TestData;

beforeAll(async () => {
  const setup = await setupTests();
  ({client, data} = setup);
});

afterAll(async () => {
  await teardownTests(client);
});

test("insert shape check", async () => {
  type insertVillainShape = InsertShape<typeof Villain>;
  const c1: insertVillainShape = {name: e.str("adf")};
});

test("basic insert", async () => {
  const q1 = e.insert(e.Movie, {
    title: "Black Widow",
    genre: e.Genre.Action,
    rating: 5
  });

  expect(q1.__cardinality__).toEqual($.Cardinality.One);
  tc.assert<tc.IsExact<typeof q1["__cardinality__"], $.Cardinality.One>>(true);

  await q1.run(client);
  await client.execute(`DELETE Movie FILTER .title = 'Black Widow';`);
});

test("unless conflict", async () => {
  const q0 = e
    .insert(e.Movie, {
      title: "The Avengers",
      rating: 11
    })
    .unlessConflict();

  expect(q0.__cardinality__).toEqual($.Cardinality.AtMostOne);
  tc.assert<tc.IsExact<typeof q0["__cardinality__"], $.Cardinality.AtMostOne>>(
    true
  );

  const q1 = e
    .insert(e.Movie, {
      title: "The Avengers",
      rating: 11
    })
    .unlessConflict(movie => ({
      on: movie.title
    }));

  expect(q1.__cardinality__).toEqual($.Cardinality.AtMostOne);
  tc.assert<tc.IsExact<typeof q1["__cardinality__"], $.Cardinality.AtMostOne>>(
    true
  );

  const r1 = await q1.run(client);

  expect(r1).toEqual(null);
  tc.assert<tc.IsExact<typeof r1, {id: string} | null>>(true);

  const q2 = e
    .insert(e.Movie, {
      title: "The Avengers",
      rating: 11
    })
    .unlessConflict(movie => ({
      on: movie.title,
      else: e.update(movie, () => ({
        set: {
          rating: 11
        }
      }))
    }));

  const r2 = await q2.run(client);

  const allMovies = await e
    .select(e.Movie, () => ({id: true, title: true, rating: true}))
    .run(client);

  for (const movie of allMovies) {
    if (movie.title === "The Avengers") {
      expect(movie.rating).toEqual(11);
      expect(r2.id).toEqual(movie.id);
    } else {
      expect(movie.rating).not.toEqual(11);
    }
  }

  const q3 = e
    .insert(e.Movie, {
      title: "The Avengers",
      rating: 11
    })
    .unlessConflict(movie => ({
      on: movie.title,
      else: e.select(e.Hero, () => ({name: true}))
    }));

  expect(q3.__cardinality__).toEqual($.Cardinality.Many);
  tc.assert<tc.IsExact<typeof q3["__cardinality__"], $.Cardinality.Many>>(
    true
  );
  expect(q3.__element__.__name__).toEqual("std::Object");
  tc.assert<tc.IsExact<typeof q3["__element__"]["__name__"], "std::Object">>(
    true
  );

  const r3 = await q3.run(client);

  tc.assert<tc.IsExact<typeof r3, {id: string}[]>>(true);
});

test("nested insert", async () => {
  const q1 = e.insert(e.Villain, {
    name: e.str("villain"),
    nemesis: e.insert(e.Hero, {
      name: "hero"
    })
  });

  const q2 = e.select(q1, () => ({
    name: true,
    nemesis: {name: true}
  }));

  const result = await q2.run(client);

  expect(result).toMatchObject({
    name: "villain",
    nemesis: {name: "hero"}
  });

  // cleanup
  await client.execute(`delete Villain filter .name = '${result.name}';`);
  await client.execute(
    `delete Hero filter .name = '${result.nemesis!.name}';`
  );
  return;
});

test("insert type enforcement", async () => {
  e.insert(e.Villain, {
    // @ts-expect-error card mismatch
    nemesis: e.select(e.Hero)
  });

  // @ts-expect-error missing required field
  e.insert(e.Villain, {});

  e.insert(e.Villain, {
    // @ts-expect-error
    name: e.cast(e.str, e.set())
  });

  e.insert(e.Hero, {
    // @ts-expect-error
    name: 1234,
    // @ts-expect-error
    number_of_movies: "Ronin"
  });

  // should not error on missing required prop 'release_year'
  // since it has a default value
  e.insert(e.Movie, {
    title: "test_movie"
  });

  e.insert(e.Movie, {
    title: "test movie",
    rating: null,
    profile: null,
    // @ts-expect-error release_year is required prop
    release_year: null
  }).toEdgeQL();

  e.insert(e.User, {
    username: "spidey",
    favourite_movies: e.select(e.Movie, movie => ({
      filter: e.op(movie.title, "=", "The Avengers")
    }))
  });

  return;
});

test("optional sequence fields", async () => {
  const query = e.insert(e.Bag, {
    stringsMulti: "asdf"
  });
  await query.run(client);
});

test("complex raw data in inserts", async () => {
  const strings = ["aaa", "bbb"];
  const query = e.insert(e.Bag, {
    stringsArr: strings,
    stringsMulti: strings as ["aaa", "bbb"],
    stringMultiArr: [strings],
    boolField: true
  });
  const final = e.select(query, () => ({
    id: true,
    stringsMulti: true,
    stringsArr: true,
    stringMultiArr: true,
    boolField: true
  }));
  const result = await final.run(client);
  expect(result).toMatchObject({
    stringsMulti: strings,
    stringsArr: strings,
    stringMultiArr: [strings],
    boolField: true
  });

  e.insert(e.Bag, {
    // @ts-expect-error
    stringsMulti: strings
  });
});

test("insert readonly prop", async () => {
  const iq = e.insert(e.Profile, {
    slug: "movieslug",
    plot_summary: "Stuff happens."
  });

  const qq = e.select(iq, () => ({
    slug: true,
    plot_summary: true
  }));

  const result = await qq.run(client);
  expect(result).toMatchObject({
    slug: "movieslug",
    plot_summary: "Stuff happens."
  });
});

test("exclude readonly props", () => {
  type insertProfileShape = InsertShape<typeof e["Profile"]>;
  tc.assert<
    "plot_summary" | "slug" extends keyof insertProfileShape ? true : false
  >(true);
});

test("insert link prop in nested select", async () => {
  const inserted = e.insert(e.Movie, {
    title: "Iron Man 3",
    release_year: 2013,
    characters: e.select(e.Hero, hero => ({
      filter: e.op(hero.name, "=", "Iron Man"),
      "@character_name": e.str("Tony Stark")
    }))
  });

  const selected = e.select(inserted, () => ({
    characters: {
      name: true,
      "@character_name": true
    }
  }));

  const result = await selected.run(client);
  expect(result.characters[0]["@character_name"]).toEqual("Tony Stark");
  expect(result.characters[0].name).toEqual("Iron Man");
});

test("insert link prop in nested insert", async () => {
  const inserted = e.insert(e.Movie, {
    title: "Iron Man 2",
    release_year: 2010,
    characters: e.insert(e.Villain, {
      name: "Whiplash",
      "@character_name": e.str("Ivan Vanko")
    })
  });

  const selected = e.select(inserted, () => ({
    characters: {
      name: true,
      "@character_name": true
    }
  }));

  const result = await selected.run(client);
  expect(result.characters[0]["@character_name"]).toEqual("Ivan Vanko");
  expect(result.characters[0].name).toEqual("Whiplash");
});

test("no plain data as link prop", async () => {
  expect(() =>
    e.insert(e.Movie, {
      title: "Guardians",
      release_year: 2014,
      characters: e.insert(e.Hero, {
        name: "Star-Lord",
        "@character_name": "Peter Quill"
      })
    })
  ).toThrow();
});

test("undefined in insert", async () => {
  const result = await e
    .insert(e.Movie, {
      title: "The Eternals",
      release_year: undefined
    })
    .run(client);
  expect(result.id).toBeDefined();
});

test("invalid insert", async () => {
  expect(() =>
    e
      // @ts-ignore
      .insert(e.Movie, () => ({
        title: "Invalid"
      }))
      .toEdgeQL()
  ).toThrowError();
});

test("empty shape insert", async () => {
  const res = await e.insert(e.Profile, {}).run(client);

  expect(Object.keys(res)).toEqual(["id"]);
});

test("insert custom ID", async () => {
  if (await version_lt(client, 2)) return;
  await e
    .insert(e.Hero, {
      id: "00000000-0000-0000-0000-000000000000",
      name: "asdf"
    })
    .run(client);

  await e
    .delete(e.Hero, hero => ({
      filter: e.op(
        hero.id,
        "=",
        e.uuid("00000000-0000-0000-0000-000000000000")
      )
    }))
    .run(client);
});

test("empty arrays for array and multi properties", async () => {
  const query = e.insert(e.Bag, {
    stringsMulti: ["asdf"],
    stringMultiArr: [],
    stringsArr: []
  });
  const result = await query.run(client);
});
