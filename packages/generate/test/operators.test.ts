import superjson from "superjson";
import type {Client} from "edgedb";
import e from "../dbschema/edgeql-js";
import * as $ from "../src/syntax/reflection";

import {TestData, setupTests, teardownTests} from "./setupTeardown";

let client: Client;
let data: TestData;

beforeAll(async () => {
  const setup = await setupTests();
  ({client, data} = setup);
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
  expect(expr.__name__).toEqual(name);
  expect(superjson.stringify(expr.__args__)).toEqual(
    superjson.stringify(args.filter(arg => arg !== undefined))
  );
  expect(expr.__element__).toEqual(returnType);
  expect(expr.__cardinality__).toEqual(cardinality);

  if (edgeql) {
    expect(expr.toEdgeQL()).toEqual(edgeql);
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
    `"test string"[2:5]`
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
    `"test string"[3]`
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
    `"this" IF (42 = 42) ELSE "that"`
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
      e.set(e.str("that"), e.str("other"))
    ],
    e.str,
    $.Cardinality.AtLeastOne,
    `"this" IF (42 = 42) ELSE { "that", "other" }`
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
      e.set(e.str("that"), e.str("other"))
    ],
    e.str,
    $.Cardinality.Many,
    `<std::str>{} IF (42 = 42) ELSE { "that", "other" }`
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
      e.cast(e.str, e.set())
    ],
    e.str,
    $.Cardinality.AtMostOne,
    `"this" IF (42 = 42) ELSE <std::str>{}`
  );
});

test("non-literal args", async () => {
  const loki = e.select(e.Hero, hero => ({
    filter: e.op(hero.name, "=", "Loki")
  }));
  const thanos = e.select(e.Villain, villain => ({
    filter: e.op(villain.name, "=", "Thanos")
  }));

  const expr = e.op(loki, "??", thanos);

  expect(expr.run(client)).resolves.not.toThrow();
});

test("cardinalities for set of operators", async () => {
  const t1 = e.op(e.cast(e.str, e.set()), "??", "default");
  expect(t1.__cardinality__).toEqual($.Cardinality.AtMostOne);
  expect(await t1.run(client)).toEqual("default");

  const t2 = e.op(e.cast(e.str, e.set()), "union", "default");
  expect(t2.__cardinality__).toEqual($.Cardinality.One);
  expect(await t1.run(client)).toEqual("default");

  const t3 = e.op("one", "union", "two");
  expect(t3.__cardinality__).toEqual($.Cardinality.AtLeastOne);
  expect(await t3.run(client)).toEqual(["one", "two"]);

  const t4 = e.op("distinct", "default");
  expect(t4.__cardinality__).toEqual($.Cardinality.One);
  expect(await t4.run(client)).toEqual("default");
});
