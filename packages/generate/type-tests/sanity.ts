import type e from "../dbschema/edgeql-js";
import { bench } from "@arktype/attest";

bench("bench type", () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  type UserType = typeof e.User;
}).types([446, "instantiations"]);
