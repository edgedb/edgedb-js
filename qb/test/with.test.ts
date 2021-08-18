import {typeutil} from "../../src/reflection";
import e from "../generated/example";

test("simple repeated expression", () => {
  const numbers = e.set(e.int64(1), e.int32(2), e.int16(3));

  expect(e.select(e.plus(numbers, numbers)).toEdgeQL()).toEqual(`WITH
  __withVar_0 := ({ <std::int64>1, <std::int32>2, <std::int16>3 })
SELECT ((__withVar_0 + __withVar_0))`);
});

test("simple expression with alias", () => {
  const numbers = e.set(e.int64(1), e.int32(2), e.int16(3));

  expect(e.select(e.plus(numbers, e.alias(numbers))).toEdgeQL()).toEqual(`WITH
  __withVar_0 := ({ <std::int64>1, <std::int32>2, <std::int16>3 }),
  __withVar_1 := (__withVar_0)
SELECT ((__withVar_0 + __withVar_1))`);
});

test("implicit 'WITH' vars referencing each other", () => {
  const skip = e.int64(10);
  const remainingHeros = e.select(e.Hero).orderBy(e.Hero.id).offset(skip);
  const pageResults = e
    .select(remainingHeros, {
      id: true,
      name: true,
    })
    .limit(10);

  let query = e.select(e.std.FreeObject, {
    id: true,
    pageResults,
    nextOffset: e.plus(skip, e.count(pageResults)),
    hasMore: e.select(e.gt(e.count(remainingHeros), e.int64(10))),
  });

  expect(query.toEdgeQL()).toEqual(`WITH
  __withVar_2 := (<std::int64>10),
  __withVar_1 := (
    SELECT (default::Hero) {
      id
    }
    ORDER BY default::Hero.id ASC EMPTY FIRST
    OFFSET __withVar_2
  ),
  __withVar_0 := (
    SELECT (__withVar_1 {id}) {
      id,
      name
    }
    LIMIT <std::int64>10
  )
SELECT (std::FreeObject) {
  id,
  pageResults := (__withVar_0 {id, name}),
  nextOffset := ((__withVar_2 + std::count((__withVar_0 {id, name})))),
  hasMore := (SELECT ((std::count((__withVar_1 {id})) > <std::int64>10)))
}`);

  type queryType = typeof query["__element__"]["__tstype__"];
  const f1: typeutil.assertEqual<
    queryType,
    {
      id: string;
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
  __withVar_0 := ({ <std::int64>1, <std::int32>2, <std::int16>3 })
SELECT (__withVar_0)`);
});

test("explicit 'WITH' block in nested query", () => {
  const numbers = e.set(e.int64(1), e.int32(2), e.int16(3));

  expect(
    e
      .select(e.std.FreeObject, {
        id: true,
        nested: e.with([numbers], e.select(numbers)),
      })
      .toEdgeQL()
  ).toEqual(`SELECT (std::FreeObject) {
  id,
  nested := (WITH
  __withVar_0 := ({ <std::int64>1, <std::int32>2, <std::int16>3 })
SELECT (__withVar_0))
}`);
});

test("explicit 'WITH' block in nested query, var used outside 'WITH' block", () => {
  const numbers = e.set(e.int64(1), e.int32(2), e.int16(3));

  expect(() =>
    e
      .select(e.std.FreeObject, {
        id: true,
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
      .select(e.std.FreeObject, {
        id: true,
        numbers: explicitWith,
        numbers2: explicitWith,
      })
      .toEdgeQL()
  ).toEqual(`WITH
  __withVar_0 := (
    WITH
      __withVar_1 := ({ <std::int64>1, <std::int32>2, <std::int16>3 })
    SELECT (__withVar_1)
  )
SELECT (std::FreeObject) {
  id,
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
        e.select(e.std.FreeObject, {
          id: true,
          numbers: explicitWith,
        })
      )
      .toEdgeQL()
  ).toEqual(`WITH
  __withVar_0 := (
    WITH
      __withVar_1 := ({ <std::int64>1, <std::int32>2, <std::int16>3 })
    SELECT (__withVar_1)
  )
SELECT (std::FreeObject) {
  id,
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
        e.select(e.std.FreeObject, {
          id: true,
          numbers: explicitWith,
        })
      )
      .toEdgeQL()
  ).toEqual(`WITH
  __withVar_2 := (<std::int32>2),
  __withVar_0 := (
    WITH
      __withVar_1 := ({ <std::int64>1, __withVar_2, <std::int16>3 })
    SELECT (__withVar_1)
  )
SELECT (std::FreeObject) {
  id,
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
        e.select(e.std.FreeObject, {
          id: true,
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
        e.select(e.std.FreeObject, {
          id: true,
          number,
          numbers: explicitWith,
        })
      )
      .toEdgeQL()
  ).toEqual(`WITH
  __withVar_0 := (<std::int32>2),
  __withVar_1 := (
    WITH
      __withVar_2 := ({ <std::int64>1, __withVar_0, <std::int16>3 })
    SELECT (__withVar_2)
  )
SELECT (std::FreeObject) {
  id,
  number := (__withVar_0),
  numbers := (__withVar_1)
}`);
});

test("implicit 'WITH' and explicit 'WITH' in sub expr", () => {
  const skip = e.int64(10);
  const remainingHeros = e.select(e.Hero).orderBy(e.Hero.id).offset(skip);
  const pageResults = e
    .select(remainingHeros, {
      id: true,
      name: true,
    })
    .limit(10);

  const nextOffset = e.plus(skip, e.count(pageResults));

  let query = e.select(e.std.FreeObject, {
    id: true,
    pageResults,
    // @ts-ignore
    nextOffset: e.with([nextOffset], e.select(nextOffset)),
    hasMore: e.select(e.gt(e.count(remainingHeros), e.int64(10))),
  });

  expect(query.toEdgeQL()).toEqual(`WITH
  __withVar_2 := (<std::int64>10),
  __withVar_1 := (
    SELECT (default::Hero) {
      id
    }
    ORDER BY default::Hero.id ASC EMPTY FIRST
    OFFSET __withVar_2
  ),
  __withVar_0 := (
    SELECT (__withVar_1 {id}) {
      id,
      name
    }
    LIMIT <std::int64>10
  )
SELECT (std::FreeObject) {
  id,
  pageResults := (__withVar_0 {id, name}),
  nextOffset := (WITH
  __withVar_3 := ((__withVar_2 + std::count((__withVar_0 {id, name}))))
SELECT (__withVar_3)),
  hasMore := (SELECT ((std::count((__withVar_1 {id})) > <std::int64>10)))
}`);
});

test("explicit 'WITH' block nested in implicit 'WITH' block + alias implicit", () => {
  const numbers = e.set(e.int64(1), e.int32(2), e.int16(3));

  const numbersAlias = e.alias(numbers);

  const explicitWith = e.with(
    [numbers],
    e.select(e.std.FreeObject, {id: true, numbers, numbersAlias})
  );

  expect(
    e
      .select(e.std.FreeObject, {
        id: true,
        numbers: explicitWith,
        numbers2: explicitWith,
      })
      .toEdgeQL()
  ).toEqual(`WITH
  __withVar_3 := (std::FreeObject),
  __withVar_0 := (
    WITH
      __withVar_1 := ({ <std::int64>1, <std::int32>2, <std::int16>3 }),
      __withVar_2 := (__withVar_1)
    SELECT (__withVar_3) {
      id,
      numbers := (__withVar_1),
      numbersAlias := (__withVar_2)
    }
  )
SELECT (__withVar_3) {
  id,
  numbers := (__withVar_0),
  numbers2 := (__withVar_0)
}`);
});

test("explicit 'WITH' block nested in implicit 'WITH' block + alias explicit", () => {
  const numbers = e.set(e.int64(1), e.int32(2), e.int16(3));

  const numbersAlias = e.alias(numbers);

  const explicitWith = e.with(
    [numbers, numbersAlias],
    e.select(e.std.FreeObject, {id: true, numbers, numbersAlias})
  );

  expect(
    e
      .select(e.std.FreeObject, {
        id: true,
        numbers: explicitWith,
        numbers2: explicitWith,
      })
      .toEdgeQL()
  ).toEqual(`WITH
  __withVar_3 := (std::FreeObject),
  __withVar_0 := (
    WITH
      __withVar_1 := ({ <std::int64>1, <std::int32>2, <std::int16>3 }),
      __withVar_2 := (__withVar_1)
    SELECT (__withVar_3) {
      id,
      numbers := (__withVar_1),
      numbersAlias := (__withVar_2)
    }
  )
SELECT (__withVar_3) {
  id,
  numbers := (__withVar_0),
  numbers2 := (__withVar_0)
}`);
});

test("explicit 'WITH' block nested in implicit 'WITH' block + alias outside 'WITH'", () => {
  const numbers = e.set(e.int64(1), e.int32(2), e.int16(3));

  const numbersAlias = e.alias(numbers);

  const explicitWith = e.with(
    [numbers],
    e.select(e.std.FreeObject, {id: true, numbers, numbersAlias})
  );

  expect(() =>
    e
      .select(e.std.FreeObject, {
        id: true,
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
          e.select(e.std.FreeObject, {
            id: true,
            numbers: explicitWith,
          })
        )
        .toEdgeQL()
    ).toEqual(`WITH
  __withVar_1 := ({ <std::int64>1, <std::int32>2, <std::int16>3 }),
  __withVar_0 := (
    WITH
      __withVar_2 := (__withVar_1)
    SELECT ((__withVar_1 + __withVar_2))
  )
SELECT (std::FreeObject) {
  id,
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
          e.select(e.std.FreeObject, {
            id: true,
            numbers: explicitWith,
          })
        )
        .toEdgeQL()
    ).toEqual(`WITH
  __withVar_1 := ({ <std::int64>1, <std::int32>2, <std::int16>3 }),
  __withVar_2 := (__withVar_1),
  __withVar_0 := (
    WITH
      __withVar_3 := (__withVar_2)
    SELECT ((__withVar_1 + __withVar_3))
  )
SELECT (std::FreeObject) {
  id,
  numbers := (__withVar_0)
}`);
  }
);
