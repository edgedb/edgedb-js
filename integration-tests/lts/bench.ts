import { bench } from "@arktype/attest";

import e from "./dbschema/edgeql-js";
import { type BaseTypeToTsType } from "./dbschema/edgeql-js/typesystem";

bench("BaseTypeToTsType: scalar", () => {
  const lit = e.int32(42);
  return {} as BaseTypeToTsType<typeof lit>;
}).types([596, "instantiations"]);

bench("e.literal: scalar", () => {
  const lit = e.literal(e.int32, 42);
  return {} as typeof lit;
}).types([755, "instantiations"]);

bench("e.int32: scalar", () => {
  const lit = e.int32(42);
  return {} as typeof lit;
}).types([556, "instantiations"]);

bench("e.str: scalar", () => {
  const lit = e.str("abcd");
  return {} as typeof lit;
}).types([894, "instantiations"]);

bench("BaseTypeToTsType: array literal", () => {
  const lit = e.array([e.str("abcd")]);
  return {} as BaseTypeToTsType<typeof lit>;
}).types([2394, "instantiations"]);

bench("e.literal: array literal", () => {
  const lit = e.literal(e.array(e.str), ["abcd"]);
  return {} as typeof lit;
}).types([1980, "instantiations"]);

bench("e.array: array literal", () => {
  const lit = e.array([e.str("abcd")]);
  return {} as typeof lit;
}).types([2367, "instantiations"]);

bench("e.literal: named tuple literal", () => {
  const lit = e.literal(e.tuple({ str: e.str }), {
    str: "asdf",
  });
  return {} as typeof lit;
}).types([10765, "instantiations"]);

bench("e.tuple: named tuple literal", () => {
  const lit = e.tuple({ str: e.str("asdf") });
  return {} as typeof lit;
}).types([7564, "instantiations"]);

bench("e.literal: tuple literal", () => {
  const lit = e.literal(e.tuple([e.str, e.int32]), ["asdf", 42]);
  return {} as typeof lit;
}).types([4670, "instantiations"]);

bench("e.tuple: tuple literal", () => {
  const lit = e.tuple([e.str("asdf"), e.int32(42)]);
  return {} as typeof lit;
}).types([4836, "instantiations"]);

bench("e.literal: array of tuples", () => {
  const lit = e.literal(e.array(e.tuple([e.str, e.int32])), [
    ["asdf", 42],
    ["qwer", 43],
  ]);
  return {} as typeof lit;
}).types([5664, "instantiations"]);

bench("e.array: array of tuples", () => {
  const lit = e.array([
    e.tuple([e.str("asdf"), e.int32(42)]),
    e.tuple([e.str("qwer"), e.int32(43)]),
  ]);
  return {} as typeof lit;
}).types([20582, "instantiations"]);

bench("base type: array", () => {
  const baseType = e.array(e.str);
  return {} as typeof baseType;
}).types([351, "instantiations"]);

bench("base type: named tuple", () => {
  const baseType = e.tuple({ str: e.str });
  return {} as typeof baseType;
}).types([3564, "instantiations"]);

bench("select: scalar", () => {
  const query = e.select(e.int32(42));
  return {} as typeof query;
}).types([1173, "instantiations"]);

bench("select: free object", () => {
  const query = e.select({ meaning: e.int32(42) });
  return {} as typeof query;
}).types([2027, "instantiations"]);

bench("select: id only", () => {
  const query = e.select(e.User, () => ({ id: true }));
  return {} as typeof query;
}).types([3687, "instantiations"]);

bench("select: filtered", () => {
  const query = e.select(e.User, () => ({
    filter_single: { id: e.uuid("123") },
  }));
  return {} as typeof query;
}).types([5100, "instantiations"]);

bench("select: nested", () => {
  const user = e.select(e.User, () => ({
    filter_single: { id: e.uuid("123") },
  }));
  const query = e.select(user, () => ({ id: true }));

  return {} as typeof query;
}).types([6116, "instantiations"]);

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
}).types([6352, "instantiations"]);

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
}).types([6428, "instantiations"]);

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
}).types([6765, "instantiations"]);

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
}).types([6490, "instantiations"]);

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
}).types([6533, "instantiations"]);

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
}).types([11290, "instantiations"]);

bench("e.op: str = str", () => {
  const op = e.op(e.str("a"), "=", e.str("b"));
  return {} as typeof op;
}).types([1854, "instantiations"]);

bench("e.op: str ilike str", () => {
  const op = e.op(e.str("a"), "ilike", e.str("b"));
  return {} as typeof op;
}).types([51413, "instantiations"]);
