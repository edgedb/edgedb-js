import {$} from "edgedb";
import {tc} from "./setupTeardown";
import e, {$infer} from "../dbschema/edgeql";

test("empty sets", () => {
  const stringSet = e.set(e.str);
  expect(stringSet.toEdgeQL()).toEqual(`<std::str>{}`);
  tc.assert<tc.IsExact<$infer<typeof stringSet>, null>>(true);

  const heroSet = e.set(e.$Hero);
  expect(heroSet.toEdgeQL()).toEqual(`<default::Hero>{}`);
  tc.assert<tc.IsExact<$infer<typeof heroSet>, null>>(true);
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
  const _f1 = e.set(e.str("asdf"));
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
  expect(_f4.toEdgeQL()).toEqual(`{ <std::int32>42 }`);
  type _f4 = $infer<typeof _f4>;
  tc.assert<tc.IsExact<_f4, 42>>(true);

  // multiple elements
  const _f2 = e.set(e.str("asdf"), e.str("qwer"), e.str("poiu"));
  expect(_f2.__element__.__name__).toEqual("std::str");
  expect(_f2.__cardinality__).toEqual($.Cardinality.AtLeastOne);
  expect(_f2.toEdgeQL()).toEqual(`{ "asdf", "qwer", "poiu" }`);
  type _f2 = $infer<typeof _f2>;
  tc.assert<tc.IsExact<_f2, [string, ...string[]]>>(true);

  const _f3 = e.set(e.int64(1), e.int64(2), e.int64(3));
  expect(_f3.__element__.__name__).toEqual("std::int64");
  expect(_f3.__cardinality__).toEqual($.Cardinality.AtLeastOne);
  expect(_f3.toEdgeQL()).toEqual(`{ 1, 2, 3 }`);
  type _f3 = $infer<typeof _f3>;
  tc.assert<tc.IsExact<_f3, [number, ...number[]]>>(true);

  // implicit casting
  const _f5 = e.set(e.int32(5), e.float32(1234.5));
  expect(_f5.__element__.__name__).toEqual("std::float64");
  expect(_f5.toEdgeQL()).toEqual(`{ <std::int32>5, <std::float32>1234.5 }`);
  type _f5 = $infer<typeof _f5>;
  tc.assert<tc.IsExact<_f5, [number, ...number[]]>>(true);

  const _f6 = e.set(e.int16(5), e.bigint(BigInt(1234)));
  expect(_f6.__element__.__name__).toEqual("std::bigint");
  expect(_f6.toEdgeQL()).toEqual(`{ <std::int16>5, <std::bigint>1234n }`);
  type _f6 = $infer<typeof _f6>;
  tc.assert<tc.IsExact<_f6, [bigint, ...bigint[]]>>(true);
});

test("invalid sets", () => {
  expect(() => {
    // @ts-expect-error
    e.set(e.Hero, e.int64(1243));
  }).toThrow();

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
