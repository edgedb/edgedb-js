import e from "../generated/example";
import {reflection as $} from "edgedb/src/index.node";

import {$Hero} from "generated/example/modules/default";

import {
  Cardinality,
  ExpressionKind,
  TypeKind,
  typeutil,
} from "edgedb/src/reflection";

test("path structure", () => {
  const Hero = e.default.Hero;
  type Hero = typeof Hero;
  const HeroSetSingleton = $.$toSet(e.default.$Hero, $.Cardinality.One);
  const HeroSingleton = e.$expr_PathNode(HeroSetSingleton, null, false);
  type HeroSingleton = typeof HeroSingleton;
  const VillainRoot = $.$toSet(e.default.$Villain, $.Cardinality.One);
  const Villain = e.$expr_PathNode(VillainRoot, null, false);

  expect(Hero.name.__element__.__kind__).toEqual($.TypeKind.scalar);
  expect(Hero.name.__element__.__name__).toEqual("std::str");
  expect(Hero.name.__cardinality__).toEqual($.Cardinality.Many);
  expect(HeroSingleton.name.__cardinality__).toEqual($.Cardinality.One);

  // check path root cardinalities
  const _t1: $.typeutil.assertEqual<
    Hero["__cardinality__"],
    $.Cardinality.Many
  > = true;
  const _t2: $.typeutil.assertEqual<
    HeroSingleton["__cardinality__"],
    $.Cardinality.One
  > = true;

  // Hero.name
  expect(Hero.name.__element__.__name__).toEqual("std::str");
  expect(Hero.name.__cardinality__).toEqual($.Cardinality.Many);
  const _t1952: $.typeutil.assertEqual<
    Hero["name"]["__cardinality__"],
    $.Cardinality.Many
  > = true;

  // HeroSingleton.name
  expect(HeroSingleton.name.__cardinality__).toEqual($.Cardinality.One);
  const _t3: $.typeutil.assertEqual<
    HeroSingleton["name"]["__cardinality__"],
    $.Cardinality.One
  > = true;

  // AtMostOneHero.name
  // test cardinality merging
  const HeroSetAtLeastOne = $.$toSet(
    e.default.$Hero,
    $.Cardinality.AtLeastOne
  );
  const AtLeastOneHero = e.$expr_PathNode(HeroSetAtLeastOne, null, false);
  type AtLeastOneHero = typeof AtLeastOneHero;
  expect(AtLeastOneHero.id.__cardinality__).toEqual($.Cardinality.AtLeastOne);
  expect(AtLeastOneHero.number_of_movies.__cardinality__).toEqual(
    $.Cardinality.Many
  );
  const _t41853: $.typeutil.assertEqual<
    AtLeastOneHero["number_of_movies"]["__cardinality__"],
    $.Cardinality.Many
  > = true;

  // Hero.villains.id
  expect(Hero.villains.id.__cardinality__).toEqual($.Cardinality.Many);
  const _t4896: $.typeutil.assertEqual<
    HeroSingleton["villains"]["id"]["__cardinality__"],
    $.Cardinality.Many
  > = true;

  expect(Hero.villains.nemesis.villains.name.toEdgeQL()).toEqual(
    "default::Hero.villains.nemesis.villains.name"
  );
  const Herotype = Hero.__type__.__type__.__type__;
  expect(Herotype.annotations.__type__.computed_fields.toEdgeQL()).toEqual(
    "default::Hero.__type__.__type__.__type__.annotations.__type__.computed_fields"
  );
  expect(Hero.villains.__parent__.linkName).toEqual("villains");
  expect(Hero.villains.__parent__.type.__element__.__name__).toEqual(
    "default::Hero"
  );
});

test("type intersection on path node", () => {
  const person = e.Person;
  const hero = person.$is(e.Hero);
  const f1: typeutil.assertEqual<typeof hero["__element__"], typeof $Hero> =
    true;
  expect(hero.__element__.__name__).toEqual("default::Hero");
  expect(hero.__element__.__kind__).toEqual(TypeKind.object);
  expect(hero.__kind__).toEqual(ExpressionKind.TypeIntersection);
  // referential equality
  expect(hero.__expr__).toBe(person);
  // check that pathify works
  expect(hero.number_of_movies.__element__.__name__).toEqual("std::int64");
  expect(hero.toEdgeQL()).toEqual(`default::Person[IS default::Hero]`);
});

test("type intersection on select", () => {
  const q2 = e.select(e.Person, {id: true, name: true}).limit(5);
  const hero = q2.$is(e.Hero);
  const f2: typeutil.assertEqual<typeof hero["__element__"], typeof $Hero> =
    true;
  expect(hero.__element__.__name__).toEqual("default::Hero");
  expect(hero.__element__.__kind__).toEqual(TypeKind.object);
  expect(hero.__kind__).toEqual(ExpressionKind.TypeIntersection);
  // referential equality
  expect(hero.__expr__).toBe(q2);
  // check that pathify works
  expect(hero.number_of_movies.__element__.__name__).toEqual("std::int64");
});

// test("assertSingle", () => {
//   const singleHero = e.Hero.$assertSingle();
//   const f1: typeutil.assertEqual<
//     typeof singleHero["__cardinality__"],
//     Cardinality.One
//   > = true;
//   expect(singleHero.__cardinality__).toEqual(Cardinality.One);
// });
