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
    edgeql?: string
  ) {
    assert.deepEqual(expr.__name__, name);
    assert.deepEqual(
      superjson.stringify(expr.__args__),
      superjson.stringify(args.filter((arg) => arg !== undefined))
    );
    assert.deepEqual(expr.__element__, returnType);
    assert.deepEqual(expr.__cardinality__, cardinality);

    if (edgeql) {
      assert.deepEqual(expr.toEdgeQL(), edgeql);
    }
  }

  test("slice and index ops", () => {
    checkOperatorExpr(
      e.str("test string")["2:5"],
      "[]",
      [e.str("test string"), [e.int64(2), e.int64(5)]],
      e.str,
      $.Cardinality.One,
      `"test string"[2:5]`
    );

    checkOperatorExpr(
      e.str("test string").slice(e.int64(2), e.int64(5)),
      "[]",
      [e.str("test string"), [e.int64(2), e.int64(5)]],
      e.str,
      $.Cardinality.One,
      `"test string"[<std::int64>2:<std::int64>5]`
    );

    checkOperatorExpr(
      e.array([BigInt(1), BigInt(2), BigInt(3)])["1:2"],
      "[]",
      [e.array([BigInt(1), BigInt(2), BigInt(3)]), [e.int64(1), e.int64(2)]],
      e.array(e.bigint),
      $.Cardinality.One,
      `[<std::bigint>1n, <std::bigint>2n, <std::bigint>3n][1:2]`
    );

    checkOperatorExpr(
      e.str("test string")[3],
      "[]",
      [e.str("test string"), e.int64(3)],
      e.str,
      $.Cardinality.One,
      `"test string"[3]`
    );

    checkOperatorExpr(
      e.str("test string").index(e.int64(3)),
      "[]",
      [e.str("test string"), e.int64(3)],
      e.str,
      $.Cardinality.One,
      `"test string"[<std::int64>3]`
    );

    checkOperatorExpr(
      e.array([BigInt(1), BigInt(2), BigInt(3)])[2],
      "[]",
      [e.array([BigInt(1), BigInt(2), BigInt(3)]), e.int64(2)],
      e.bigint,
      $.Cardinality.One,
      `[<std::bigint>1n, <std::bigint>2n, <std::bigint>3n][2]`
    );

    checkOperatorExpr(
      e.to_json(e.str(`{"name":"Bob"}`)).name,
      "[]",
      [e.to_json(e.str(`{"name":"Bob"}`)), e.str("name")],
      e.json,
      $.Cardinality.One,
      `std::to_json("{\\\"name\\\":\\\"Bob\\\"}")["name"]`
    );

    checkOperatorExpr(
      e.to_json(e.str(`{"name":"Bob"}`)).destructure(e.str("name")),
      "[]",
      [e.to_json(e.str(`{"name":"Bob"}`)), e.str("name")],
      e.json,
      $.Cardinality.One,
      `std::to_json("{\\\"name\\\":\\\"Bob\\\"}")["name"]`
    );
  });

  test("if else op", () => {
    checkOperatorExpr(
      e.op(
        "this",
        "if",
        e.op(42, "=", e.literal(e.float32, 42)),
        "else",
        e.str("that")
      ),
      "if_else",
      [e.str("this"), e.op(42, "=", e.literal(e.float32, 42)), e.str("that")],
      e.str,
      $.Cardinality.One,
      `"this" IF (42 = <std::float32>42) ELSE "that"`
    );

    checkOperatorExpr(
      e.op("this", "if", e.cast(e.bool, e.set()), "else", "that"),
      "if_else",
      [e.str("this"), e.cast(e.bool, e.set()), e.str("that")],
      e.str,
      $.Cardinality.Empty,
      `"this" IF <std::bool>{} ELSE "that"`
    );

    checkOperatorExpr(
      e.op("this", "if", e.set(e.bool(true), e.bool(false)), "else", "that"),
      "if_else",
      [e.str("this"), e.set(e.bool(true), e.bool(false)), e.str("that")],
      e.str,
      $.Cardinality.AtLeastOne,
      `"this" IF { true, false } ELSE "that"`
    );

    checkOperatorExpr(
      e.op(
        e.str("this"),
        "if",
        e.op(e.literal(e.int64, 42), "=", e.literal(e.float32, 42)),
        "else",
        e.set(e.str("that"), e.str("other"))
      ),
      "if_else",
      [
        e.str("this"),
        e.op(e.literal(e.int64, 42), "=", e.literal(e.float32, 42)),
        e.set(e.str("that"), e.str("other")),
      ],
      e.str,
      $.Cardinality.AtLeastOne,
      `"this" IF (<std::int64>42 = <std::float32>42) ELSE { "that", "other" }`
    );

    checkOperatorExpr(
      e.op(
        e.cast(e.str, e.set()),
        "if",
        e.op(e.literal(e.int64, 42), "=", e.literal(e.float32, 42)),
        "else",
        e.set(e.str("that"), e.str("other"))
      ),
      "if_else",
      [
        e.cast(e.str, e.set()),
        e.op(e.literal(e.int64, 42), "=", e.literal(e.float32, 42)),
        e.set(e.str("that"), e.str("other")),
      ],
      e.str,
      $.Cardinality.Many,
      `<std::str>{} IF (<std::int64>42 = <std::float32>42) ELSE { "that", "other" }`
    );

    checkOperatorExpr(
      e.op(
        "this",
        "if",
        e.op(42, "=", e.literal(e.float32, 42)),
        "else",
        e.cast(e.str, e.set())
      ),
      "if_else",
      [
        e.str("this"),
        e.op(42, "=", e.literal(e.float32, 42)),
        e.cast(e.str, e.set()),
      ],
      e.str,
      $.Cardinality.AtMostOne,
      `"this" IF (42 = <std::float32>42) ELSE <std::str>{}`
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

  test("cardinalities for set of operators", async () => {
    const t1 = e.op(e.cast(e.str, e.set()), "??", "default");
    assert.deepEqual(t1.__cardinality__, $.Cardinality.AtMostOne);
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
