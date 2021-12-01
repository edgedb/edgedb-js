import {$expr_Operator} from "../dbschema/edgeql/syntax/funcops";
import superjson from "superjson";
import {$} from "edgedb";
import e from "../dbschema/edgeql";

function checkOperatorExpr<T extends $expr_Operator>(
  expr: T,
  name: T["__name__"],
  args: T["__args__"],
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
    e.slice(
      e.str("test string"),
      e.literal(e.tuple([e.int64, e.int32]), [2, 5])
    ),
    "std::[]",
    [e.str("test string"), e.literal(e.tuple([e.int64, e.int32]), [2, 5])],
    e.str,
    $.Cardinality.One,
    `("test string"[2:5])`
  );

  checkOperatorExpr(
    e.slice(
      e.literal(e.array(e.bigint), [BigInt(1), BigInt(2), BigInt(3)]),
      e.literal(e.tuple([e.int64, e.int32]), [1, 2])
    ),
    "std::[]",
    [
      e.literal(e.array(e.bigint), [BigInt(1), BigInt(2), BigInt(3)]),
      e.literal(e.tuple([e.int64, e.int32]), [1, 2]),
    ],
    e.array(e.bigint),
    $.Cardinality.One,
    `(<array<std::bigint>>[<std::bigint>1n, <std::bigint>2n, <std::bigint>3n][1:2])`
  );

  checkOperatorExpr(
    e.index(e.str("test string"), e.int32(3)),
    "std::[]",
    [e.str("test string"), e.int32(3)],
    e.str,
    $.Cardinality.One,
    `("test string"[3])`
  );

  checkOperatorExpr(
    e.index(
      e.literal(e.array(e.bigint), [BigInt(1), BigInt(2), BigInt(3)]),
      e.int32(2)
    ),
    "std::[]",
    [
      e.literal(e.array(e.bigint), [BigInt(1), BigInt(2), BigInt(3)]),
      e.int32(2),
    ],
    e.bigint,
    $.Cardinality.One,
    `(<array<std::bigint>>[<std::bigint>1n, <std::bigint>2n, <std::bigint>3n][2])`
  );
});

test("if else op", () => {
  checkOperatorExpr(
    e.if_else(e.str("this"), e.eq(e.int64(42), e.float32(42)), e.str("that")),
    "std::IF",
    [e.str("this"), e.eq(e.int64(42), e.float32(42)), e.str("that")],
    e.str,
    $.Cardinality.One,
    `("this" IF (42 = <std::float32>42) ELSE "that")`
  );

  checkOperatorExpr(
    e.if_else(e.str("this"), e.set(e.bool), e.str("that")),
    "std::IF",
    [e.str("this"), e.set(e.bool), e.str("that")],
    e.str,
    $.Cardinality.Empty,
    `("this" IF <std::bool>{} ELSE "that")`
  );

  checkOperatorExpr(
    e.if_else(
      e.str("this"),
      e.set(e.bool(true), e.bool(false)),
      e.str("that")
    ),
    "std::IF",
    [e.str("this"), e.set(e.bool(true), e.bool(false)), e.str("that")],
    e.str,
    $.Cardinality.AtLeastOne,
    `("this" IF { true, false } ELSE "that")`
  );

  checkOperatorExpr(
    e.if_else(
      e.str("this"),
      e.eq(e.int64(42), e.float32(42)),
      e.set(e.str("that"), e.str("other"))
    ),
    "std::IF",
    [
      e.str("this"),
      e.eq(e.int64(42), e.float32(42)),
      e.set(e.str("that"), e.str("other")),
    ],
    e.str,
    $.Cardinality.AtLeastOne,
    `("this" IF (42 = <std::float32>42) ELSE { "that", "other" })`
  );

  checkOperatorExpr(
    e.if_else(
      e.set(e.str),
      e.eq(e.int64(42), e.float32(42)),
      e.set(e.str("that"), e.str("other"))
    ),
    "std::IF",
    [
      e.set(e.str),
      e.eq(e.int64(42), e.float32(42)),
      e.set(e.str("that"), e.str("other")),
    ],
    e.str,
    $.Cardinality.Many,
    `(<std::str>{} IF (42 = <std::float32>42) ELSE { "that", "other" })`
  );

  checkOperatorExpr(
    e.if_else(e.str("this"), e.eq(e.int64(42), e.float32(42)), e.set(e.str)),
    "std::IF",
    [e.str("this"), e.eq(e.int64(42), e.float32(42)), e.set(e.str)],
    e.str,
    $.Cardinality.AtMostOne,
    `("this" IF (42 = <std::float32>42) ELSE <std::str>{})`
  );
});
