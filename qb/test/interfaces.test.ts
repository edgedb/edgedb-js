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
  __type__: schema.ObjectType;
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
}

test("check generated interfaces", () => {
  // TODO: re-enable test when 2.0 is stable
  // tc.assert<tc.IsExact<Movie, test_Movie>>(true);
});
