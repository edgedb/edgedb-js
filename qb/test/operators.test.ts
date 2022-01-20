import superjson from "superjson";
import {$} from "edgedb";
import e from "../dbschema/edgeql";
import {$expr_Operator} from "edgedb/dist/reflection";

function checkOperatorExpr<T extends $expr_Operator>(
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
    [e.str("test string"), [e.number(2), e.number(5)]],
    e.str,
    $.Cardinality.One,
    `("test string")[2:5]`
  );

  checkOperatorExpr(
    e.str("test string").slice(e.number(2), e.number(5)),
    "[]",
    [e.str("test string"), [e.number(2), e.number(5)]],
    e.str,
    $.Cardinality.One,
    `("test string")[2:5]`
  );

  checkOperatorExpr(
    e.array([BigInt(1), BigInt(2), BigInt(3)])["1:2"],
    "[]",
    [e.array([BigInt(1), BigInt(2), BigInt(3)]), [e.number(1), e.number(2)]],
    e.array(e.bigint),
    $.Cardinality.One,
    `([<std::bigint>1n, <std::bigint>2n, <std::bigint>3n])[1:2]`
  );

  checkOperatorExpr(
    e.str("test string")[3],
    "[]",
    [e.str("test string"), e.number(3)],
    e.str,
    $.Cardinality.One,
    `("test string")[3]`
  );

  checkOperatorExpr(
    e.str("test string").index(e.number(3)),
    "[]",
    [e.str("test string"), e.number(3)],
    e.str,
    $.Cardinality.One,
    `("test string")[3]`
  );

  checkOperatorExpr(
    e.array([BigInt(1), BigInt(2), BigInt(3)])[2],
    "[]",
    [e.array([BigInt(1), BigInt(2), BigInt(3)]), e.number(2)],
    e.bigint,
    $.Cardinality.One,
    `([<std::bigint>1n, <std::bigint>2n, <std::bigint>3n])[2]`
  );

  checkOperatorExpr(
    e.to_json(e.str(`{"name":"Bob"}`)).name,
    "[]",
    [e.to_json(e.str(`{"name":"Bob"}`)), e.str("name")],
    e.json,
    $.Cardinality.One,
    `(std::to_json(("{\\\"name\\\":\\\"Bob\\\"}")))["name"]`
  );

  checkOperatorExpr(
    e.to_json(e.str(`{"name":"Bob"}`)).destructure(e.str("name")),
    "[]",
    [e.to_json(e.str(`{"name":"Bob"}`)), e.str("name")],
    e.json,
    $.Cardinality.One,
    `(std::to_json(("{\\\"name\\\":\\\"Bob\\\"}")))["name"]`
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
    `("this" IF (42 = <std::float32>42) ELSE "that")`
  );

  checkOperatorExpr(
    e.op("this", "if", e.set(e.bool), "else", "that"),
    "if_else",
    [e.str("this"), e.set(e.bool), e.str("that")],
    e.str,
    $.Cardinality.Empty,
    `("this" IF <std::bool>{} ELSE "that")`
  );

  checkOperatorExpr(
    e.op("this", "if", e.set(e.bool(true), e.bool(false)), "else", "that"),
    "if_else",
    [e.str("this"), e.set(e.bool(true), e.bool(false)), e.str("that")],
    e.str,
    $.Cardinality.AtLeastOne,
    `("this" IF { true, false } ELSE "that")`
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
    `("this" IF (<std::int64>42 = <std::float32>42) ELSE { "that", "other" })`
  );

  checkOperatorExpr(
    e.op(
      e.set(e.str),
      "if",
      e.op(e.literal(e.int64, 42), "=", e.literal(e.float32, 42)),
      "else",
      e.set(e.str("that"), e.str("other"))
    ),
    "if_else",
    [
      e.set(e.str),
      e.op(e.literal(e.int64, 42), "=", e.literal(e.float32, 42)),
      e.set(e.str("that"), e.str("other")),
    ],
    e.str,
    $.Cardinality.Many,
    `(<std::str>{} IF (<std::int64>42 = <std::float32>42) ELSE { "that", "other" })`
  );

  checkOperatorExpr(
    e.op(
      "this",
      "if",
      e.op(42, "=", e.literal(e.float32, 42)),
      "else",
      e.set(e.str)
    ),
    "if_else",
    [e.str("this"), e.op(42, "=", e.literal(e.float32, 42)), e.set(e.str)],
    e.str,
    $.Cardinality.AtMostOne,
    `("this" IF (42 = <std::float32>42) ELSE <std::str>{})`
  );
});
