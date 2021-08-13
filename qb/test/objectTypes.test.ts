import e from "../generated/example";

import {reflection as $} from "edgedb/src/index.node";
import {
  Cardinality,
  computeObjectShape,
  mergeObjectTypes,
  typeutil,
} from "../../src/reflection";
import {$BaseObject} from "generated/example/modules/std";

const HeroType = e.default.$Hero;

test("property hydration", () => {
  expect(typeof HeroType).toBe("object");
  expect(HeroType.__name__).toBe("default::Hero");
  expect(HeroType.__shape__.name.__kind__).toBe("property");
  expect(HeroType.__shape__.name.cardinality).toBe($.Cardinality.One);
  expect(HeroType.__shape__.name.target).toEqual(e.std.str);
  expect(HeroType.__shape__.name.target.__kind__).toEqual($.TypeKind.scalar);
  expect(HeroType.__shape__.name.exclusive).toEqual(true);
  expect(HeroType.__shape__.secret_identity.exclusive).toEqual(false);

  expect(e.default.Movie.__element__.__shape__.profile.exclusive).toEqual(
    true
  );
  expect(e.default.Movie.profile.__exclusive__).toEqual(true);
  expect(e.default.Movie.__element__.__shape__.characters.exclusive).toEqual(
    false
  );
  expect(e.default.Movie.characters.__exclusive__).toEqual(false);
});

test("link hydration", () => {
  expect(HeroType.__shape__.villains.__kind__).toBe("link");
  expect(HeroType.__shape__.villains.target.__kind__).toBe($.TypeKind.object);
  expect(HeroType.__shape__.villains.cardinality).toBe($.Cardinality.Many);
  expect(HeroType.__shape__.villains.target.__name__).toEqual(
    "default::Villain"
  );
  expect(HeroType.__shape__.villains.properties).toEqual({});
});

const link = e.schema.$AnnotationSubject.__shape__.annotations;
test("link properties", () => {
  expect(link.properties.value.target.__name__).toEqual("std::str");
  expect(link.properties.value.cardinality).toEqual($.Cardinality.AtMostOne);
  expect(link.properties.value.__kind__).toEqual("property");
});

test("named tuple tests", () => {
  // named tuple tests
  const BagShape = e.default.$Bag.__shape__;
  expect(BagShape.namedTuple.cardinality).toEqual($.Cardinality.AtMostOne);

  const namedTuple = BagShape.namedTuple.target;
  expect(namedTuple.__kind__).toEqual($.TypeKind.namedtuple);
  expect(namedTuple.__shape__.x.__name__).toEqual("std::str");
  expect(namedTuple.__shape__.x.__kind__).toEqual($.TypeKind.scalar);
  expect(namedTuple.__shape__.y.__name__).toEqual("std::int64");
});

test("unnamed tuple tests", () => {
  // named tuple tests
  const BagShape = e.default.$Bag.__shape__;
  const unnamedTuple = BagShape.unnamedTuple.target;
  expect(unnamedTuple.__kind__).toEqual($.TypeKind.tuple);
  expect(unnamedTuple.__items__[0].__name__).toEqual("std::str");
  expect(unnamedTuple.__items__[1].__name__).toEqual("std::int64");
});

test("array tests", () => {
  // named tuple tests
  const BagShape = e.default.$Bag.__shape__;
  const arrayProp = BagShape.stringsArr.target;
  expect(arrayProp.__kind__).toEqual($.TypeKind.array);
  expect(arrayProp.__element__.__name__).toEqual("std::str");
});

test("merging tests", () => {
  const merged = mergeObjectTypes(e.default.$Bag, e.default.$Simple);
  type merged = typeof merged;
  type alkdjf = string extends keyof merged["__shape__"] ? true : false;
  type adf = computeObjectShape<
    merged["__shape__"],
    merged["__params__"],
    merged["__polys__"]
  >;
  // type aklsdjf = keyof (object | null);
  expect(Object.keys(merged.__shape__).length).toEqual(4);
  expect(Object.keys(merged.__shape__).includes("id")).toEqual(true);
  expect(Object.keys(merged.__shape__).includes("__type__")).toEqual(true);
  expect(Object.keys(merged.__shape__).includes("name")).toEqual(true);
  expect(Object.keys(merged.__shape__).includes("age")).toEqual(true);
  type asdf = typeof merged["__tstype__"];
  const _f1: typeutil.assertEqual<
    typeof merged["__tstype__"],
    {id: string; age: number | null; name: string | null; __type__: any}
  > = true;
});

test("backlinks", () => {
  const heroMovie = e.Hero["<characters[IS default::Movie]"];

  const heroVillain = e.Hero["<nemesis[IS default::Villain]"];
  expect(heroMovie.toEdgeQL()).toEqual(
    `default::Hero.<characters[IS default::Movie]`
  );
  expect(heroMovie.__element__.__name__).toEqual("default::Movie");
  expect(heroVillain.nemesis.__element__.__name__).toEqual("default::Hero");
  expect(e.select(e.Villain).limit(1).nemesis.__cardinality__).toEqual(
    Cardinality.AtMostOne
  );

  expect(e.Profile["<profile"].__element__.__name__).toEqual(
    "std::BaseObject"
  );
  expect(e.Profile["<profile"].__cardinality__).toEqual(Cardinality.Many);

  const merged = mergeObjectTypes(e.Hero.__element__, e.Villain.__element__);
  expect(merged.__shape__["<characters"].target.__name__).toEqual(
    "std::BaseObject"
  );
  expect(
    merged.__shape__["<characters[IS default::Movie]"].target.__name__
  ).toEqual("default::Movie");
});
