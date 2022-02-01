import {$} from "edgedb";
import e from "../dbschema/edgeql";
import {tc} from "./setupTeardown";

const $Hero = e.default.Hero.__element__;
const $AnnotationSubject = e.schema.AnnotationSubject.__element__;
const $Bag = e.default.Bag.__element__;
const $Simple = e.default.Simple.__element__;

test("property hydration", () => {
  expect(typeof $Hero).toBe("object");
  expect($Hero.__name__).toBe("default::Hero");
  expect($Hero.__pointers__.name.__kind__).toBe("property");
  expect($Hero.__pointers__.name.cardinality).toBe($.Cardinality.One);
  expect($Hero.__pointers__.name.target).toEqual(e.std.str);
  expect($Hero.__pointers__.name.target.__kind__).toEqual($.TypeKind.scalar);
  expect($Hero.__pointers__.name.exclusive).toEqual(true);
  expect($Hero.__pointers__.secret_identity.exclusive).toEqual(false);

  expect(e.default.Movie.__element__.__pointers__.profile.exclusive).toEqual(
    true
  );
  expect(e.default.Movie.profile.__exclusive__).toEqual(true);
  expect(
    e.default.Movie.__element__.__pointers__.characters.exclusive
  ).toEqual(false);
  expect(e.default.Movie.characters.__exclusive__).toEqual(false);
});

test("link hydration", () => {
  expect($Hero.__pointers__.villains.__kind__).toBe("link");
  expect($Hero.__pointers__.villains.target.__kind__).toBe($.TypeKind.object);
  expect($Hero.__pointers__.villains.cardinality).toBe($.Cardinality.Many);
  expect($Hero.__pointers__.villains.target.__name__).toEqual(
    "default::Villain"
  );
  expect($Hero.__pointers__.villains.properties).toEqual({});
});

const link = $AnnotationSubject.__pointers__.annotations;
test("link properties", () => {
  expect(link.properties["@value"].target.__name__).toEqual("std::str");
  expect(link.properties["@value"].cardinality).toEqual(
    $.Cardinality.AtMostOne
  );
  expect(link.properties["@value"].__kind__).toEqual("property");
});

test("named tuple tests", () => {
  // named tuple tests
  const BagShape = $Bag.__pointers__;
  expect(BagShape.namedTuple.cardinality).toEqual($.Cardinality.AtMostOne);

  const namedTuple = BagShape.namedTuple.target;
  expect(namedTuple.__kind__).toEqual($.TypeKind.namedtuple);
  expect(namedTuple.__shape__.x.__name__).toEqual("std::str");
  expect(namedTuple.__shape__.x.__kind__).toEqual($.TypeKind.scalar);
  expect(namedTuple.__shape__.y.__name__).toEqual("std::number");
});

test("unnamed tuple tests", () => {
  // named tuple tests
  const BagShape = $Bag.__pointers__;
  const unnamedTuple = BagShape.unnamedTuple.target;
  expect(unnamedTuple.__kind__).toEqual($.TypeKind.tuple);
  expect(unnamedTuple.__items__[0].__name__).toEqual("std::str");
  expect(unnamedTuple.__items__[1].__name__).toEqual("std::number");
});

test("array tests", () => {
  // named tuple tests
  const BagShape = $Bag.__pointers__;
  const arrayProp = BagShape.stringsArr.target;
  expect(arrayProp.__kind__).toEqual($.TypeKind.array);
  expect(arrayProp.__element__.__name__).toEqual("std::str");
});

test("merging tests", () => {
  const merged = $.$mergeObjectTypes($Bag, $Simple);
  expect(Object.keys(merged.__pointers__).length).toEqual(4);
  expect(Object.keys(merged.__pointers__).includes("id")).toEqual(true);
  expect(Object.keys(merged.__pointers__).includes("__type__")).toEqual(true);
  expect(Object.keys(merged.__pointers__).includes("name")).toEqual(true);
  expect(Object.keys(merged.__pointers__).includes("age")).toEqual(true);
  type merged = keyof typeof merged["__pointers__"];
  // shared keys
  tc.assert<tc.IsExact<merged, "id" | "__type__" | "name" | "age">>(true);
});

test("backlinks", () => {
  const heroMovie = e.Hero["<characters[IS default::Movie]"];

  const heroVillain = e.Hero["<nemesis[IS default::Villain]"];
  expect(heroMovie.toEdgeQL()).toEqual(
    `DETACHED default::Hero.<characters[IS default::Movie]`
  );
  expect(heroMovie.__element__.__name__).toEqual("default::Movie");
  expect(heroVillain.nemesis.__element__.__name__).toEqual("default::Hero");
  expect(
    e.select(e.Villain, () => ({limit: 1})).assert_single().nemesis
      .__cardinality__
  ).toEqual($.Cardinality.AtMostOne);

  expect(e.Profile["<profile"].__element__.__name__).toEqual(
    "std::BaseObject"
  );
  expect(e.Profile["<profile"].__cardinality__).toEqual($.Cardinality.Many);

  const merged = $.$mergeObjectTypes(
    e.Hero.__element__,
    e.Villain.__element__
  );
  expect(merged.__pointers__["<characters"].target.__name__).toEqual(
    "std::BaseObject"
  );
  expect(
    merged.__pointers__["<characters[IS default::Movie]"].target.__name__
  ).toEqual("default::Movie");
});
