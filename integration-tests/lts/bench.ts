import { bench } from "@arktype/attest";

import e from "./dbschema/edgeql-js";

bench("scalar literal", () => {
  const lit = e.int32(42);
  return {} as typeof lit;
}).types([555, "instantiations"]);

bench("array literal", () => {
  const lit = e.literal(e.array(e.str), ["abcd"]);
  return {} as typeof lit;
}).types([2407, "instantiations"]);

bench("named tuple literal", () => {
  const lit = e.literal(e.tuple({ str: e.str }), {
    str: "asdf",
  });
  return {} as typeof lit;
}).types([11597, "instantiations"]);

bench("base type: array", () => {
  const baseType = e.array(e.str);
  return {} as typeof baseType;
}).types([348, "instantiations"]);

bench("base type: named tuple", () => {
  const baseType = e.tuple({ str: e.str });
  return {} as typeof baseType;
}).types([2160, "instantiations"]);

bench("select: scalar", () => {
  const query = e.select(e.int32(42));
  return {} as typeof query;
}).types([1155, "instantiations"]);

bench("select: free object", () => {
  const query = e.select({ meaning: e.int32(42) });
  return {} as typeof query;
}).types([2012, "instantiations"]);

bench("select: id only", () => {
  const query = e.select(e.User, () => ({ id: true }));
  return {} as typeof query;
}).types([3687, "instantiations"]);

bench("select: filtered", () => {
  const query = e.select(e.User, () => ({
    filter_single: { id: e.uuid("123") },
  }));
  return {} as typeof query;
}).types([5081, "instantiations"]);

bench("select: nested", () => {
  const user = e.select(e.User, () => ({
    filter_single: { id: e.uuid("123") },
  }));
  const query = e.select(user, () => ({ id: true }));

  return {} as typeof query;
}).types([6099, "instantiations"]);

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
}).types([6342, "instantiations"]);

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
}).types([6331, "instantiations"]);

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
}).types([6666, "instantiations"]);

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
}).types([6394, "instantiations"]);

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
}).types([6433, "instantiations"]);

bench("params select", () => {
  const query = e.params({ name: e.str }, (params) =>
    e.select(e.Hero, (hero) => ({
      name: true,
      villains: () => ({
        id: true,
        name: true,
      }),
      filter_single: e.op(hero.name, "=", params.name),
    }))
  );
  return {} as typeof query;
}).types([11907, "instantiations"]);
