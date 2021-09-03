import {typeutil, BaseTypeToTsType} from "../../src/reflection";
import e from "../generated/example";

test("simple repeated expression", () => {
  const numbers = e.set(e.int64(1), e.int32(2), e.int16(3));

  expect(e.select(e.plus(numbers, numbers)).toEdgeQL()).toEqual(`WITH
  __withVar_0 := ({ 1, <std::int32>2, <std::int16>3 })
SELECT ((__withVar_0 + __withVar_0))`);
});

test("simple expression with alias", () => {
  const numbers = e.set(e.int64(1), e.int32(2), e.int16(3));

  expect(e.select(e.plus(numbers, e.alias(numbers))).toEdgeQL()).toEqual(`WITH
  __withVar_0 := ({ 1, <std::int32>2, <std::int16>3 }),
  __withVar_1 := (__withVar_0)
SELECT ((__withVar_0 + __withVar_1))`);
});

test("implicit 'WITH' vars referencing each other", () => {
  const skip = e.int64(10);
  const remainingHeros = e.select(e.Hero, (hero) => ({
    order: hero.id,
    offset: skip,
  }));
  const pageResults = e.select(remainingHeros, () => ({
    id: true,
    name: true,
    limit: 10,
  }));

  const query = e.select({
    pageResults,
    nextOffset: e.plus(skip, e.count(pageResults)),
    hasMore: e.select(e.gt(e.count(remainingHeros), e.int64(10))),
  });

  expect(query.toEdgeQL()).toEqual(`WITH
  __withVar_3 := (10),
  __withVar_2 := (
    WITH
      __scope_1_Hero := (DETACHED default::Hero)
    SELECT (__scope_1_Hero) {
      id
    }
    ORDER BY __scope_1_Hero.id
    OFFSET __withVar_3
  ),
  __withVar_0 := (
    SELECT (__withVar_2) {
      id,
      name
    }
    LIMIT 10
  )
SELECT {
  pageResults := (__withVar_0 {id, name}),
  nextOffset := ((__withVar_3 + std::count((__withVar_0)))),
  hasMore := (SELECT ((std::count((__withVar_2)) > 10)))
}`);

  type queryType = BaseTypeToTsType<typeof query["__element__"]>;
  const f1: typeutil.assertEqual<
    queryType,
    {
      pageResults: {
        id: string;
        name: string;
      }[];
      nextOffset: number;
      hasMore: boolean;
    }
  > = true;
});

test("simple repeated expression not in select expr", () => {
  const numbers = e.set(e.int64(1), e.int32(2), e.int16(3));

  expect(() => e.plus(numbers, numbers).toEdgeQL()).toThrow();
});

test("explicit 'WITH' block", () => {
  const numbers = e.set(e.int64(1), e.int32(2), e.int16(3));

  expect(e.with([numbers], e.select(numbers)).toEdgeQL()).toEqual(`WITH
  __withVar_0 := ({ 1, <std::int32>2, <std::int16>3 })
SELECT (__withVar_0)`);
});

test("explicit 'WITH' block in nested query", () => {
  const numbers = e.set(e.int64(1), e.int32(2), e.int16(3));

  expect(
    e
      .select({
        nested: e.with([numbers], e.select(numbers)),
      })
      .toEdgeQL()
  ).toEqual(`SELECT {
  nested := (
    WITH
      __withVar_0 := ({ 1, <std::int32>2, <std::int16>3 })
    SELECT (__withVar_0)
  )
}`);
});

test("explicit 'WITH' block in nested query, var used outside 'WITH' block", () => {
  const numbers = e.set(e.int64(1), e.int32(2), e.int16(3));

  expect(() =>
    e
      .select({
        numbers,
        nested: e.with([numbers], e.select(numbers)),
      })
      .toEdgeQL()
  ).toThrow();
});

test("explicit 'WITH' block nested in implicit 'WITH' block", () => {
  const numbers = e.set(e.int64(1), e.int32(2), e.int16(3));

  const explicitWith = e.with([numbers], e.select(numbers));

  expect(
    e
      .select({
        numbers: explicitWith,
        numbers2: explicitWith,
      })
      .toEdgeQL()
  ).toEqual(`WITH
  __withVar_0 := (
    WITH
      __withVar_1 := ({ 1, <std::int32>2, <std::int16>3 })
    SELECT (__withVar_1)
  )
SELECT {
  numbers := (__withVar_0),
  numbers2 := (__withVar_0)
}`);
});

test("explicit 'WITH' block nested in explicit 'WITH' block", () => {
  const numbers = e.set(e.int64(1), e.int32(2), e.int16(3));

  const explicitWith = e.with([numbers], e.select(numbers));

  expect(
    e
      .with(
        [explicitWith],
        e.select({
          numbers: explicitWith,
        })
      )
      .toEdgeQL()
  ).toEqual(`WITH
  __withVar_0 := (
    WITH
      __withVar_1 := ({ 1, <std::int32>2, <std::int16>3 })
    SELECT (__withVar_1)
  )
SELECT {
  numbers := (__withVar_0)
}`);
});

test("explicit 'WITH' block nested in explicit 'WITH' block, sub expr explicitly extracted", () => {
  const number = e.int32(2);
  const numbers = e.set(e.int64(1), number, e.int16(3));

  const explicitWith = e.with([numbers], e.select(numbers));

  expect(
    e
      .with(
        [explicitWith, number],
        e.select({
          numbers: explicitWith,
        })
      )
      .toEdgeQL()
  ).toEqual(`WITH
  __withVar_2 := (<std::int32>2),
  __withVar_0 := (
    WITH
      __withVar_1 := ({ 1, __withVar_2, <std::int16>3 })
    SELECT (__withVar_1)
  )
SELECT {
  numbers := (__withVar_0)
}`);
});

test("explicit 'WITH' block nested in explicit 'WITH' block, expr declared in both", () => {
  const number = e.int32(2);
  const numbers = e.set(e.int64(1), number, e.int16(3));

  const explicitWith = e.with([numbers], e.select(numbers));

  expect(() =>
    e
      .with(
        [explicitWith, numbers],
        e.select({
          numbers: explicitWith,
        })
      )
      .toEdgeQL()
  ).toThrow();
});

test("explicit 'WITH' block nested in explicit 'WITH' block, sub expr implicitly extracted", () => {
  const number = e.int32(2);
  const numbers = e.set(e.int64(1), number, e.int16(3));

  const explicitWith = e.with([numbers], e.select(numbers));

  expect(
    e
      .with(
        [explicitWith],
        e.select({
          number,
          numbers: explicitWith,
        })
      )
      .toEdgeQL()
  ).toEqual(`WITH
  __withVar_0 := (<std::int32>2),
  __withVar_1 := (
    WITH
      __withVar_2 := ({ 1, __withVar_0, <std::int16>3 })
    SELECT (__withVar_2)
  )
SELECT {
  number := (__withVar_0),
  numbers := (__withVar_1)
}`);
});

test("implicit 'WITH' and explicit 'WITH' in sub expr", () => {
  const skip = e.int64(10);
  const remainingHeros = e.select(e.Hero, (hero) => ({
    order: hero.id,
    offset: skip,
  }));
  const pageResults = e.select(remainingHeros, () => ({
    id: true,
    name: true,
    limit: 10,
  }));

  const nextOffset = e.plus(skip, e.count(pageResults));

  const query = e.select({
    pageResults,
    nextOffset: e.with([nextOffset], e.select(nextOffset)),
    hasMore: e.select(e.gt(e.count(remainingHeros), e.int64(10))),
  });

  expect(query.toEdgeQL()).toEqual(`WITH
  __withVar_3 := (10),
  __withVar_2 := (
    WITH
      __scope_1_Hero := (DETACHED default::Hero)
    SELECT (__scope_1_Hero) {
      id
    }
    ORDER BY __scope_1_Hero.id
    OFFSET __withVar_3
  ),
  __withVar_0 := (
    SELECT (__withVar_2) {
      id,
      name
    }
    LIMIT 10
  )
SELECT {
  pageResults := (__withVar_0 {id, name}),
  nextOffset := (
    WITH
      __withVar_4 := ((__withVar_3 + std::count((__withVar_0))))
    SELECT (__withVar_4)
  ),
  hasMore := (SELECT ((std::count((__withVar_2)) > 10)))
}`);
});

test("explicit 'WITH' block nested in implicit 'WITH' block + alias implicit", () => {
  const numbers = e.set(e.int64(1), e.int32(2), e.int16(3));

  const numbersAlias = e.alias(numbers);

  const explicitWith = e.with([numbers], e.select({numbers, numbersAlias}));

  expect(
    e
      .select({
        numbers: explicitWith,
        numbers2: explicitWith,
      })
      .toEdgeQL()
  ).toEqual(`WITH
  __withVar_0 := (
    WITH
      __withVar_1 := ({ 1, <std::int32>2, <std::int16>3 }),
      __withVar_2 := (__withVar_1)
    SELECT {
      numbers := (__withVar_1),
      numbersAlias := (__withVar_2)
    }
  )
SELECT {
  numbers := (__withVar_0),
  numbers2 := (__withVar_0)
}`);
});

test("explicit 'WITH' block nested in implicit 'WITH' block + alias explicit", () => {
  const numbers = e.set(e.int64(1), e.int32(2), e.int16(3));

  const numbersAlias = e.alias(numbers);

  const explicitWith = e.with(
    [numbers, numbersAlias],
    e.select({numbers, numbersAlias})
  );

  expect(
    e
      .select({
        numbers: explicitWith,
        numbers2: explicitWith,
      })
      .toEdgeQL()
  ).toEqual(`WITH
  __withVar_0 := (
    WITH
      __withVar_1 := ({ 1, <std::int32>2, <std::int16>3 }),
      __withVar_2 := (__withVar_1)
    SELECT {
      numbers := (__withVar_1),
      numbersAlias := (__withVar_2)
    }
  )
SELECT {
  numbers := (__withVar_0),
  numbers2 := (__withVar_0)
}`);
});

test("explicit 'WITH' block nested in implicit 'WITH' block + alias outside 'WITH'", () => {
  const numbers = e.set(e.int64(1), e.int32(2), e.int16(3));

  const numbersAlias = e.alias(numbers);

  const explicitWith = e.with([numbers], e.select({numbers, numbersAlias}));

  expect(() =>
    e
      .select({
        numbers: explicitWith,
        numbers2: explicitWith,
        numbersAlias,
      })
      .toEdgeQL()
  ).toThrow();
});

test(
  "explicit 'WITH' block nested in explicit 'WITH' block, " +
    "alias declared in inner 'WITH'",
  () => {
    const number = e.int32(2);
    const numbers = e.set(e.int64(1), number, e.int16(3));

    const numbersAlias = e.alias(numbers);

    const explicitWith = e.with(
      [numbersAlias],
      e.select(e.plus(numbers, numbersAlias))
    );

    expect(
      e
        .with(
          [explicitWith, numbers],
          e.select({
            numbers: explicitWith,
          })
        )
        .toEdgeQL()
    ).toEqual(`WITH
  __withVar_1 := ({ 1, <std::int32>2, <std::int16>3 }),
  __withVar_0 := (
    WITH
      __withVar_2 := (__withVar_1)
    SELECT ((__withVar_1 + __withVar_2))
  )
SELECT {
  numbers := (__withVar_0)
}`);
  }
);

test(
  "explicit 'WITH' block nested in explicit 'WITH' block, " +
    "alias of alias declared in inner 'WITH'",
  () => {
    const number = e.int32(2);
    const numbers = e.set(e.int64(1), number, e.int16(3));

    const numbersAlias = e.alias(numbers);
    const numbersAlias2 = e.alias(numbersAlias);

    const explicitWith = e.with(
      [numbersAlias2],
      e.select(e.plus(numbers, numbersAlias2))
    );

    expect(
      e
        .with(
          [explicitWith, numbers],
          e.select({
            numbers: explicitWith,
          })
        )
        .toEdgeQL()
    ).toEqual(`WITH
  __withVar_1 := ({ 1, <std::int32>2, <std::int16>3 }),
  __withVar_2 := (__withVar_1),
  __withVar_0 := (
    WITH
      __withVar_3 := (__withVar_2)
    SELECT ((__withVar_1 + __withVar_3))
  )
SELECT {
  numbers := (__withVar_0)
}`);
  }
);

test("query with no 'WITH' block", () => {
  const query = e.select(e.Person.$is(e.Hero), (person) => ({
    id: true,
    computable: e.int64(35),
    all_heroes: e.select(e.Hero, () => ({__type__: {name: true}})),
    order: person.name,
    limit: 1,
  }));

  expect(query.toEdgeQL()).toEqual(`WITH
  __scope_0_Hero := (DETACHED default::Person[IS default::Hero])
SELECT (__scope_0_Hero) {
  id,
  computable := (35),
  all_heroes := (
    SELECT (DETACHED default::Hero) {
      __type__: {
        name
      }
    }
  )
}
ORDER BY __scope_0_Hero.name
LIMIT 1`);
});

test("repeated expression referencing scoped select object", () => {
  const query = e.select(e.Hero, (hero) => {
    const secret = e.concat(
      e.concat(hero.name, e.str(" is ")),
      hero.secret_identity
    );
    return {
      name: true,
      secret,
      secret2: secret,
    };
  });

  expect(query.toEdgeQL())
    .toEqual(`FOR __scope_0_Hero IN {DETACHED default::Hero} UNION (
WITH
  __withVar_1 := (((__scope_0_Hero.name ++ \" is \") ++ __scope_0_Hero.secret_identity))
SELECT (__scope_0_Hero) {
  name,
  secret := (__withVar_1),
  secret2 := (__withVar_1)
}
)`);
});
