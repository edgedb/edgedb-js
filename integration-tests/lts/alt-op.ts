// tslint:disable:no-console
import e from "./dbschema/edgeql-js";
import * as $ from "./dbschema/edgeql-js/typesystem";
import * as castMaps from "./dbschema/edgeql-js/castMaps";
import { $bool, $number, $str } from "./dbschema/edgeql-js/modules/std";
import { $expr_Operator, cardutil } from "./dbschema/edgeql-js/reflection";

type OpDef<LHS, Op, RHS, Ret> = [LHS, Op, RHS, Ret];

type FindOpFor<Defs, LHS> = Defs extends OpDef<infer L, any, any, any>
  ? LHS extends L
    ? Defs[1]
    : never
  : never;

type FindRHSFor<Defs, LHS, Op> = Defs extends OpDef<any, any, any, any>
  ? LHS extends Defs[0]
    ? Op extends Defs[1]
      ? Defs[2]
      : never
    : never
  : never;

type FindRetFor<
  Defs,
  LHS,
  Op,
  RHS
> = Defs extends OpDef<any, any, any, any>
  ? LHS extends Defs[0]
    ? Op extends Defs[1]
      ? RHS extends Defs[2]
        ? Defs[3]
        : never
      : never
    : never
  : never;

const literalStr = e.str("hello");
type FindOpFor$str = FindOpFor<InfixOperators, typeof literalStr>;
type FindRHSFor$str = FindRHSFor<
  InfixOperators,
  typeof literalStr,
  "++"
>;
type FindRetFor$str = FindRetFor<
  InfixOperators,
  typeof literalStr,
  "++",
  FindRHSFor$str
>;

export declare function op<
  LHS,
  Op extends FindOpFor<InfixOperators, LHS>,
  RHS extends FindRHSFor<InfixOperators, LHS, Op>,
  Ret extends FindRetFor<InfixOperators, LHS, Op, RHS>
>(
  lhs: LHS,
  op: Op,
  rhs: RHS
): $expr_Operator<
  Ret,
  cardutil.multiplyCardinalities<
    cardutil.paramCardinality<LHS>,
    cardutil.paramCardinality<RHS>
  >
>;

type InfixOperators =
  | OpDef<
      castMaps.orScalarLiteral<$.TypeSet<$str>>,
      "=" | "!=" | "like" | "ilike",
      castMaps.orScalarLiteral<$.TypeSet<$str>>,
      $bool
    >
  | OpDef<
      castMaps.orScalarLiteral<$.TypeSet<$str>>,
      "++",
      castMaps.orScalarLiteral<$.TypeSet<$str>>,
      $str
    >
  | OpDef<
      castMaps.orScalarLiteral<$.TypeSet<$number>>,
      "=" | "!=" | "<" | "<=" | ">" | ">=" | "+",
      castMaps.orScalarLiteral<$.TypeSet<$number>>,
      $bool
    >;
