import * as edgedb from "edgedb";
import * as tc from "conditional-type-checks";

import type {Movie, schema} from "../dbschema/edgeql-js";

export enum Genre {
  Horror = "Horror",
  Action = "Action",
  RomCom = "RomCom",
}

export interface BaseObject {
  id: string;
  __type__: schema.Type;
}
export interface test_Person extends BaseObject {
  name: string;
}
export interface test_Movie extends BaseObject {
  characters: test_Person[];
  profile?: test_Profile | null | undefined;
  genre?: Genre | null | undefined;
  rating?: number | null | undefined;
  release_year: number;
  title: string;
}
export interface test_Profile extends BaseObject {
  plot_summary?: string | null;
  slug?: string | null;
}

test("check generated interfaces", () => {
  tc.assert<tc.IsExact<Movie, test_Movie>>(true);
});
