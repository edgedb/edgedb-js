import {$expr_Operator} from "@syntax/funcops";
import {Cardinality, typeutil} from "../../src/reflection";
import e, {$Tuple, literal, set, $Array} from "../generated/example";

function checkOperatorExpr<T extends $expr_Operator>(
  expr: T,
  name: T["__name__"],
  args: T["__args__"],
  returnType: T["__element__"],
  cardinality: T["__cardinality__"],
  edgeql?: string
) {
  expect(expr.__name__).toEqual(name);
  expect(expr.__args__).toEqual(args.filter((arg) => arg !== undefined));
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
      literal(e.tuple([e.int64, e.int32]), [2, 5])
    ),
    "std::[]",
    [e.str("test string"), literal(e.tuple([e.int64, e.int32]), [2, 5])],
    e.str,
    Cardinality.One,
    `(<std::str>"test string"[2:5])`
  );

  checkOperatorExpr(
    e.slice(
      literal(e.array(e.bigint), [BigInt(1), BigInt(2), BigInt(3)]),
      literal(e.tuple([e.int64, e.int32]), [1, 2])
    ),
    "std::[]",
    [
      literal(e.array(e.bigint), [BigInt(1), BigInt(2), BigInt(3)]),
      literal(e.tuple([e.int64, e.int32]), [1, 2]),
    ],
    e.array(e.bigint),
    Cardinality.One,
    `(<array<std::bigint>>[<std::bigint>1n, <std::bigint>2n, <std::bigint>3n][1:2])`
  );

  checkOperatorExpr(
    e.index(e.str("test string"), e.int32(3)),
    "std::[]",
    [e.str("test string"), e.int32(3)],
    e.str,
    Cardinality.One,
    `(<std::str>"test string"[3])`
  );

  checkOperatorExpr(
    e.index(
      literal(e.array(e.bigint), [BigInt(1), BigInt(2), BigInt(3)]),
      e.int32(2)
    ),
    "std::[]",
    [
      literal(e.array(e.bigint), [BigInt(1), BigInt(2), BigInt(3)]),
      e.int32(2),
    ],
    e.bigint,
    Cardinality.One,
    `(<array<std::bigint>>[<std::bigint>1n, <std::bigint>2n, <std::bigint>3n][2])`
  );
});

test("if else op", () => {
  const expr = e.if_else(
    e.str("this"),
    e.eq(e.int64(42), e.float32(42)),
    e.str("that")
  );
  checkOperatorExpr(
    expr,
    "std::IF",
    [e.str("this"), e.eq(e.int64(42), e.float32(42)), e.str("that")],
    e.str,
    Cardinality.Many,
    `(<std::str>"this" IF (<std::int64>42 = <std::float32>42) ELSE <std::str>"that")`
  );
});
