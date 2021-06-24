import * as e from "../generated/example";
import {reflection as $} from "edgedb";
import {typeutil} from "../../src/reflection";

test("path structure", () => {
  const HeroSetMany = $.toSet(e.default.Hero, $.Cardinality.Many);
  const Hero = $.makePathNode(HeroSetMany, null);
  type Hero = typeof Hero;
  const HeroSetSingleton = $.toSet(e.default.Hero, $.Cardinality.One);
  const HeroSingleton = $.makePathNode(HeroSetSingleton, null);
  type HeroSingleton = typeof HeroSingleton;
  const VillainRoot = $.toSet(e.default.Villain, $.Cardinality.One);
  const Villain = $.makePathNode(VillainRoot, null);

  expect(Hero.name.__element__.__kind__).toEqual($.TypeKind.scalar);
  expect(Hero.name.__element__.__name__).toEqual("std::str");
  expect(Hero.name.__cardinality__).toEqual($.Cardinality.Many);
  expect(HeroSingleton.name.__cardinality__).toEqual($.Cardinality.One);

  // check path root cardinalities
  const _t1: typeutil.assertEqual<
    Hero["__cardinality__"],
    $.Cardinality.Many
  > = true;
  const _t2: typeutil.assertEqual<
    HeroSingleton["__cardinality__"],
    $.Cardinality.One
  > = true;

  // Hero.name
  expect(Hero.name.__element__.__name__).toEqual("std::str");
  expect(Hero.name.__cardinality__).toEqual($.Cardinality.Many);
  const _t1952: typeutil.assertEqual<
    Hero["name"]["__cardinality__"],
    $.Cardinality.Many
  > = true;

  // HeroSingleton.name
  expect(HeroSingleton.name.__cardinality__).toEqual($.Cardinality.One);
  const _t3: typeutil.assertEqual<
    HeroSingleton["name"]["__cardinality__"],
    $.Cardinality.One
  > = true;

  // AtMostOneHero.name
  // test cardinality merging
  const HeroSetAtLeastOne = $.toSet(e.default.Hero, $.Cardinality.AtLeastOne);
  const AtLeastOneHero = $.makePathNode(HeroSetAtLeastOne, null);
  type AtLeastOneHero = typeof AtLeastOneHero;
  expect(AtLeastOneHero.id.__cardinality__).toEqual($.Cardinality.AtLeastOne);
  expect(AtLeastOneHero.number_of_movies.__cardinality__).toEqual(
    $.Cardinality.Many
  );
  const _t41853: typeutil.assertEqual<
    AtLeastOneHero["number_of_movies"]["__cardinality__"],
    $.Cardinality.Many
  > = true;

  // Hero.villains.id
  expect(Hero.villains.id.__cardinality__).toEqual($.Cardinality.Many);
  const _t4896: typeutil.assertEqual<
    HeroSingleton["villains"]["id"]["__cardinality__"],
    $.Cardinality.Many
  > = true;

  expect(Hero.villains.nemesis.villains.name.toEdgeQL()).toEqual(
    "default::Hero.villains.nemesis.villains.name"
  );
  expect(
    Hero.__type__.__type__.__type__.annotations.__type__.computed_fields.toEdgeQL()
  ).toEqual(
    "default::Hero.__type__.__type__.__type__.annotations.__type__.computed_fields"
  );
  expect(Hero.villains.__parent__.linkName).toEqual("villains");
  expect(Hero.villains.__parent__.type.__element__.__name__).toEqual(
    "default::Hero"
  );
});
