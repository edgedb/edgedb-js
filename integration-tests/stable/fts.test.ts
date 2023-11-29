import type { Client } from "edgedb";
import e, { type $infer } from "./dbschema/edgeql-js";
import { setupTests, tc, teardownTests } from "./setupTeardown";
import { $Post } from "./dbschema/edgeql-js/modules/default";

const posts = [
  "Full-text search is a technique for searching text content. It works by storing every unique word that appears in a document.",
  "To perform a full-text search, the search engine examines all the words in the specified document or set of documents.",
  "The process of full-text search begins with the user entering a string of characters (the search string).",
  "The search engine then retrieves all instances of the search string in the document or collection of documents.",
  "Full-text search can be used in many applications that require search capability, such as web search engines, document management systems, and digital libraries.",
];
describe("full-text search", () => {
  let client: Client;
  beforeAll(async () => {
    const setup = await setupTests();
    ({ client } = setup);
    await e
      .params({ posts: e.array(e.str) }, (params) => {
        return e.for(e.array_unpack(params.posts), (post) =>
          e.insert(e.Post, { text: post })
        );
      })
      .run(client, { posts });
  });

  afterAll(async () => {
    await teardownTests(client);
  }, 10_000);

  test("basic fts", async () => {
    const searchExpr = e.fts.search(e.Post, "search");

    const allQuery = e.select(searchExpr, ($) => ({
      id: $.object.id,
      text: $.object.text,
      score: $.score,
    }));
    console.log("allQuery", allQuery.toEdgeQL());
    type All = $infer<typeof allQuery>;
    const all = await allQuery.run(client);

    expect(all.length).toBe(posts.length);

    tc.assert<
      tc.IsExact<
        All,
        {
          id: string;
          text: string;
          score: number;
        }[]
      >
    >(true);

    const noShapeQuery = e.select(searchExpr);
    type NoShape = $infer<typeof noShapeQuery>;
    tc.assert<
      tc.IsExact<
        NoShape,
        {
          object: { id: string };
          score: number;
        }[]
      >
    >(true);
    const noShape = await noShapeQuery.run(client);

    expect(noShape).toEqual(all);
  });

  test("fts with filter", async () => {
    const searchExpr = e.fts.search(e.Post, "search");
    const filteredQuery = e.select(searchExpr, (post) => ({
      object: true,
      score: true,
      filter: e.op(post.score, ">", e.float64(0.81)),
    }));
    const filtered = await filteredQuery.run(client);

    expect(filtered.length).toBe(1);
  });

  test("fts with sub-select and order by", async () => {
    const searchExpr = e.fts.search(e.Post, "search");
    const objectSelectQuery = e.select(searchExpr.object, (post) => ({
      text: post.text,
      order_by: searchExpr.score,
    }));
    const objectSelect = await objectSelectQuery.run(client);
    expect(objectSelect).toEqual([
      { text: posts[0] },
      { text: posts[1] },
      { text: posts[2] },
      { text: posts[3] },
      { text: posts[4] },
    ]);

    tc.assert<tc.IsExact<$infer<typeof objectSelectQuery>, { text: string }[]>>(
      true
    );
  });
});
