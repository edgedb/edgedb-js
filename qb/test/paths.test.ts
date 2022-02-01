import {$} from "edgedb";
import e from "../dbschema/edgeql/index";
import {$PathNode} from "../dbschema/edgeql/syntax/syntax";
import {tc} from "./setupTeardown";

test("path structure", () => {
  const Hero = e.default.Hero;
  type Hero = typeof Hero;
  const $Hero = e.Hero.__element__;
  const $Villain = e.Villain.__element__;
  const HeroSetSingleton = $.$toSet($Hero, $.Cardinality.One);
  const HeroSingleton = $PathNode(HeroSetSingleton, null, false);
  type HeroSingleton = typeof HeroSingleton;
  const VillainRoot = $.$toSet($Villain, $.Cardinality.One);
  const Villain = $PathNode(VillainRoot, null, false);

  expect(Hero.name.__element__.__kind__).toEqual($.TypeKind.scalar);
  expect(Hero.name.__element__.__name__).toEqual("std::str");
  expect(Hero.name.__cardinality__).toEqual($.Cardinality.Many);
  expect(HeroSingleton.name.__cardinality__).toEqual($.Cardinality.One);

  expect(Villain["<villains[IS default::Hero]"].__element__.__name__).toEqual(
    "default::Hero"
  );

  // check path root cardinalities
  tc.assert<tc.IsExact<Hero["__cardinality__"], $.Cardinality.Many>>(true);
  tc.assert<tc.IsExact<HeroSingleton["__cardinality__"], $.Cardinality.One>>(
    true
  );

  // Hero.name
  expect(Hero.name.__element__.__name__).toEqual("std::str");
  expect(Hero.name.__cardinality__).toEqual($.Cardinality.Many);
  tc.assert<tc.IsExact<Hero["name"]["__cardinality__"], $.Cardinality.Many>>(
    true
  );

  // HeroSingleton.name
  expect(HeroSingleton.name.__cardinality__).toEqual($.Cardinality.One);
  tc.assert<
    tc.IsExact<HeroSingleton["name"]["__cardinality__"], $.Cardinality.One>
  >(true);

  // AtMostOneHero.name
  // test cardinality merging
  const HeroSetAtLeastOne = $.$toSet($Hero, $.Cardinality.AtLeastOne);
  const AtLeastOneHero = $PathNode(HeroSetAtLeastOne, null, false);
  type AtLeastOneHero = typeof AtLeastOneHero;
  expect(AtLeastOneHero.id.__cardinality__).toEqual($.Cardinality.AtLeastOne);
  expect(AtLeastOneHero.number_of_movies.__cardinality__).toEqual(
    $.Cardinality.Many
  );
  tc.assert<
    tc.IsExact<
      AtLeastOneHero["number_of_movies"]["__cardinality__"],
      $.Cardinality.Many
    >
  >(true);

  // Hero.villains.id
  expect(Hero.villains.id.__cardinality__).toEqual($.Cardinality.Many);
  tc.assert<
    tc.IsExact<
      HeroSingleton["villains"]["id"]["__cardinality__"],
      $.Cardinality.Many
    >
  >(true);

  expect(Hero.villains.nemesis.villains.name.toEdgeQL()).toEqual(
    "DETACHED default::Hero.villains.nemesis.villains.name"
  );
  const Herotype = Hero.__type__.__type__.__type__;
  expect(Herotype.annotations.__type__.computed_fields.toEdgeQL()).toEqual(
    "DETACHED default::Hero.__type__.__type__.__type__.annotations.__type__.computed_fields"
  );
  expect(Hero.villains.__parent__.linkName).toEqual("villains");
  expect(Hero.villains.__parent__.type.__element__.__name__).toEqual(
    "default::Hero"
  );
});

test("type intersection on path node", () => {
  const $Hero = e.Hero.__element__;
  const person = e.Person;
  const hero = person.is(e.Hero);
  tc.assert<
    tc.IsExact<
      typeof hero["__element__"]["__pointers__"],
      typeof $Hero["__pointers__"]
    >
  >(true);
  tc.assert<
    tc.IsExact<
      typeof hero["__element__"]["__name__"],
      typeof $Hero["__name__"]
    >
  >(true);
  tc.assert<tc.IsExact<typeof hero["__element__"]["__shape__"], {id: true}>>(
    true
  );
  expect(hero.__element__.__shape__).toEqual({id: true});
  expect(hero.__element__.__name__).toEqual("default::Hero");
  expect(hero.__element__.__kind__).toEqual($.TypeKind.object);
  expect(hero.__kind__).toEqual($.ExpressionKind.TypeIntersection);
  // referential equality
  expect(hero.__expr__).toBe(person);
  // check that pathify works
  expect(hero.number_of_movies.__element__.__name__).toEqual("std::number");
  expect(hero.toEdgeQL()).toEqual(
    `DETACHED default::Person[IS default::Hero]`
  );
});

test("type intersection on select", () => {
  const q2 = e.select(e.Person, () => ({id: true, name: true, limit: 5}));
  const hero = q2.is(e.Hero);
  expect(hero.__element__.__name__).toEqual("default::Hero");
  expect(hero.__element__.__kind__).toEqual($.TypeKind.object);
  expect(hero.__kind__).toEqual($.ExpressionKind.TypeIntersection);
  // referential equality
  expect(hero.__expr__).toBe(q2);
  // check that pathify works
  expect(hero.number_of_movies.__element__.__name__).toEqual("std::number");
});

test("assert_single", () => {
  const singleHero = e.Hero.assert_single();
  tc.assert<
    tc.IsExact<typeof singleHero["__cardinality__"], $.Cardinality.AtMostOne>
  >(true);
  expect(singleHero.__cardinality__).toEqual($.Cardinality.AtMostOne);
});
