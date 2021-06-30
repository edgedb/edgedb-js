import * as e from "../generated/example";
import {reflection as $} from "edgedb";
import {mergeObjectTypes, typeutil} from "../../src/reflection";
const HeroType = e.default.$Hero;

test("property hydration", () => {
  expect(typeof HeroType).toBe("object");
  expect(HeroType.__name__).toBe("default::Hero");
  expect(HeroType.__shape__.name.__kind__).toBe("property");
  expect(HeroType.__shape__.name.cardinality).toBe($.Cardinality.One);
  expect(HeroType.__shape__.name.target).toEqual(e.std.$Str);
  expect(HeroType.__shape__.name.target.__kind__).toEqual($.TypeKind.scalar);
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
  expect(unnamedTuple.__kind__).toEqual($.TypeKind.unnamedtuple);
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
  expect(Object.keys(merged.__shape__).length).toEqual(4);
  expect(Object.keys(merged.__shape__).includes("id")).toEqual(true);
  expect(Object.keys(merged.__shape__).includes("__type__")).toEqual(true);
  expect(Object.keys(merged.__shape__).includes("name")).toEqual(true);
  expect(Object.keys(merged.__shape__).includes("age")).toEqual(true);
  const _f1: typeutil.assertEqual<
    typeof merged["__tstype__"],
    {id: string; age: number | null; name: string | null; __type__: any}
  > = true;
});

export {};
