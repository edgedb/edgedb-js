import {Client} from "edgedb";
import {Villain} from "../dbschema/edgeql-js/modules/default";
import {InsertShape} from "../dbschema/edgeql-js/syntax/insert";
import e, {Cardinality} from "../dbschema/edgeql-js";
import {setupTests, teardownTests, TestData, tc} from "./setupTeardown";

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
  const q1 = e.insert(e.Hero, {
    name: "Black Widow",
    secret_identity: e.str("Natasha Romanoff"),
  });

  expect(q1.__cardinality__).toEqual(Cardinality.One);
  tc.assert<tc.IsExact<typeof q1["__cardinality__"], Cardinality.One>>(true);

  await client.querySingle(q1.toEdgeQL());

  await client.execute(`DELETE Hero FILTER .name = 'Black Widow';`);
});

test("unless conflict", async () => {
  const q0 = e
    .insert(e.Movie, {
      title: "The Avengers",
      rating: 11,
    })
    .unlessConflict();

  expect(q0.__cardinality__).toEqual(Cardinality.AtMostOne);
  tc.assert<tc.IsExact<typeof q0["__cardinality__"], Cardinality.AtMostOne>>(
    true
  );

  const q1 = e
    .insert(e.Movie, {
      title: "The Avengers",
      rating: 11,
    })
    .unlessConflict(movie => ({
      on: movie.title,
    }));

  expect(q1.__cardinality__).toEqual(Cardinality.AtMostOne);
  tc.assert<tc.IsExact<typeof q1["__cardinality__"], Cardinality.AtMostOne>>(
    true
  );

  const r1 = await q1.run(client);

  expect(r1).toEqual(null);
  tc.assert<tc.IsExact<typeof r1, {id: string} | null>>(true);

  const q2 = e
    .insert(e.Movie, {
      title: "The Avengers",
      rating: 11,
    })
    .unlessConflict(movie => ({
      on: movie.title,
      else: e.update(movie, () => ({
        set: {
          rating: 11,
        },
      })),
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
      rating: 11,
    })
    .unlessConflict(movie => ({
      on: movie.title,
      else: e.select(e.Hero, () => ({name: true})),
    }));

  expect(q3.__cardinality__).toEqual(Cardinality.Many);
  tc.assert<tc.IsExact<typeof q3["__cardinality__"], Cardinality.Many>>(true);
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
      name: "hero",
    }),
  });

  const q2 = e.select(q1, () => ({
    name: true,
    nemesis: {name: true},
  }));

  const result = await q2.run(client);

  expect(result).toMatchObject({
    name: "villain",
    nemesis: {name: "hero"},
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
    nemesis: e.select(e.Hero),
  });

  // @ts-expect-error missing required field
  e.insert(e.Villain, {});

  e.insert(e.Villain, {
    // @ts-expect-error
    name: e.cast(e.str, e.set()),
  });

  e.insert(e.Hero, {
    // @ts-expect-error
    name: 1234,
    // @ts-expect-error
    number_of_movies: "Ronin",
  });

  // should not error on missing required prop 'release_year'
  // since it has a default value
  e.insert(e.Movie, {
    title: "test_movie",
  });

  e.insert(e.Movie, {
    title: "test movie",
    rating: null,
    profile: null,
    // @ts-expect-error release_year is required prop
    release_year: null,
  }).toEdgeQL();

  return;
});

test("optional sequence fields", async () => {
  const query = e.insert(e.Bag, {
    stringsMulti: "asdf",
  });
  await query.run(client);
});
