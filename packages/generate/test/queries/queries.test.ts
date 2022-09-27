import {createClient} from "edgedb";
import {getMoviesStarring} from "./getMoviesStarring.edgeql";
import {expect, test} from "@jest/globals";

test("ts", async () => {
  const client = createClient();

  const movies = await getMoviesStarring(client, {name: "Robert Downey Jr."});
  console.log(JSON.stringify(movies, null, 2));
  expect(movies).toEqual([
    {
      title: "Forrest Gump",
      year: 1994,
      rating: 8.8,
      actors: [
        {
          name: "Tom Hanks",
          birthday: new Date("1956-07-09")
        }
      ]
    }
  ]);
});
