import assert from "node:assert/strict";
import * as edgedb from "edgedb";

import e from "./dbschema/edgeql-js";
import { setupTests, teardownTests, tc } from "./setupTeardown";

describe("json", () => {
  let client: edgedb.Client;

  beforeAll(async () => {
    const setup = await setupTests();
    ({ client } = setup);
  });

  afterAll(async () => {
    await teardownTests(client);
  });

  test("basic select", async () => {
    const query = e.select(e.Movie, (movie) => ({
      title: true,
      order_by: movie.title,
    }));

    const result = await query.runJSON(client);
    tc.assert<tc.IsExact<typeof result, string>>(true);
    assert.equal(
      result,
      '[{"title" : "Captain America: Civil War"}, {"title" : "The Avengers"}]',
    );
  });

  test("select one", async () => {
    const query = e.select(e.Movie, (movie) => ({
      title: true,
      filter: e.op(movie.title, "=", "The Avengers"),
    }));

    const result = await query.runJSON(client);
    tc.assert<tc.IsExact<typeof result, string>>(true);
    assert.equal(result, '[{"title" : "The Avengers"}]');
  });

  test("json properties", async () => {
    const jsonData = { arg: { nested: ["hello", 1234, true, null] } };
    const inserted = await e
      .insert(e.Bag, {
        stringsMulti: ["asdf"],
        jsonField: jsonData,
      })
      .run(client);

    const selected = await e
      .select(e.Bag, (bag) => ({
        filter_single: e.op(bag.id, "=", e.uuid(inserted.id)),
        id: true,
        jsonField: true,
      }))
      .run(client);
    tc.assert<
      tc.IsExact<typeof selected, { id: string; jsonField: unknown } | null>
    >(true);
    assert.ok(selected);
    assert.deepEqual(selected.jsonField, {
      ...(selected.jsonField as Record<string, unknown>),
      ...jsonData,
    });
  });

  test("json param", async () => {
    const jsonData = { arg: { nested: ["hello", 1234, true, null] } };
    const result = await e
      .params({ data: e.json }, (params) =>
        e.select({
          data: params.data,
        }),
      )
      .run(client, { data: jsonData });
    assert.deepEqual(result.data, {
      ...(result.data as Record<string, unknown>),
      ...jsonData,
    });
  });

  test("json read/write equivalents", async () => {
    const data = [5, "asdf", { sup: [3] }, ["asdf", 1234, false, null]];
    for (const datum of data) {
      assert.deepEqual(await e.json(datum).run(client), datum);
    }
  });

  test("serialize data classes", async () => {
    const datum = [
      new Date("2022-07-18T21:42:46.569Z"),
      new edgedb.LocalDate(2020, 1, 1),
      new edgedb.LocalDateTime(2020, 1, 1),
      new edgedb.LocalTime(2, 22),
      new edgedb.Duration(3),
      new edgedb.RelativeDuration(3),
      new edgedb.DateDuration(1),
    ];
    assert.deepEqual(await e.json(datum).run(client), [
      "2022-07-18T21:42:46.569Z",
      "2020-01-01",
      "2020-01-01T00:00:00",
      "02:22:00",
      "P3Y",
      "P3Y",
      "P1Y",
    ]);
  });
});
