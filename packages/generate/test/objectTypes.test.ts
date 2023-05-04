import * as $ from "../src/syntax/reflection";
import type { PropertyDesc } from "../src/syntax/typesystem";
import e from "../dbschema/edgeql-js";
import type { $str } from "../dbschema/edgeql-js/modules/std";
import { tc } from "./setupTeardown";

const $Hero = e.default.Hero.__element__;
const $AnnotationSubject = e.schema.AnnotationSubject.__element__;
const $Bag = e.default.Bag.__element__;
const $Simple = e.default.Simple.__element__;
const $Z = e.default.Z.__element__;

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
  // expect(e.default.Movie.profile.__exclusive__).toEqual(true);
  expect(e.default.Movie.__element__.__pointers__.characters.exclusive).toEqual(
    false
  );
  // expect(e.default.Movie.characters.__exclusive__).toEqual(false);
});

test("link hydration", () => {
  expect($Hero.__pointers__.villains.__kind__).toBe("link");
  expect($Hero.__pointers__.villains.target.__kind__).toBe($.TypeKind.object);
  expect($Hero.__pointers__.villains.cardinality).toBe($.Cardinality.Many);
  expect($Hero.__pointers__.villains.target.__name__).toEqual(
    "default::Villain"
  );
  expect($Hero.__pointers__.villains.properties).toEqual({});

  // type union link
  expect($Z.__pointers__.xy.__kind__).toEqual("link");
  expect($Z.__pointers__.xy.target.__name__).toEqual("default::X | default::Y");
  expect(Object.keys($Z.__pointers__.xy.target.__pointers__).sort()).toEqual([
    "__type__",
    "a",
    "id",
  ]);
  expect($Z.__pointers__.xy.target.__pointers__.a.target.__name__).toEqual(
    "std::str"
  );
});

const link = $AnnotationSubject.__pointers__.annotations;
test("link properties", () => {
  expect(link.properties["@value"].target.__name__).toEqual("std::str");
  expect(link.properties["@value"].cardinality).toEqual(
    $.Cardinality.AtMostOne
  );
  expect(link.properties["@value"].__kind__).toEqual("property");
});

test("overloaded properties", () => {
  tc.assert<
    tc.IsExact<
      (typeof e.AdminUser)["__element__"]["__pointers__"]["username"],
      PropertyDesc<$str, $.Cardinality.One, true, false, false, false>
    >
  >(true);
});

test("named tuple tests", () => {
  // named tuple tests
  const BagShape = $Bag.__pointers__;
  expect(BagShape.namedTuple.cardinality).toEqual($.Cardinality.AtMostOne);

  const namedTuple = BagShape.namedTuple.target;
  expect(namedTuple.__kind__).toEqual($.TypeKind.namedtuple);
  expect(namedTuple.__shape__.x.__name__).toEqual("std::str");
  expect(namedTuple.__shape__.x.__kind__).toEqual($.TypeKind.scalar);
  expect(namedTuple.__shape__.y.__name__).toEqual("std::int64");
});

test("unnamed tuple tests", () => {
  // named tuple tests
  const BagShape = $Bag.__pointers__;
  const unnamedTuple = BagShape.unnamedTuple.target;
  expect(unnamedTuple.__kind__).toEqual($.TypeKind.tuple);
  expect(unnamedTuple.__items__[0].__name__).toEqual("std::str");
  expect(unnamedTuple.__items__[1].__name__).toEqual("std::int64");
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
  type merged = keyof (typeof merged)["__pointers__"];
  // shared keys
  tc.assert<tc.IsExact<merged, "id" | "__type__" | "name" | "age">>(true);
});

test("backlinks", () => {
  const heroMovie = e.Hero["<characters[is Movie]"];

  const heroVillain = e.Hero["<nemesis[is Villain]"];
  expect(heroMovie.toEdgeQL()).toEqual(
    `DETACHED default::Hero.<characters[is Movie]`
  );
  expect(heroMovie.__element__.__name__).toEqual("default::Movie");
  expect(heroVillain.nemesis.__element__.__name__).toEqual("default::Hero");
  expect(
    e.select(e.Villain, () => ({ limit: 1 })).assert_single().nemesis
      .__cardinality__
  ).toEqual($.Cardinality.AtMostOne);

  expect(e.Profile["<profile"].__element__.__name__).toEqual("std::BaseObject");
  expect(e.Profile["<profile"].__cardinality__).toEqual($.Cardinality.Many);

  const merged = $.$mergeObjectTypes(e.Hero.__element__, e.Villain.__element__);
  expect(merged.__pointers__["<characters"].target.__name__).toEqual(
    "std::BaseObject"
  );
  expect(merged.__pointers__["<characters[is Movie]"].target.__name__).toEqual(
    "default::Movie"
  );
});

test("select *", () => {
  const movieStarShape = {
    id: true,
    title: true,
    genre: true,
    rating: true,
    release_year: true,
  };

  // on root object
  const movieStar = e.Movie["*"];

  expect(movieStar).toEqual(movieStarShape);
  tc.assert<
    tc.IsExact<
      typeof movieStar,
      {
        id: true;
        title: true;
        genre: true;
        rating: true;
        release_year: true;
      }
    >
  >(true);

  // on select scope
  e.select(e.Movie, (movie) => {
    expect(movie["*"]).toEqual(movieStarShape);

    return {};
  });

  // on wrapped select scope
  e.select(
    e.select(e.Movie, () => ({})),
    (movie) => {
      expect(movie["*"]).toEqual(movieStarShape);

      return {};
    }
  );

  // on polymorphic select scope
  e.select(e.Person.is(e.Hero), (hero) => {
    expect(hero["*"]).toEqual({
      id: true,
      name: true,
      secret_identity: true,
      number_of_movies: true,
    });

    return {};
  });

  // on insert select
  e.select(e.insert(e.Movie, { title: "test" }), (movie) => {
    expect(movie["*"]).toEqual(movieStarShape);

    return movie["*"];
  }).toEdgeQL();
});
