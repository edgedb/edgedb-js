import {$} from "edgedb";
import {tc} from "./setupTeardown";
import e, {$infer} from "../dbschema/edgeql";

test("empty sets", () => {
  const stringSet = e.set(e.str);
  expect(stringSet.toEdgeQL()).toEqual(`<std::str>{}`);
  tc.assert<tc.IsExact<$infer<typeof stringSet>, null>>(true);

  const $Hero = e.Hero.__element__;
  const heroSet = e.set($Hero);
  expect(heroSet.toEdgeQL()).toEqual(`<default::Hero>{}`);
  tc.assert<tc.IsExact<$infer<typeof heroSet>, null>>(true);

  const int32Set = e.set(e.int32);
  expect(int32Set.toEdgeQL()).toEqual(`<std::int32>{}`);
  tc.assert<tc.IsExact<$infer<typeof int32Set>, null>>(true);
  tc.assert<
    tc.IsExact<typeof int32Set["__element__"]["__name__"], "std::number">
  >(true);
});

test("object set contructor", () => {
  const hero = e.set(e.default.Hero);
  expect(hero.id.__element__.__name__).toEqual("std::uuid");
  expect(hero.name.__element__.__name__).toEqual("std::str");
  expect(hero.number_of_movies.__element__.__name__).toEqual("std::int64");

  const person = e.set(e.default.Hero, e.default.Villain);
  expect(person.id.__element__.__name__).toEqual("std::uuid");
  expect(person.name.__element__.__name__).toEqual("std::str");
  expect((person as any).number_of_movies).toEqual(undefined);
  expect(person.__element__.__name__).toEqual(
    "default::Hero UNION default::Villain"
  );

  const merged = e.set(e.default.Hero, e.default.Villain, e.default.Person);
  expect(merged.__element__.__name__).toEqual(
    "default::Hero UNION default::Villain UNION default::Person"
  );
});

test("scalar set contructor", () => {
  // single elements
  const _f1 = e.set("asdf");
  expect(_f1.__element__.__name__).toEqual("std::str");
  expect(_f1.__cardinality__).toEqual($.Cardinality.One);
  expect(_f1.__element__.__kind__).toEqual($.TypeKind.scalar);
  expect(_f1.toEdgeQL()).toEqual(`{ "asdf" }`);
  type _f1 = $infer<typeof _f1>;
  tc.assert<tc.IsExact<_f1, "asdf">>(true);

  const _f4 = e.set(e.int32(42));
  expect(_f4.__element__.__name__).toEqual("std::int32");
  expect(_f4.__cardinality__).toEqual($.Cardinality.One);
  expect(_f4.__element__.__kind__).toEqual($.TypeKind.scalar);
  expect(_f4.toEdgeQL()).toEqual(`{ 42 }`);
  type _f4 = $infer<typeof _f4>;
  tc.assert<tc.IsExact<_f4, 42>>(true);

  // multiple elements
  const _f2 = e.set("asdf", "qwer", e.str("poiu"));
  expect(_f2.__element__.__name__).toEqual("std::str");
  expect(_f2.__cardinality__).toEqual($.Cardinality.AtLeastOne);
  expect(_f2.toEdgeQL()).toEqual(`{ "asdf", "qwer", "poiu" }`);
  type _f2 = $infer<typeof _f2>;
  tc.assert<tc.IsExact<_f2, [string, ...string[]]>>(true);

  const _f3 = e.set(1, 2, 3);
  expect(_f3.__element__.__name__).toEqual("std::number");
  expect(_f3.__cardinality__).toEqual($.Cardinality.AtLeastOne);
  expect(_f3.toEdgeQL()).toEqual(`{ 1, 2, 3 }`);
  type _f3 = $infer<typeof _f3>;
  tc.assert<tc.IsExact<_f3, [number, ...number[]]>>(true);

  // implicit casting
  const _f5 = e.set(5, e.literal(e.float32, 1234.5));
  expect(_f5.__element__.__name__).toEqual("std::number");
  expect(_f5.toEdgeQL()).toEqual(`{ 5, 1234.5 }`);
  type _f5 = $infer<typeof _f5>;
  tc.assert<tc.IsExact<_f5, [number, ...number[]]>>(true);
});

test("invalid sets", () => {
  expect(() => {
    // @ts-expect-error
    e.set(e.Hero, e.int64(1243));
  }).toThrow();

  // @ts-expect-error
  expect(() => e.set(e.int64(5), e.bigint(BigInt(1234)))).toThrow();

  // never
  expect(() => {
    // @ts-expect-error
    e.set(e.str("asdf"), e.int64(1243));
  }).toThrow();
  expect(() => {
    // @ts-expect-error
    e.set(e.bool(true), e.bigint(BigInt(14)));
  }).toThrow();
});
