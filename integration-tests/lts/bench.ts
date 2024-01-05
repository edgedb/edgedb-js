import { bench } from "@arktype/attest";

import e from "./dbschema/edgeql-js";

bench("select: scalar", () => {
  const query = e.select(e.int32(42));
  return {} as typeof query;
}).types([1263, "instantiations"]);

bench("select: free object", () => {
  const query = e.select({ meaning: e.int32(42) });
  return {} as typeof query;
}).types([2120, "instantiations"]);

bench("select: id only", () => {
  const query = e.select(e.User, () => ({ id: true }));
  return {} as typeof query;
}).types([3895, "instantiations"]);

bench("select: filtered", () => {
  const query = e.select(e.User, () => ({
    filter_single: { id: e.uuid("123") },
  }));
  return {} as typeof query;
}).types([5386, "instantiations"]);

bench("select: nested", () => {
  const user = e.select(e.User, () => ({
    filter_single: { id: e.uuid("123") },
  }));
  const query = e.select(user, () => ({ id: true }));

  return {} as typeof query;
}).types([7593, "instantiations"]);

bench("select: complex", () => {
  const query = e.select(e.Movie, () => ({
    id: true,
    characters: (char) => ({
      name: true,
      "@character_name": true,
      filter: e.op(char["@character_name"], "=", "Tony Stark"),
    }),
  }));
  return {} as typeof query;
}).types([6556, "instantiations"]);

bench("select: with filter", () => {
  const query = e.select(e.Hero, (hero) => ({
    name: true,
    villains: {
      id: true,
      name: true,
    },
    filter_single: e.op(hero.name, "=", "Peter Parker"),
  }));
  return {} as typeof query;
}).types([6690, "instantiations"]);

bench("select: with order", () => {
  const query = e.select(e.Hero, (hero) => ({
    name: true,
    villains: (v) => ({
      id: true,
      name: true,
      order_by: v.name,
    }),
    filter_single: e.op(hero.name, "=", "Peter Parker"),
  }));
  return {} as typeof query;
}).types([6985, "instantiations"]);

bench("select: with limit", () => {
  const query = e.select(e.Hero, (hero) => ({
    name: true,
    villains: () => ({
      id: true,
      name: true,
      limit: 1,
    }),
    filter_single: e.op(hero.name, "=", "Peter Parker"),
  }));
  return {} as typeof query;
}).types([6713, "instantiations"]);

bench("select: with offset", () => {
  const query = e.select(e.Hero, (hero) => ({
    name: true,
    villains: (v) => ({
      id: true,
      name: true,
      offset: 1,
    }),
    filter_single: e.op(hero.name, "=", "Peter Parker"),
  }));
  return {} as typeof query;
}).types([6752, "instantiations"]);
