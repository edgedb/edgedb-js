// tslint:disable:no-console
import { setupTests } from "./test/setupTeardown";
import e from "./dbschema/edgeql-js";
import * as $ from "./dbschema/edgeql-js/typesystem";
import * as castMaps from "./dbschema/edgeql-js/castMaps";
import { createClient } from "edgedb";
import {
  $anyreal,
  $anyscalar,
  $bool,
  $str,
} from "./dbschema/edgeql-js/modules/std";
import { $expr_Operator, cardutil } from "./dbschema/edgeql-js/reflection";

const client = createClient();
const literalStr = e.str("hello");

async function run() {
  op(literalStr, "=", e.str("world"));
  e.select(e.Post, (p) => ({
    beep: op(p.text, "++", e.str("beep")),
    boop: op(e.len(p.text), "+", e.int32(1)),
  }));
  op(e.str("hello"), "ilike", e.str("world"));

  // @/ts-expect-error cannot compare strings and numbers
  op(e.str("hello"), "=", e.int32(1));

  op(e.str("hello"), "=", "hello");
}

run();

/*

*/

type OpDef<LHS, Op, RHS, Ret> = [LHS, Op, RHS, Ret];

type TypeSetOf<T> = T extends $.Expression<infer Set>
  ? $.TypeSet<Set["__element__"]>
  : T extends $.BaseTypeSet
  ? T
  : T extends $.ScalarType
  ? $.TypeSet<T>
  : never;

type OpFor<LHS> = Extract<Operators, [castMaps.orScalarLiteral<TypeSetOf<LHS>>, any, any, any]>[1];
type RHSFor<LHS, Op> = Extract<Operators, [castMaps.orScalarLiteral<TypeSetOf<LHS>>, Op, any, any]>[2];
type RetFor<LHS, Op, RHS> = Extract<
  Operators,
  [castMaps.orScalarLiteral<TypeSetOf<LHS>>, Op, RHS, any]
>[3];

type TypeSetOf$str = TypeSetOf<typeof literalStr>;
type OpFor$str = OpFor<typeof literalStr>;
type RHSFor$str = RHSFor<typeof literalStr, OpFor$str>;

type Operators =
  | OpDef<
      $.TypeSet<$.ScalarType<"std::str", string, string, any>>,
      "=" | "!=" | "like" | "ilike" | "++",
      $.TypeSet<$.ScalarType<"std::str", string, string, any>>,
      $bool
    >
  | OpDef<
      $.TypeSet<$.ScalarType<"std::number", number, number>>,
      "=" | "!=" | "<" | "<=" | ">" | ">=" | "+",
      $.TypeSet<$.ScalarType<"std::number", number, number>>,
      $bool
    >;

export declare function op<LHS extends castMaps.orScalarLiteral<$.TypeSet>>(
  lhs: LHS,
  op: OpFor<typeof lhs>,
  rhs: castMaps.orScalarLiteral<RHSFor<typeof lhs, typeof op>>
): $expr_Operator<
  RetFor<typeof lhs, typeof op, typeof rhs>,
  cardutil.multiplyCardinalities<
    cardutil.paramCardinality<typeof lhs>,
    cardutil.paramCardinality<typeof rhs>
  >
>;

/*
type StringOperators =
  | ["=", $str, $bool]
  | ["!=", $str, $bool]
  | ["like", $str, $bool]
  | ["ilike", $str, $bool]
  | ["++", $str, $str];

type NumberOperators =
  | ["=", $anyreal, $bool]
  | ["!=", $anyreal, $bool]
  | ["<", $anyreal, $bool]
  | ["<=", $anyreal, $bool]
  | [">", $anyreal, $bool]
  | [">=", $anyreal, $bool]
  | ["+", $anyreal, $anyreal];

type EnumOperators = ["=", $.EnumType, $bool];

type UnaryOperators =
  | ["exists", $.TypeSet, $bool]
  | ["distinct", $.TypeSet, $.TypeSet];

type TernaryOperators<T extends $.BaseType> =
  | ["if", $bool, "then", T, "else", T];

type BinaryOperators<Operand> = Operand extends castMaps.orScalarLiteral<
  $.TypeSet<$str>
>
  ? StringOperators
  : Operand extends castMaps.orScalarLiteral<$.TypeSet<$anyreal>>
  ? NumberOperators
  : Operand extends castMaps.orScalarLiteral<$.TypeSet<$.EnumType>>
  ? EnumOperators
  : never;

declare function op<
  OperatorDef extends UnaryOperators,
  Operator extends OperatorDef[0],
  Operand extends Extract<OperatorDef, [Operator, any, any]>[1]
>(operator: Operator, operand: Operand): any;
declare function op<
  LHS extends castMaps.orScalarLiteral<$.TypeSet<$anyscalar>>,
  OperatorDef extends BinaryOperators<LHS>,
  Operator extends OperatorDef[0],
  RHS extends castMaps.orScalarLiteral<
    $.TypeSet<Extract<OperatorDef, [Operator, any, any]>[1]>
  >,
  ReturnType extends Extract<OperatorDef, [Operator, any, any]>[2]
>(
  lhs: LHS,
  operator: Operator,
  rhs: RHS
): $expr_Operator<
  ReturnType,
  cardutil.multiplyCardinalities<
    cardutil.paramCardinality<LHS>,
    cardutil.paramCardinality<RHS>
  >
>;
*/
