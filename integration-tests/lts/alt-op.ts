// tslint:disable:no-console
import * as $ from "./dbschema/edgeql-js/typesystem";
import * as castMaps from "./dbschema/edgeql-js/castMaps";
import {
  $anyscalar,
  $bool,
  $number,
  $str,
} from "./dbschema/edgeql-js/modules/std";
import { $expr_Operator, cardutil } from "./dbschema/edgeql-js/reflection";

type InfixOperators = {
  "=": {
    lhs: castMaps.orScalarLiteral<$.TypeSet<$anyscalar>>;
    rhs: castMaps.orScalarLiteral<$.TypeSet<$anyscalar>>;
    result: $bool;
  } | {
    lhs: castMaps.orScalarLiteral<$.TypeSet<$str>>;
    rhs: castMaps.orScalarLiteral<$.TypeSet<$str>>;
    result: $bool;
  };
  "!=": {
    lhs: castMaps.orScalarLiteral<$.TypeSet<$anyscalar>>;
    rhs: castMaps.orScalarLiteral<$.TypeSet<$anyscalar>>;
    result: $bool;
  };
  "<": {
    lhs: castMaps.orScalarLiteral<$.TypeSet<$number>>;
    rhs: castMaps.orScalarLiteral<$.TypeSet<$number>>;
    result: $bool;
  };
  "<=": {
    lhs: castMaps.orScalarLiteral<$.TypeSet<$number>>;
    rhs: castMaps.orScalarLiteral<$.TypeSet<$number>>;
    result: $bool;
  };
  ">": {
    lhs: castMaps.orScalarLiteral<$.TypeSet<$number>>;
    rhs: castMaps.orScalarLiteral<$.TypeSet<$number>>;
    result: $bool;
  };
  ">=": {
    lhs: castMaps.orScalarLiteral<$.TypeSet<$number>>;
    rhs: castMaps.orScalarLiteral<$.TypeSet<$number>>;
    result: $bool;
  };
  "+": {
    lhs: castMaps.orScalarLiteral<$.TypeSet<$number>>;
    rhs: castMaps.orScalarLiteral<$.TypeSet<$number>>;
    result: $number;
  };
  "-": {
    lhs: castMaps.orScalarLiteral<$.TypeSet<$number>>;
    rhs: castMaps.orScalarLiteral<$.TypeSet<$number>>;
    result: $number;
  };
  "*": {
    lhs: castMaps.orScalarLiteral<$.TypeSet<$number>>;
    rhs: castMaps.orScalarLiteral<$.TypeSet<$number>>;
    result: $number;
  };
  "/": {
    lhs: castMaps.orScalarLiteral<$.TypeSet<$number>>;
    rhs: castMaps.orScalarLiteral<$.TypeSet<$number>>;
    result: $number;
  };
  "like": {
    lhs: castMaps.orScalarLiteral<$.TypeSet<$str>>;
    rhs: castMaps.orScalarLiteral<$.TypeSet<$str>>;
    result: $bool;
  };
  "ilike": {
    lhs: castMaps.orScalarLiteral<$.TypeSet<$str>>;
    rhs: castMaps.orScalarLiteral<$.TypeSet<$str>>;
    result: $bool;
  };
  "++": {
    lhs: castMaps.orScalarLiteral<$.TypeSet<$str>>;
    rhs: castMaps.orScalarLiteral<$.TypeSet<$str>>;
    result: $str;
  };
};

export declare function op<
  Op extends keyof InfixOperators,
  LHS extends InfixOperators[Op]["lhs"],
  RHS extends InfixOperators[Op]["rhs"],
  Res extends InfixOperators[Op]["result"]
>(
  lhs: LHS,
  op: Op,
  rhs: RHS
): $expr_Operator<
  Res,
  cardutil.multiplyCardinalities<
    cardutil.paramCardinality<LHS>,
    cardutil.paramCardinality<RHS>
  >
>;
