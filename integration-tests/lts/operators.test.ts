import assert from "node:assert/strict";
import superjson from "superjson";
import type { Client } from "edgedb";
import e from "./dbschema/edgeql-js";
import * as $ from "../../packages/generate/src/syntax/reflection";

import { setupTests, teardownTests } from "./setupTeardown";

describe("operators", () => {
  let client: Client;

  beforeAll(async () => {
    const setup = await setupTests();
    ({ client } = setup);
  });

  afterAll(async () => {
    await teardownTests(client);
  });

  function checkOperatorExpr<T extends $.$expr_Operator>(
    expr: T,
    name: T["__name__"],
    args: any[],
    returnType: T["__element__"],
    cardinality: T["__cardinality__"],
    edgeql?: string,
  ) {
    test(`${name} operator: expect ${edgeql ?? "(NO EDGEQL)"}`, async () => {
      assert.deepEqual(expr.__name__, name);
      assert.deepEqual(
        superjson.stringify(expr.__args__),
        superjson.stringify(args.filter((arg) => arg !== undefined)),
      );
      assert.deepEqual(expr.__element__, returnType);
      assert.deepEqual(expr.__cardinality__, cardinality);

      if (edgeql) {
        assert.deepEqual(expr.toEdgeQL(), edgeql);
      }
    });
  }

  describe("slice and index ops", () => {
    checkOperatorExpr(
      e.str("test string")["2:5"],
      "[]",
      [e.str("test string"), [e.int64(2), e.int64(5)]],
      e.str,
      $.Cardinality.One,
      `"test string"[2:5]`,
    );

    checkOperatorExpr(
      e.str("test string").slice(e.int64(2), e.int64(5)),
      "[]",
      [e.str("test string"), [e.int64(2), e.int64(5)]],
      e.str,
      $.Cardinality.One,
      `"test string"[<std::int64>2:<std::int64>5]`,
    );

    checkOperatorExpr(
      e.array([BigInt(1), BigInt(2), BigInt(3)])["1:2"],
      "[]",
      [e.array([BigInt(1), BigInt(2), BigInt(3)]), [e.int64(1), e.int64(2)]],
      e.array(e.bigint),
      $.Cardinality.One,
      `[<std::bigint>1n, <std::bigint>2n, <std::bigint>3n][1:2]`,
    );

    checkOperatorExpr(
      e.str("test string")[3],
      "[]",
      [e.str("test string"), e.int64(3)],
      e.str,
      $.Cardinality.One,
      `"test string"[3]`,
    );

    checkOperatorExpr(
      e.str("test string").index(e.int64(3)),
      "[]",
      [e.str("test string"), e.int64(3)],
      e.str,
      $.Cardinality.One,
      `"test string"[<std::int64>3]`,
    );

    checkOperatorExpr(
      e.array([BigInt(1), BigInt(2), BigInt(3)])[2],
      "[]",
      [e.array([BigInt(1), BigInt(2), BigInt(3)]), e.int64(2)],
      e.bigint,
      $.Cardinality.One,
      `[<std::bigint>1n, <std::bigint>2n, <std::bigint>3n][2]`,
    );

    checkOperatorExpr(
      e.to_json(e.str(`{"name":"Bob"}`)).name,
      "[]",
      [e.to_json(e.str(`{"name":"Bob"}`)), e.str("name")],
      e.json,
      $.Cardinality.One,
      `std::to_json("{\\"name\\":\\"Bob\\"}")["name"]`,
    );

    checkOperatorExpr(
      e.to_json(e.str(`{"name":"Bob"}`)).destructure(e.str("name")),
      "[]",
      [e.to_json(e.str(`{"name":"Bob"}`)), e.str("name")],
      e.json,
      $.Cardinality.One,
      `std::to_json("{\\"name\\":\\"Bob\\"}")["name"]`,
    );
  });

  describe("if else op", () => {
    checkOperatorExpr(
      e.op(
        "this",
        "if",
        e.op(42, "=", e.literal(e.float32, 42)),
        "else",
        e.str("that"),
      ),
      "if_else",
      [e.str("this"), e.op(42, "=", e.literal(e.float32, 42)), e.str("that")],
      e.str,
      $.Cardinality.One,
      `"this" IF (42 = <std::float32>42) ELSE "that"`,
    );

    checkOperatorExpr(
      e.op("this", "if", e.cast(e.bool, e.set()), "else", "that"),
      "if_else",
      [e.str("this"), e.cast(e.bool, e.set()), e.str("that")],
      e.str,
      $.Cardinality.Empty,
      `"this" IF <std::bool>{} ELSE "that"`,
    );

    checkOperatorExpr(
      e.op("this", "if", e.set(e.bool(true), e.bool(false)), "else", "that"),
      "if_else",
      [e.str("this"), e.set(e.bool(true), e.bool(false)), e.str("that")],
      e.str,
      $.Cardinality.AtLeastOne,
      `"this" IF { true, false } ELSE "that"`,
    );

    checkOperatorExpr(
      e.op(
        e.str("this"),
        "if",
        e.op(e.literal(e.int64, 42), "=", e.literal(e.float32, 42)),
        "else",
        e.set(e.str("that"), e.str("other")),
      ),
      "if_else",
      [
        e.str("this"),
        e.op(e.literal(e.int64, 42), "=", e.literal(e.float32, 42)),
        e.set(e.str("that"), e.str("other")),
      ],
      e.str,
      $.Cardinality.AtLeastOne,
      `"this" IF (<std::int64>42 = <std::float32>42) ELSE { "that", "other" }`,
    );

    checkOperatorExpr(
      e.op(
        e.cast(e.str, e.set()),
        "if",
        e.op(e.literal(e.int64, 42), "=", e.literal(e.float32, 42)),
        "else",
        e.set(e.str("that"), e.str("other")),
      ),
      "if_else",
      [
        e.cast(e.str, e.set()),
        e.op(e.literal(e.int64, 42), "=", e.literal(e.float32, 42)),
        e.set(e.str("that"), e.str("other")),
      ],
      e.str,
      $.Cardinality.Many,
      `<std::str>{} IF (<std::int64>42 = <std::float32>42) ELSE { "that", "other" }`,
    );

    checkOperatorExpr(
      e.op(
        "this",
        "if",
        e.op(42, "=", e.literal(e.float32, 42)),
        "else",
        e.cast(e.str, e.set()),
      ),
      "if_else",
      [
        e.str("this"),
        e.op(42, "=", e.literal(e.float32, 42)),
        e.cast(e.str, e.set()),
      ],
      e.str,
      $.Cardinality.AtMostOne,
      `"this" IF (42 = <std::float32>42) ELSE <std::str>{}`,
    );

    checkOperatorExpr(
      e.op("if", e.bool(true), "then", e.int64(1), "else", e.int64(2)),
      "if_else",
      [e.int64(1), e.bool(true), e.int64(2)],
      e.int64,
      $.Cardinality.One,
      `<std::int64>1 IF true ELSE <std::int64>2`,
    );
  });

  test("non-literal args", async () => {
    const loki = e.select(e.Hero, (hero) => ({
      filter: e.op(hero.name, "=", "Loki"),
    }));
    const thanos = e.select(e.Villain, (villain) => ({
      filter: e.op(villain.name, "=", "Thanos"),
    }));

    const expr = e.op(loki, "??", thanos);

    const result = await expr.run(client);
    assert.ok(result);
  });

  describe("cardinalities for coalesce (??) operator", () => {
    const strElement = {
      __kind__: $.TypeKind.scalar,
      __name__: "str",
    };
    const emptySet = {
      __cardinality__: $.Cardinality.Empty,
      __element__: strElement,
    };
    const atMostOneSet = {
      __cardinality__: $.Cardinality.AtMostOne,
      __element__: strElement,
    };
    const oneSet = {
      __cardinality__: $.Cardinality.One,
      __element__: strElement,
    };
    const manySet = {
      __cardinality__: $.Cardinality.Many,
      __element__: strElement,
    };
    const atLeastOneSet = {
      __cardinality__: $.Cardinality.AtLeastOne,
      __element__: strElement,
    };

    const cardinalityPairs = [
      { lhs: emptySet, rhs: emptySet, expected: $.Cardinality.Empty },
      { lhs: emptySet, rhs: atMostOneSet, expected: $.Cardinality.AtMostOne },
      { lhs: emptySet, rhs: oneSet, expected: $.Cardinality.One },
      { lhs: emptySet, rhs: manySet, expected: $.Cardinality.Many },
      { lhs: emptySet, rhs: atLeastOneSet, expected: $.Cardinality.AtLeastOne },
      { lhs: atMostOneSet, rhs: emptySet, expected: $.Cardinality.AtMostOne },
      {
        lhs: atMostOneSet,
        rhs: atMostOneSet,
        expected: $.Cardinality.AtMostOne,
      },
      { lhs: atMostOneSet, rhs: oneSet, expected: $.Cardinality.One },
      { lhs: atMostOneSet, rhs: manySet, expected: $.Cardinality.Many },
      {
        lhs: atMostOneSet,
        rhs: atLeastOneSet,
        expected: $.Cardinality.AtLeastOne,
      },
      { lhs: oneSet, rhs: emptySet, expected: $.Cardinality.One },
      { lhs: oneSet, rhs: atMostOneSet, expected: $.Cardinality.One },
      { lhs: oneSet, rhs: oneSet, expected: $.Cardinality.One },
      { lhs: oneSet, rhs: manySet, expected: $.Cardinality.One },
      { lhs: oneSet, rhs: atLeastOneSet, expected: $.Cardinality.One },
      { lhs: manySet, rhs: emptySet, expected: $.Cardinality.Many },
      { lhs: manySet, rhs: atMostOneSet, expected: $.Cardinality.Many },
      { lhs: manySet, rhs: oneSet, expected: $.Cardinality.AtLeastOne },
      { lhs: manySet, rhs: manySet, expected: $.Cardinality.Many },
      { lhs: manySet, rhs: atLeastOneSet, expected: $.Cardinality.AtLeastOne },
      { lhs: atLeastOneSet, rhs: emptySet, expected: $.Cardinality.AtLeastOne },
      {
        lhs: atLeastOneSet,
        rhs: atMostOneSet,
        expected: $.Cardinality.AtLeastOne,
      },
      { lhs: atLeastOneSet, rhs: oneSet, expected: $.Cardinality.AtLeastOne },
      { lhs: atLeastOneSet, rhs: manySet, expected: $.Cardinality.AtLeastOne },
      {
        lhs: atLeastOneSet,
        rhs: atLeastOneSet,
        expected: $.Cardinality.AtLeastOne,
      },
    ];

    test.each(cardinalityPairs)(
      "Test $#: LHS: $lhs.__cardinality__, RHS: $rhs.__cardinality__, Expected: $expected",
      ({ lhs, rhs, expected }) => {
        const testExpr = e.op(lhs, "??", rhs);
        assert.deepEqual(testExpr.__cardinality__, expected);
      },
    );
  });

  test("cardinalities for set of operators", async () => {
    const t1 = e.op(e.cast(e.str, e.set()), "??", "default");
    assert.deepEqual(t1.__cardinality__, $.Cardinality.One);
    assert.equal(await t1.run(client), "default");

    const t2 = e.op(e.cast(e.str, e.set()), "union", "default");
    assert.deepEqual(t2.__cardinality__, $.Cardinality.One);
    assert.equal(await t1.run(client), "default");

    const t3 = e.op("one", "union", "two");
    assert.deepEqual(t3.__cardinality__, $.Cardinality.AtLeastOne);
    assert.deepEqual(await t3.run(client), ["one", "two"]);

    const t4 = e.op("distinct", "default");
    assert.deepEqual(t4.__cardinality__, $.Cardinality.One);
    assert.equal(await t4.run(client), "default");
  });
});
