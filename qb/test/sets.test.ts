import e, {set} from "../generated/example";
import {reflection as $} from "edgedb";
import {Cardinality, TypeKind, typeutil} from "../../src/reflection";

test("empty sets", () => {
  const stringSet = set(e.str);
  expect(stringSet.toEdgeQL()).toEqual(`<std::str>{}`);
  const heroSet = set(e.$Hero);
  expect(heroSet.toEdgeQL()).toEqual(`<default::Hero>{}`);
});

test("object set contructor", () => {
  const hero = set(e.default.Hero);
  expect(hero.id.__element__.__name__).toEqual("std::uuid");
  expect(hero.name.__element__.__name__).toEqual("std::str");
  expect(hero.number_of_movies.__element__.__name__).toEqual("std::int64");

  const person = set(e.default.Hero, e.default.Villain);
  expect(person.id.__element__.__name__).toEqual("std::uuid");
  expect(person.name.__element__.__name__).toEqual("std::str");
  expect((person as any).number_of_movies).toEqual(undefined);
  expect(person.__element__.__name__).toEqual(
    "default::Hero UNION default::Villain"
  );

  const merged = set(e.default.Hero, e.default.Villain, e.default.Person);
  expect(merged.__element__.__name__).toEqual(
    "default::Hero UNION default::Villain UNION default::Person"
  );
});

test("scalar set contructor", () => {
  // single elements
  const _f1 = set(e.str("asdf"));
  expect(_f1.__element__.__name__).toEqual("std::str");
  expect(_f1.__cardinality__).toEqual(Cardinality.One);
  expect(_f1.__element__.__kind__).toEqual(TypeKind.scalar);
  expect(_f1.toEdgeQL()).toEqual(`{ <std::str>"asdf" }`);

  // multiple elements
  const _f2 = set(e.str("asdf"), e.str("qwer"), e.str("poiu"));
  expect(_f2.__element__.__name__).toEqual("std::str");
  expect(_f2.__cardinality__).toEqual(Cardinality.AtLeastOne);
  expect(_f2.toEdgeQL()).toEqual(
    `{ <std::str>"asdf", <std::str>"qwer", <std::str>"poiu" }`
  );

  // implicit casting
  const _f5 = set(e.int32(5), e.float32(1234.5));
  expect(_f5.__element__.__name__).toEqual("std::float64");
  expect(_f5.toEdgeQL()).toEqual(`{ <std::int32>5, <std::float32>1234.5 }`);
  const _f6 = set(e.int16(5), e.bigint(BigInt(1234)));
  expect(_f6.__element__.__name__).toEqual("std::bigint");
  expect(_f6.toEdgeQL()).toEqual(`{ <std::int16>5, <std::bigint>1234n }`);
});

test("invalid sets", () => {
  expect(() => {
    set(e.Hero as any, e.int64(1243));
  }).toThrow();

  // never
  expect(() => {
    // @ts-expect-error
    set(e.str("asdf"), e.int64(1243));
  }).toThrow();
  expect(() => {
    // @ts-expect-error
    set(e.bool(true), e.bigint(BigInt(14)));
  }).toThrow();
});
