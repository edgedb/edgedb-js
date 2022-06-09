import type * as edgedb from "edgedb";
import {$} from "edgedb";
import * as tc from "conditional-type-checks";

import e, {$infer} from "../dbschema/edgeql-js";
import {setupTests, teardownTests, TestData} from "./setupTeardown";

let client: edgedb.Client;
let data: TestData;

const version_lt = async (cutoff: number) => {
  const version = await client.queryRequiredSingle<{major: number}>(
    `select sys::get_version()`
  );
  return version.major < cutoff;
};

beforeAll(async () => {
  const setup = await setupTests();
  ({client, data} = setup);
});

afterAll(async () => {
  await teardownTests(client);
});

test("basic group", async () => {
  if (await version_lt(2)) return;
  const query = e.group(e.Movie, movie => {
    const release_year = movie.release_year;
    return {
      release_year,
    };
  });

  type query = $infer<typeof query>;
  const result = await query.run(client);
  tc.assert<
    tc.IsExact<
      query,
      {
        grouping: string[];
        key: {
          release_year: number | null;
        };
        elements: {
          id: string;
        }[];
      }[]
    >
  >(true);

  expect(result).toMatchObject([
    {
      grouping: ["release_year"],
    },
    {
      grouping: ["release_year"],
    },
  ]);
  expect(result.length).toEqual(2);
  expect(result[0].elements.length).toEqual(1);
});

test("multiple keys", async () => {
  if (await version_lt(2)) return;
  const query = e.group(e.Movie, movie => {
    const title = movie.title;
    const ry = movie.release_year;
    return {
      title,
      ry,
    };
  });

  type query = $infer<typeof query>;
  const result = await query.run(client);
  tc.assert<
    tc.IsExact<
      query,
      {
        grouping: string[];
        key: {
          title: string | null;
          ry: number | null;
        };
        elements: {
          id: string;
        }[];
      }[]
    >
  >(true);

  expect(result.length).toEqual(2);
  expect(result[0].elements.length).toEqual(1);
  expect(result).toMatchObject([
    {
      key: {title: data.civil_war.title, ry: data.civil_war.release_year},
      grouping: ["title", "ry"],
    },
    {
      key: {
        title: data.the_avengers.title,
        ry: data.the_avengers.release_year,
      },
      grouping: ["title", "ry"],
    },
  ]);
});

test("extracted key", async () => {
  if (await version_lt(2)) return;

  const query = e.group(e.Movie, movie => {
    const title = e.len(movie.title);

    return {
      title1: title,
      title2: title,
      title3: title,
    };
  });

  expect(query.toEdgeQL()).toEqual(`WITH
  __scope_0_Movie := DETACHED default::Movie
GROUP __scope_0_Movie
USING
  __withVar_1 := std::len(__scope_0_Movie.title),
  title1 := __withVar_1,
  title2 := __withVar_1,
  title3 := __withVar_1
BY title1, title2, title3`);

  const result = await query.run(client);

  expect(result.length).toEqual(2);
  expect(result[0].grouping).toEqual(["title1", "title2", "title3"]);
});

test("grouping set", async () => {
  if (await version_lt(2)) return;
  const query = e.group(e.Movie, movie => {
    const title = movie.title;

    return {
      title,
      ...e.group.set({
        year: movie.release_year,
        rating: movie.rating,
      }),
    };
  });

  const result = await query.run(client);
  expect(result.length).toEqual(4);
  expect(result).toMatchObject([
    {grouping: ["title", "year"]},
    {grouping: ["title", "year"]},
    {grouping: ["title", "rating"]},
    {grouping: ["title", "rating"]},
  ]);
  expect(result[0].elements.length).toEqual(1);
});

test("grouping tuples", async () => {
  if (await version_lt(2)) return;
  const query = e.group(e.Movie, movie => {
    return {
      ...e.group.tuple({
        title: movie.title,
        len: e.len(movie.title),
      }),
      ...e.group.tuple({
        year: movie.release_year,
        rating: movie.rating,
      }),
    };
  });

  const result = await query.run(client);
  expect(query.toEdgeQL().includes(`BY (title, len), (year, rating)`)).toEqual(
    true
  );
  expect(result[0].grouping).toMatchObject(["title", "len", "year", "rating"]);
  expect(result.length).toEqual(2);
});

test("cube", async () => {
  if (await version_lt(2)) return;
  const query = e.group(e.Movie, movie => {
    return {
      ...e.group.cube({
        title: movie.title,
        len: e.len(movie.title),
        year: movie.release_year,
      }),
    };
  });

  const result = await query.run(client);
  expect(query.toEdgeQL().includes(`BY cube(title, len, year)`)).toEqual(true);
  expect(result.length).toEqual(15);
});

test("rollup", async () => {
  if (await version_lt(2)) return;
  const query = e.group(e.Movie, movie => {
    return {
      ...e.group.rollup({
        title: movie.title,
        len: e.len(movie.title),
        year: movie.release_year,
      }),
    };
  });

  const result = await query.run(client);
  expect(query.toEdgeQL().includes(`BY rollup(title, len, year)`)).toEqual(
    true
  );
  expect(
    result
      .map(r => r.grouping)
      .every(g => {
        return (
          (!g[0] || g[0] === "title") &&
          (!g[1] || g[1] === "len") &&
          (!g[2] || g[2] === "year")
        );
      })
  ).toEqual(true);
  expect(result.length).toEqual(7);
});

test("key override error", async () => {
  if (await version_lt(2)) return;
  expect(() =>
    e.group(e.Movie, movie => {
      return {
        ...e.group.tuple({
          title: movie.title,
        }),
        ...e.group.tuple({
          title: e.len(movie.title),
        }),
      };
    })
  ).toThrow();
});

// clause ordering in `using`
test("key override error", async () => {
  if (await version_lt(2)) return;
  // reused elements should get pulled out into with
  // and ordered topologically
  const query = e.group(e.Movie, movie => {
    const title = movie.title;
    const len = e.len(movie.title);
    const ccc = e.op(len, "+", 4);

    return {
      ccc,
      ccc2: ccc,
      len,
      len2: len,
    };
  });
  const result = await query.run(client);
  expect(result[0].grouping).toEqual(["ccc", "ccc2", "len", "len2"]);
});

test("composition", async () => {
  const group = e.group(e.Movie, movie => ({
    ry: movie.release_year,
  }));
  const query = e.select(group, () => ({
    key: {ry: true},
    grouping: true,
    elements: {
      title: true,
      release_year: true,
    },
  }));
  const result = await query.run(client);

  expect(result).toMatchObject([
    {
      key: {
        ry: 2022,
      },
      grouping: ["ry"],
      elements: [
        {
          title: "The Avengers",
          release_year: 2022,
        },
        {
          title: "Captain America: Civil War",
          release_year: 2022,
        },
      ],
    },
  ]);
});
