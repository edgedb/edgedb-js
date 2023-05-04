import * as edgedb from "edgedb";
import * as tc from "conditional-type-checks";

import type { Movie, X, Y, Z } from "../dbschema/interfaces";

export type Genre = "Horror" | "Action" | "RomCom" | "Science Fiction";

export interface BaseObject {
  id: string;
}
export interface test_Person extends BaseObject {
  name: string;
}
export interface test_Movie extends BaseObject {
  characters: test_Person[];
  profile?: test_Profile | null;
  genre?: Genre | null;
  rating?: number | null;
  release_year: number;
  title: string;
}
export interface test_Profile extends BaseObject {
  plot_summary?: string | null;
  slug?: string | null;
  a?: string | null;
  b?: string | null;
  c?: string | null;
}
interface test_Z extends BaseObject {
  xy?: X | Y | null;
}

test("check generated interfaces", () => {
  // TODO: re-enable test when 2.0 is stable
  tc.assert<tc.IsExact<Movie, test_Movie>>(true);
  tc.assert<tc.IsExact<Z, test_Z>>(true);
});
