// tslint:disable:no-console
import e from "./dbschema/edgeql-js";
import * as $ from "./dbschema/edgeql-js/typesystem";
import * as castMaps from "./dbschema/edgeql-js/castMaps";
import { $bool, $number, $str } from "./dbschema/edgeql-js/modules/std";
import { $expr_Operator, cardutil } from "./dbschema/edgeql-js/reflection";

type OpDef<LHS, Op, RHS, Ret> = [LHS, Op, RHS, Ret];

type Extends<L, R> = L extends R ? true : false;

type FindOpDefFor<LHS, Defs> = Defs extends OpDef<infer L, infer Op, any, any>
  ? Extends<LHS, L> extends true
    ? Defs
    : never
  : never;
const literalStr = e.str("hello");
type FindOpFor$str = FindOpDefFor<typeof literalStr, InfixOperators>;

export declare function op<
  LHS,
  Def extends FindOpDefFor<LHS, InfixOperators>,
  Op extends Def[1],
  RHS extends Def[2],
  Ret extends Def[3]
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
