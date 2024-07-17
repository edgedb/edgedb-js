import { bench } from "@arktype/attest";

import e from "./dbschema/edgeql-js";

const str0 = e.str("a");
const str1 = e.str("b");
const uuid0 = e.uuid("0");
const uuid1 = e.uuid("1");
const int0 = e.int16(0);
const int1 = e.int16(1);
const float0 = e.float32(0);
const float1 = e.float32(1);
const bool0 = e.bool(true);
const bool1 = e.bool(false);
const array0 = e.array([int0]);
const array1 = e.array([int1]);
const strArray0 = e.array([str0]);
const strArray1 = e.array([str1]);
const uuidArray0 = e.array([uuid0, uuid1]);
const datetime = e.datetime(new Date());
const duration = e.duration("PT10M");
const singleUser = e.cast(e.User, e.uuid("123"));
const allUsers = e.select(e.User);
const allMovies = e.select(e.Movie);
const newUser = e.insert(e.User, {
  favourite_movies: allMovies,
  username: "Me",
});

bench("e.literal: scalar", () => {
  const lit = e.literal(e.int32, 42);
  return {} as typeof lit;
}).types([250, "instantiations"]);

bench("e.int64: scalar", () => {
  const lit = e.int64(42);
  return {} as typeof lit;
}).types([27, "instantiations"]);

bench("e.uuid: scalar", () => {
  const lit = e.uuid("test");
  return {} as typeof lit;
}).types([27, "instantiations"]);

bench("e.literal: array literal", () => {
  const lit = e.literal(e.array(e.str), ["abcd"]);
  return {} as typeof lit;
}).types([545, "instantiations"]);

bench("e.array: array literal", () => {
  return {} as typeof array0;
}).types([250, "instantiations"]);

bench("e.literal: named tuple literal", () => {
  const lit = e.literal(e.tuple({ str: e.str }), {
    str: "asdf",
  });
  return {} as typeof lit;
}).types([8726, "instantiations"]);

bench("e.tuple: named tuple literal", () => {
  const lit = e.tuple({ str: str0 });
  return {} as typeof lit;
}).types([6059, "instantiations"]);

bench("e.literal: tuple literal", () => {
  const lit = e.literal(e.tuple([e.str, e.int32]), ["asdf", 42]);
  return {} as typeof lit;
}).types([3914, "instantiations"]);

bench("e.tuple: tuple literal", () => {
  const lit = e.tuple([str0, int0]);
  return {} as typeof lit;
}).types([2822, "instantiations"]);

bench("e.literal: array of tuples", () => {
  const lit = e.literal(e.array(e.tuple([e.str, e.int32])), [
    ["asdf", 42],
    ["qwer", 43],
  ]);
  return {} as typeof lit;
}).types([4234, "instantiations"]);

bench("e.array: array of tuples", () => {
  const lit = e.array([e.tuple([str0, int0]), e.tuple([str1, int1])]);
  return {} as typeof lit;
}).types([15134, "instantiations"]);

bench("base type: array", () => {
  const baseType = e.array(e.str);
  return {} as typeof baseType;
}).types([7, "instantiations"]);

bench("base type: named tuple", () => {
  const baseType = e.tuple({ str: e.str });
  return {} as typeof baseType;
}).types([2584, "instantiations"]);

bench("set: scalars", () => {
  const set = e.set(int0, int1, int0);
  return {} as typeof set;
}).types([5981, "instantiations"]);

bench("select: scalar", () => {
  const query = e.select(int0);
  return {} as typeof query;
}).types([318, "instantiations"]);

bench("select: free object", () => {
  const query = e.select({ meaning: int0 });
  return {} as typeof query;
}).types([832, "instantiations"]);

bench("select: id only", () => {
  const query = e.select(e.User, () => ({ id: true }));
  return {} as typeof query;
}).types([1335, "instantiations"]);

bench("select: filtered", () => {
  const query = e.select(e.User, () => ({
    filter_single: { id: e.uuid("123") },
  }));
  return {} as typeof query;
}).types([2491, "instantiations"]);

bench("select: nested", () => {
  const user = e.select(e.User, () => ({
    filter_single: { id: e.uuid("123") },
  }));
  const query = e.select(user, () => ({ id: true }));

  return {} as typeof query;
}).types([3908, "instantiations"]);

bench("select: complex", () => {
  const query = e.select(e.Movie, () => {
    return {
      id: true,
      characters: (char) => {
        const matchCharName = e.op(
          char["@character_name"],
          "in",
          e.set("Tony Stark", "The Weasel", "Batman"),
        );
        const isShort = e.op(char.height, "<", e.decimal("10.0"));
        const hasName = e.op(e.len(char.name), ">", 0);
        return {
          name: true,
          "@character_name": true,
          filter: e.op(
            matchCharName,
            "or",
            e.op(e.op(isShort, "??", true), "and", hasName),
          ),
        };
      },
    };
  });
  return {} as typeof query;
}).types([26665, "instantiations"]);

bench("select: nested operator", () => {
  const query = e.select(e.Hero, (h) => ({
    name: h.name,
    otherHeros: e.select(e.Hero, (h2) => ({
      name: true,
      name_one: h.name,
      name_two: h2.name,
      names_concat: e.op(h.name, "++", h2.name),
      order_by: h2.name,
    })),
    order_by: h.name,
  }));
  return {} as typeof query;
}).types([16920, "instantiations"]);

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
}).types([9058, "instantiations"]);

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
}).types([9356, "instantiations"]);

bench("select: with limit", () => {
  const query = e.select(e.Hero, (hero) => ({
    name: true,
    villains: {
      id: true,
      name: true,
      limit: 1,
    },
    filter_single: e.op(hero.name, "=", "Peter Parker"),
  }));
  return {} as typeof query;
}).types([9060, "instantiations"]);

bench("select: with offset", () => {
  const query = e.select(e.Hero, (hero) => ({
    name: true,
    villains: {
      id: true,
      name: true,
      offset: 1,
    },
    filter_single: e.op(hero.name, "=", "Peter Parker"),
  }));
  return {} as typeof query;
}).types([9060, "instantiations"]);

bench("select: with pointer override", () => {
  const query = e.select(e.Hero, (h) => ({
    height: e.decimal("10.0"),
  }));
  return {} as typeof query;
}).types([2321, "instantiations"]);

bench("params select", () => {
  const query = e.params({ name: e.str }, (params) =>
    e.select(e.Hero, (hero) => ({
      name: true,
      villains: {
        id: true,
        name: true,
      },
      filter_single: e.op(hero.name, "=", params.name),
    })),
  );
  return {} as typeof query;
}).types([13859, "instantiations"]);

bench("e.op: literalStr = literalStr", () => {
  const op = e.op("a", "=", "b");
  return {} as typeof op;
}).types([6300, "instantiations"]);

bench("e.op: str = str", () => {
  const op = e.op(str0, "=", str1);
  return {} as typeof op;
}).types([3798, "instantiations"]);

bench("e.op: uuid = uuid", () => {
  const op = e.op(uuid0, "=", uuid1);
  return {} as typeof op;
}).types([3803, "instantiations"]);

bench("e.op: str ilike str", () => {
  const op = e.op(str0, "ilike", str1);
  return {} as typeof op;
}).types([3579, "instantiations"]);

bench("e.op: array of nums = array of nums", () => {
  const o = e.op(array0, "=", array1);
  return {} as typeof o;
}).types([4280, "instantiations"]);

bench("e.op: array of strs = array of strs", () => {
  const op = e.op(strArray0, "=", strArray1);
  return {} as typeof op;
}).types([4282, "instantiations"]);

bench("e.op: object element in object set", () => {
  const op = e.op(singleUser, "in", allUsers);
  return {} as typeof op;
}).types([9152, "instantiations"]);

bench("e.op: not bool", () => {
  const op = e.op("not", true);
  return {} as typeof op;
}).types([133, "instantiations"]);

bench("e.op: coalescing equality", () => {
  const op = e.op(int0, "?=", int1);
  return {} as typeof op;
}).types([5927, "instantiations"]);

bench("e.op: datetime + duration", () => {
  const op = e.op(datetime, "+", duration);
  return {} as typeof op;
}).types([10168, "instantiations"]);

bench("e.op: complex if_else", () => {
  const op = e.op(
    allUsers,
    "if",
    e.op("exists", allUsers),
    "else",
    e.cast(e.User, e.set()),
  );
  return {} as typeof op;
}).types([15159, "instantiations"]);

bench("e.op: simple if_else", () => {
  const op = e.op("if", true, "then", "true", "else", "false");
  return {} as typeof op;
}).types([13851, "instantiations"]);

bench("e.op: complex coalesce", () => {
  const op = e.op(allUsers, "??", newUser);
  return {} as typeof op;
}).types([13460, "instantiations"]);

bench("e.op: nested and and or operations", () => {
  const op = e.op(
    e.op(str0, "=", str1),
    "and",
    e.op(e.op(str1, "ilike", str0), "or", e.op(int0, "<", int1)),
  );
  return {} as typeof op;
}).types([4984, "instantiations"]);

bench("e.op: string concatenation", () => {
  const op = e.op(str0, "++", str1);
  return {} as typeof op;
}).types([10215, "instantiations"]);

bench("e.op: integer addition", () => {
  const op = e.op(int0, "+", int1);
  return {} as typeof op;
}).types([10120, "instantiations"]);

bench("e.op: integer subtraction", () => {
  const op = e.op(int0, "-", int1);
  return {} as typeof op;
}).types([10140, "instantiations"]);

bench("e.op: integer multiplication", () => {
  const op = e.op(int0, "*", int1);
  return {} as typeof op;
}).types([10055, "instantiations"]);

bench("e.op: integer division", () => {
  const op = e.op(int0, "/", int1);
  return {} as typeof op;
}).types([10050, "instantiations"]);

bench("e.op: integer modulo", () => {
  const op = e.op(int0, "%", int1);
  return {} as typeof op;
}).types([10055, "instantiations"]);

bench("e.op: float addition", () => {
  const op = e.op(float0, "+", float1);
  return {} as typeof op;
}).types([10120, "instantiations"]);

bench("e.op: float subtraction", () => {
  const op = e.op(float0, "-", float1);
  return {} as typeof op;
}).types([10140, "instantiations"]);

bench("e.op: float multiplication", () => {
  const op = e.op(float0, "*", float1);
  return {} as typeof op;
}).types([10055, "instantiations"]);

bench("e.op: float division", () => {
  const op = e.op(float0, "/", float1);
  return {} as typeof op;
}).types([10050, "instantiations"]);

bench("e.op: boolean and", () => {
  const op = e.op(bool0, "and", bool1);
  return {} as typeof op;
}).types([3607, "instantiations"]);

bench("e.op: boolean or", () => {
  const op = e.op(bool0, "or", bool1);
  return {} as typeof op;
}).types([3607, "instantiations"]);

bench("e.op: string inequality", () => {
  const op = e.op(str0, "!=", str1);
  return {} as typeof op;
}).types([3798, "instantiations"]);

bench("e.op: integer less than", () => {
  const op = e.op(int0, "<", int1);
  return {} as typeof op;
}).types([3796, "instantiations"]);

bench("e.op: integer greater than", () => {
  const op = e.op(int0, ">", int1);
  return {} as typeof op;
}).types([3796, "instantiations"]);

bench("e.op: integer less than or equal", () => {
  const op = e.op(int0, "<=", int1);
  return {} as typeof op;
}).types([3796, "instantiations"]);

bench("e.op: integer greater than or equal", () => {
  const op = e.op(int0, ">=", int1);
  return {} as typeof op;
}).types([3796, "instantiations"]);

bench("e.op: set union", () => {
  const op = e.op(allUsers, "union", singleUser);
  return {} as typeof op;
}).types([60844, "instantiations"]);

bench("e.op: nested boolean and", () => {
  const op = e.op(e.op(bool0, "and", bool1), "and", e.op(bool1, "or", bool0));
  return {} as typeof op;
}).types([4504, "instantiations"]);

bench("e.op: nested integer addition", () => {
  const op = e.op(e.op(int0, "+", int1), "+", e.op(int1, "+", int0));
  return {} as typeof op;
}).types([15089, "instantiations"]);

bench("e.op: nested float multiplication", () => {
  const op = e.op(e.op(float0, "*", float1), "*", e.op(float1, "*", float0));
  return {} as typeof op;
}).types([14894, "instantiations"]);

bench("e.op: nested string concatenation", () => {
  const op = e.op(e.op(str0, "++", str1), "++", e.op(str1, "++", str0));
  return {} as typeof op;
}).types([15350, "instantiations"]);

bench("e.op: nested integer comparison", () => {
  const op = e.op(e.op(int0, "<", int1), "and", e.op(int1, ">", int0));
  return {} as typeof op;
}).types([4879, "instantiations"]);

bench("e.op: nested float comparison", () => {
  const op = e.op(
    e.op(float0, "<=", float1),
    "and",
    e.op(float1, ">=", float0),
  );
  return {} as typeof op;
}).types([4879, "instantiations"]);

bench("e.op: nested boolean or", () => {
  const op = e.op(e.op(bool0, "or", bool1), "or", e.op(bool1, "and", bool0));
  return {} as typeof op;
}).types([4504, "instantiations"]);

bench("e.op: nested integer subtraction", () => {
  const op = e.op(e.op(int0, "-", int1), "-", e.op(int1, "-", int0));
  return {} as typeof op;
}).types([15149, "instantiations"]);

bench("e.op: nested float division", () => {
  const op = e.op(e.op(float0, "/", float1), "/", e.op(float1, "/", float0));
  return {} as typeof op;
}).types([14879, "instantiations"]);

bench("e.op: nested string inequality", () => {
  const op = e.op(e.op(str0, "!=", str1), "and", e.op(str1, "=", str0));
  return {} as typeof op;
}).types([4880, "instantiations"]);

bench("e.op: nested integer equality", () => {
  const op = e.op(e.op(int0, "=", int1), "or", e.op(int1, "!=", int0));
  return {} as typeof op;
}).types([4877, "instantiations"]);

bench("e.op: nested float equality", () => {
  const op = e.op(e.op(float0, "=", float1), "or", e.op(float1, "!=", float0));
  return {} as typeof op;
}).types([4877, "instantiations"]);
