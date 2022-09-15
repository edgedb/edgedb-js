import {$, Client} from "edgedb";
import {tc} from "./setupTeardown";
import e, {$infer} from "../dbschema/edgeql-js";
import {setupTests, teardownTests, TestData} from "./setupTeardown";
import {TypeKind} from "edgedb/dist/reflection";

let client: Client;
let data: TestData;

beforeAll(async () => {
  const setup = await setupTests();
  ({client, data} = setup);
});

afterAll(async () => {
  await teardownTests(client);
});

test("empty sets", async () => {
  expect(e.set()).toEqual(null);

  const stringSet = e.cast(e.str, e.set());
  expect(stringSet.toEdgeQL()).toEqual(`<std::str>{}`);
  tc.assert<tc.IsExact<$infer<typeof stringSet>, null>>(true);

  const $Hero = e.Hero.__element__;
  const heroSet = e.cast($Hero, e.set());
  expect(heroSet.toEdgeQL()).toEqual(`<default::Hero>{}`);
  tc.assert<tc.IsExact<$infer<typeof heroSet>, null>>(true);

  const int32Set = e.cast(e.int32, e.set());
  expect(int32Set.toEdgeQL()).toEqual(`<std::int32>{}`);
  tc.assert<tc.IsExact<$infer<typeof int32Set>, null>>(true);
  tc.assert<
    tc.IsExact<typeof int32Set["__element__"]["__name__"], "std::number">
  >(true);

  expect(await e.cast(e.int64, e.set()).run(client)).toEqual(null);
});

test("object set contructor", async () => {
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

  expect(e.set(e.select(e.Hero), e.select(e.Villain)).toEdgeQL()).toEqual(
    `{ (SELECT DETACHED default::Hero), (SELECT DETACHED default::Villain) }`
  );

  expect(
    await e
      .select(e.set(e.select(e.Hero), e.select(e.Villain)), obj => ({
        name: true,
        filter: e.op(obj.name, "=", "Thanos"),
      }))
      .assert_single()
      .run(client)
  ).toEqual({name: "Thanos"});

  expect(
    await e
      .select(e.set(e.Hero, e.Villain), obj => ({
        name: true,
        filter: e.op(obj.name, "=", "Thanos"),
      }))
      .assert_single()
      .run(client)
  ).toEqual({name: "Thanos"});
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

test("enums", () => {
  const query = e.set(e.Genre.Action, e.Genre.Horror);
  expect(query.toEdgeQL()).toEqual(
    `{ default::Genre.Action, default::Genre.Horror }`
  );

  expect(() => e.set(e.Genre.Action, e.sys.VersionStage.dev as any)).toThrow();
});

test("tuples", async () => {
  const q1 = e.set(
    e.tuple([1, "asdf", e.int16(214)]),
    e.tuple([3, "asdf", e.int64(5)])
  );
  expect(q1.__element__.__kind__).toEqual(TypeKind.tuple);
  expect(q1.__element__.__items__[0].__name__).toEqual("std::number");
  expect(q1.__element__.__items__[1].__name__).toEqual("std::str");
  expect(await q1.run(client)).toMatchObject([
    [1, "asdf", 214],
    [3, "asdf", 5],
  ]);

  expect(() => e.set(e.tuple([1]), e.tuple([1, 2]))).toThrow();
  expect(() => e.set(e.tuple([1]), e.tuple(["asdf"]))).toThrow();
});

test("named tuples", async () => {
  const q1 = e.set(
    e.tuple({a: 1, b: "asdf", c: e.int16(214)}),
    e.tuple({a: 3, b: "asdf", c: e.int64(5)})
  );
  expect(q1.__element__.__kind__).toEqual(TypeKind.namedtuple);
  expect(await q1.run(client)).toMatchObject([
    {a: 1, b: "asdf", c: 214},
    {a: 3, b: "asdf", c: 5},
  ]);

  expect(() => e.set(e.tuple({a: 1}), e.tuple({a: "asfd"}))).toThrow();
  expect(() => e.set(e.tuple({a: 1}), e.tuple({a: "asfd", b: "qwer"})));
  expect(() =>
    e.set(e.tuple({a: "asfd", b: "qwer"}), e.tuple({a: 1}))
  ).toThrow();
  expect(() => e.set(e.tuple({a: 1}), e.tuple({b: "asfd"}))).toThrow();
});

test("array", async () => {
  const q1 = e.set(e.array([e.int16(5), e.int64(67)]), e.array([6]));
  expect(q1.__element__.__kind__).toEqual(TypeKind.array);

  expect(await q1.run(client)).toEqual([[5, 67], [6]]);

  expect(() =>
    e.set(e.array([e.int16(5)]), e.array(["asdf"]) as any)
  ).toThrow();
});
