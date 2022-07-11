import { $ } from "edgedb";
import * as _ from "../imports.mjs";
import type * as _std from "./std.mjs";
export type $date_duration = $.ScalarType<"cal::date_duration", _.edgedb.DateDuration>;
const date_duration: $.scalarTypeWithConstructor<$date_duration, never> = $.makeType<$.scalarTypeWithConstructor<$date_duration, never>>(_.spec, "00000000-0000-0000-0000-000000000112", _.syntax.literal);

export type $local_date = $.ScalarType<"cal::local_date", _.edgedb.LocalDate>;
const local_date: $.scalarTypeWithConstructor<$local_date, never> = $.makeType<$.scalarTypeWithConstructor<$local_date, never>>(_.spec, "00000000-0000-0000-0000-00000000010c", _.syntax.literal);

export type $local_datetime = $.ScalarType<"cal::local_datetime", _.edgedb.LocalDateTime>;
const local_datetime: $.scalarTypeWithConstructor<$local_datetime, never> = $.makeType<$.scalarTypeWithConstructor<$local_datetime, never>>(_.spec, "00000000-0000-0000-0000-00000000010b", _.syntax.literal);
export type $local_datetimeλICastableTo = $local_datetime | $local_date;
export type $local_datetimeλIAssignableBy = $local_datetime | $local_date;

export type $local_time = $.ScalarType<"cal::local_time", _.edgedb.LocalTime>;
const local_time: $.scalarTypeWithConstructor<$local_time, never> = $.makeType<$.scalarTypeWithConstructor<$local_time, never>>(_.spec, "00000000-0000-0000-0000-00000000010d", _.syntax.literal);

export type $relative_duration = $.ScalarType<"cal::relative_duration", _.edgedb.RelativeDuration>;
const relative_duration: $.scalarTypeWithConstructor<$relative_duration, never> = $.makeType<$.scalarTypeWithConstructor<$relative_duration, never>>(_.spec, "00000000-0000-0000-0000-000000000111", _.syntax.literal);
export type $relative_durationλICastableTo = $relative_duration | $date_duration;
export type $relative_durationλIAssignableBy = $relative_duration | $date_duration;

type to_local_datetimeλFuncExpr<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<_std.$str>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<_std.$str>> | undefined,
> = $.$expr_Function<
  "cal::to_local_datetime",
  _.castMaps.mapLiteralToTypeSet<[P1, P2]>,
  {},
  $.TypeSet<$local_datetime, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.optionalParamCardinality<P2>>>
>;
type to_local_datetimeλFuncExpr2<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<_std.$datetime>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<_std.$str>>,
> = $.$expr_Function<
  "cal::to_local_datetime",
  _.castMaps.mapLiteralToTypeSet<[P1, P2]>,
  {},
  $.TypeSet<$local_datetime, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.paramCardinality<P2>>>
>;
type to_local_datetimeλFuncExpr3<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<_std.$number>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<_std.$number>>,
  P3 extends _.castMaps.orScalarLiteral<$.TypeSet<_std.$number>>,
  P4 extends _.castMaps.orScalarLiteral<$.TypeSet<_std.$number>>,
  P5 extends _.castMaps.orScalarLiteral<$.TypeSet<_std.$number>>,
  P6 extends _.castMaps.orScalarLiteral<$.TypeSet<_std.$number>>,
> = $.$expr_Function<
  "cal::to_local_datetime",
  _.castMaps.mapLiteralToTypeSet<[P1, P2, P3, P4, P5, P6]>,
  {},
  $.TypeSet<$local_datetime, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.paramCardinality<P2>>, $.cardinalityUtil.paramCardinality<P3>>, $.cardinalityUtil.paramCardinality<P4>>, $.cardinalityUtil.paramCardinality<P5>>, $.cardinalityUtil.paramCardinality<P6>>>
>;
/**
 * Create a `cal::local_datetime` value.
 */
function to_local_datetime<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<_std.$str>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<_std.$str>> | undefined,
>(
  s: P1,
  fmt?: P2,
): to_local_datetimeλFuncExpr<P1, P2>;
/**
 * Create a `cal::local_datetime` value.
 */
function to_local_datetime<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<_std.$datetime>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<_std.$str>>,
>(
  dt: P1,
  zone: P2,
): to_local_datetimeλFuncExpr2<P1, P2>;
/**
 * Create a `cal::local_datetime` value.
 */
function to_local_datetime<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<_std.$number>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<_std.$number>>,
  P3 extends _.castMaps.orScalarLiteral<$.TypeSet<_std.$number>>,
  P4 extends _.castMaps.orScalarLiteral<$.TypeSet<_std.$number>>,
  P5 extends _.castMaps.orScalarLiteral<$.TypeSet<_std.$number>>,
  P6 extends _.castMaps.orScalarLiteral<$.TypeSet<_std.$number>>,
>(
  year: P1,
  month: P2,
  day: P3,
  hour: P4,
  min: P5,
  sec: P6,
): to_local_datetimeλFuncExpr3<P1, P2, P3, P4, P5, P6>;
function to_local_datetime(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('cal::to_local_datetime', args, _.spec, [
    {args: [{typeId: "00000000-0000-0000-0000-000000000101", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-000000000101", optional: true, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-00000000010b"},
    {args: [{typeId: "00000000-0000-0000-0000-00000000010a", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-000000000101", optional: false, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-00000000010b"},
    {args: [{typeId: "00000000-0000-0000-0000-0000000001ff", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-0000000001ff", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-0000000001ff", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-0000000001ff", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-0000000001ff", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-0000000001ff", optional: false, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-00000000010b"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "cal::to_local_datetime",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type to_local_dateλFuncExpr<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<_std.$str>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<_std.$str>> | undefined,
> = $.$expr_Function<
  "cal::to_local_date",
  _.castMaps.mapLiteralToTypeSet<[P1, P2]>,
  {},
  $.TypeSet<$local_date, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.optionalParamCardinality<P2>>>
>;
type to_local_dateλFuncExpr2<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<_std.$datetime>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<_std.$str>>,
> = $.$expr_Function<
  "cal::to_local_date",
  _.castMaps.mapLiteralToTypeSet<[P1, P2]>,
  {},
  $.TypeSet<$local_date, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.paramCardinality<P2>>>
>;
type to_local_dateλFuncExpr3<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<_std.$number>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<_std.$number>>,
  P3 extends _.castMaps.orScalarLiteral<$.TypeSet<_std.$number>>,
> = $.$expr_Function<
  "cal::to_local_date",
  _.castMaps.mapLiteralToTypeSet<[P1, P2, P3]>,
  {},
  $.TypeSet<$local_date, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.paramCardinality<P2>>, $.cardinalityUtil.paramCardinality<P3>>>
>;
/**
 * Create a `cal::local_date` value.
 */
function to_local_date<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<_std.$str>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<_std.$str>> | undefined,
>(
  s: P1,
  fmt?: P2,
): to_local_dateλFuncExpr<P1, P2>;
/**
 * Create a `cal::local_date` value.
 */
function to_local_date<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<_std.$datetime>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<_std.$str>>,
>(
  dt: P1,
  zone: P2,
): to_local_dateλFuncExpr2<P1, P2>;
/**
 * Create a `cal::local_date` value.
 */
function to_local_date<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<_std.$number>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<_std.$number>>,
  P3 extends _.castMaps.orScalarLiteral<$.TypeSet<_std.$number>>,
>(
  year: P1,
  month: P2,
  day: P3,
): to_local_dateλFuncExpr3<P1, P2, P3>;
function to_local_date(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('cal::to_local_date', args, _.spec, [
    {args: [{typeId: "00000000-0000-0000-0000-000000000101", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-000000000101", optional: true, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-00000000010c"},
    {args: [{typeId: "00000000-0000-0000-0000-00000000010a", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-000000000101", optional: false, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-00000000010c"},
    {args: [{typeId: "00000000-0000-0000-0000-0000000001ff", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-0000000001ff", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-0000000001ff", optional: false, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-00000000010c"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "cal::to_local_date",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type to_local_timeλFuncExpr<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<_std.$str>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<_std.$str>> | undefined,
> = $.$expr_Function<
  "cal::to_local_time",
  _.castMaps.mapLiteralToTypeSet<[P1, P2]>,
  {},
  $.TypeSet<$local_time, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.optionalParamCardinality<P2>>>
>;
type to_local_timeλFuncExpr2<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<_std.$datetime>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<_std.$str>>,
> = $.$expr_Function<
  "cal::to_local_time",
  _.castMaps.mapLiteralToTypeSet<[P1, P2]>,
  {},
  $.TypeSet<$local_time, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.paramCardinality<P2>>>
>;
type to_local_timeλFuncExpr3<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<_std.$number>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<_std.$number>>,
  P3 extends _.castMaps.orScalarLiteral<$.TypeSet<_std.$number>>,
> = $.$expr_Function<
  "cal::to_local_time",
  _.castMaps.mapLiteralToTypeSet<[P1, P2, P3]>,
  {},
  $.TypeSet<$local_time, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.paramCardinality<P2>>, $.cardinalityUtil.paramCardinality<P3>>>
>;
/**
 * Create a `cal::local_time` value.
 */
function to_local_time<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<_std.$str>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<_std.$str>> | undefined,
>(
  s: P1,
  fmt?: P2,
): to_local_timeλFuncExpr<P1, P2>;
/**
 * Create a `cal::local_time` value.
 */
function to_local_time<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<_std.$datetime>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<_std.$str>>,
>(
  dt: P1,
  zone: P2,
): to_local_timeλFuncExpr2<P1, P2>;
/**
 * Create a `cal::local_time` value.
 */
function to_local_time<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<_std.$number>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<_std.$number>>,
  P3 extends _.castMaps.orScalarLiteral<$.TypeSet<_std.$number>>,
>(
  hour: P1,
  min: P2,
  sec: P3,
): to_local_timeλFuncExpr3<P1, P2, P3>;
function to_local_time(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('cal::to_local_time', args, _.spec, [
    {args: [{typeId: "00000000-0000-0000-0000-000000000101", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-000000000101", optional: true, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-00000000010d"},
    {args: [{typeId: "00000000-0000-0000-0000-00000000010a", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-000000000101", optional: false, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-00000000010d"},
    {args: [{typeId: "00000000-0000-0000-0000-0000000001ff", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-0000000001ff", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-0000000001ff", optional: false, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-00000000010d"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "cal::to_local_time",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type to_relative_durationλFuncExpr<
  NamedArgs extends {
    "years"?: _.castMaps.orScalarLiteral<$.TypeSet<_std.$number>>,
    "months"?: _.castMaps.orScalarLiteral<$.TypeSet<_std.$number>>,
    "days"?: _.castMaps.orScalarLiteral<$.TypeSet<_std.$number>>,
    "hours"?: _.castMaps.orScalarLiteral<$.TypeSet<_std.$number>>,
    "minutes"?: _.castMaps.orScalarLiteral<$.TypeSet<_std.$number>>,
    "seconds"?: _.castMaps.orScalarLiteral<$.TypeSet<_std.$number>>,
    "microseconds"?: _.castMaps.orScalarLiteral<$.TypeSet<_std.$number>>,
  },
> = $.$expr_Function<
  "cal::to_relative_duration",
  [],
  _.castMaps.mapLiteralToTypeSet<NamedArgs>,
  $.TypeSet<$relative_duration, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.optionalParamCardinality<NamedArgs["years"]>, $.cardinalityUtil.optionalParamCardinality<NamedArgs["months"]>>, $.cardinalityUtil.optionalParamCardinality<NamedArgs["days"]>>, $.cardinalityUtil.optionalParamCardinality<NamedArgs["hours"]>>, $.cardinalityUtil.optionalParamCardinality<NamedArgs["minutes"]>>, $.cardinalityUtil.optionalParamCardinality<NamedArgs["seconds"]>>, $.cardinalityUtil.optionalParamCardinality<NamedArgs["microseconds"]>>>
>;
/**
 * Create a `cal::relative_duration` value.
 */
function to_relative_duration<
  NamedArgs extends {
    "years"?: _.castMaps.orScalarLiteral<$.TypeSet<_std.$number>>,
    "months"?: _.castMaps.orScalarLiteral<$.TypeSet<_std.$number>>,
    "days"?: _.castMaps.orScalarLiteral<$.TypeSet<_std.$number>>,
    "hours"?: _.castMaps.orScalarLiteral<$.TypeSet<_std.$number>>,
    "minutes"?: _.castMaps.orScalarLiteral<$.TypeSet<_std.$number>>,
    "seconds"?: _.castMaps.orScalarLiteral<$.TypeSet<_std.$number>>,
    "microseconds"?: _.castMaps.orScalarLiteral<$.TypeSet<_std.$number>>,
  },
>(
  namedArgs: NamedArgs,
): to_relative_durationλFuncExpr<NamedArgs>;
function to_relative_duration(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('cal::to_relative_duration', args, _.spec, [
    {args: [], namedArgs: {"years": {typeId: "00000000-0000-0000-0000-0000000001ff", optional: true, setoftype: false, variadic: false}, "months": {typeId: "00000000-0000-0000-0000-0000000001ff", optional: true, setoftype: false, variadic: false}, "days": {typeId: "00000000-0000-0000-0000-0000000001ff", optional: true, setoftype: false, variadic: false}, "hours": {typeId: "00000000-0000-0000-0000-0000000001ff", optional: true, setoftype: false, variadic: false}, "minutes": {typeId: "00000000-0000-0000-0000-0000000001ff", optional: true, setoftype: false, variadic: false}, "seconds": {typeId: "00000000-0000-0000-0000-0000000001ff", optional: true, setoftype: false, variadic: false}, "microseconds": {typeId: "00000000-0000-0000-0000-0000000001ff", optional: true, setoftype: false, variadic: false}}, returnTypeId: "00000000-0000-0000-0000-000000000111"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "cal::to_relative_duration",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type to_date_durationλFuncExpr<
  NamedArgs extends {
    "years"?: _.castMaps.orScalarLiteral<$.TypeSet<_std.$number>>,
    "months"?: _.castMaps.orScalarLiteral<$.TypeSet<_std.$number>>,
    "days"?: _.castMaps.orScalarLiteral<$.TypeSet<_std.$number>>,
  },
> = $.$expr_Function<
  "cal::to_date_duration",
  [],
  _.castMaps.mapLiteralToTypeSet<NamedArgs>,
  $.TypeSet<$date_duration, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.optionalParamCardinality<NamedArgs["years"]>, $.cardinalityUtil.optionalParamCardinality<NamedArgs["months"]>>, $.cardinalityUtil.optionalParamCardinality<NamedArgs["days"]>>>
>;
/**
 * Create a `cal::date_duration` value.
 */
function to_date_duration<
  NamedArgs extends {
    "years"?: _.castMaps.orScalarLiteral<$.TypeSet<_std.$number>>,
    "months"?: _.castMaps.orScalarLiteral<$.TypeSet<_std.$number>>,
    "days"?: _.castMaps.orScalarLiteral<$.TypeSet<_std.$number>>,
  },
>(
  namedArgs: NamedArgs,
): to_date_durationλFuncExpr<NamedArgs>;
function to_date_duration(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('cal::to_date_duration', args, _.spec, [
    {args: [], namedArgs: {"years": {typeId: "00000000-0000-0000-0000-0000000001ff", optional: true, setoftype: false, variadic: false}, "months": {typeId: "00000000-0000-0000-0000-0000000001ff", optional: true, setoftype: false, variadic: false}, "days": {typeId: "00000000-0000-0000-0000-0000000001ff", optional: true, setoftype: false, variadic: false}}, returnTypeId: "00000000-0000-0000-0000-000000000112"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "cal::to_date_duration",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type time_getλFuncExpr<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$local_time>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<_std.$str>>,
> = $.$expr_Function<
  "cal::time_get",
  _.castMaps.mapLiteralToTypeSet<[P1, P2]>,
  {},
  $.TypeSet<_std.$number, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.paramCardinality<P2>>>
>;
/**
 * Extract a specific element of input time by name.
 */
function time_get<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$local_time>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<_std.$str>>,
>(
  dt: P1,
  el: P2,
): time_getλFuncExpr<P1, P2>;
function time_get(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('cal::time_get', args, _.spec, [
    {args: [{typeId: "00000000-0000-0000-0000-00000000010d", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-000000000101", optional: false, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-0000000001ff"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "cal::time_get",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type date_getλFuncExpr<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$local_date>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<_std.$str>>,
> = $.$expr_Function<
  "cal::date_get",
  _.castMaps.mapLiteralToTypeSet<[P1, P2]>,
  {},
  $.TypeSet<_std.$number, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.paramCardinality<P2>>>
>;
/**
 * Extract a specific element of input date by name.
 */
function date_get<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$local_date>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<_std.$str>>,
>(
  dt: P1,
  el: P2,
): date_getλFuncExpr<P1, P2>;
function date_get(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('cal::date_get', args, _.spec, [
    {args: [{typeId: "00000000-0000-0000-0000-00000000010c", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-000000000101", optional: false, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-0000000001ff"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "cal::date_get",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type duration_normalize_hoursλFuncExpr<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$relative_durationλICastableTo>>,
> = $.$expr_Function<
  "cal::duration_normalize_hours",
  _.castMaps.mapLiteralToTypeSet<[P1]>,
  {},
  $.TypeSet<$relative_duration, $.cardinalityUtil.paramCardinality<P1>>
>;
/**
 * Convert 24-hour chunks into days.
 */
function duration_normalize_hours<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$relative_durationλICastableTo>>,
>(
  dur: P1,
): duration_normalize_hoursλFuncExpr<P1>;
function duration_normalize_hours(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('cal::duration_normalize_hours', args, _.spec, [
    {args: [{typeId: "00000000-0000-0000-0000-000000000111", optional: false, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-000000000111"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "cal::duration_normalize_hours",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type duration_normalize_daysλFuncExpr<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$date_duration>>,
> = $.$expr_Function<
  "cal::duration_normalize_days",
  _.castMaps.mapLiteralToTypeSet<[P1]>,
  {},
  $.TypeSet<$date_duration, $.cardinalityUtil.paramCardinality<P1>>
>;
type duration_normalize_daysλFuncExpr2<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$relative_durationλICastableTo>>,
> = $.$expr_Function<
  "cal::duration_normalize_days",
  _.castMaps.mapLiteralToTypeSet<[P1]>,
  {},
  $.TypeSet<$relative_duration, $.cardinalityUtil.paramCardinality<P1>>
>;
/**
 * Convert 30-day chunks into months.
 */
function duration_normalize_days<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$date_duration>>,
>(
  dur: P1,
): duration_normalize_daysλFuncExpr<P1>;
/**
 * Convert 30-day chunks into months.
 */
function duration_normalize_days<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$relative_durationλICastableTo>>,
>(
  dur: P1,
): duration_normalize_daysλFuncExpr2<P1>;
function duration_normalize_days(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('cal::duration_normalize_days', args, _.spec, [
    {args: [{typeId: "00000000-0000-0000-0000-000000000112", optional: false, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-000000000112"},
    {args: [{typeId: "00000000-0000-0000-0000-000000000111", optional: false, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-000000000111"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "cal::duration_normalize_days",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};



export { date_duration, local_date, local_datetime, local_time, relative_duration };

type __defaultExports = {
  "date_duration": typeof date_duration;
  "local_date": typeof local_date;
  "local_datetime": typeof local_datetime;
  "local_time": typeof local_time;
  "relative_duration": typeof relative_duration;
  "to_local_datetime": typeof to_local_datetime;
  "to_local_date": typeof to_local_date;
  "to_local_time": typeof to_local_time;
  "to_relative_duration": typeof to_relative_duration;
  "to_date_duration": typeof to_date_duration;
  "time_get": typeof time_get;
  "date_get": typeof date_get;
  "duration_normalize_hours": typeof duration_normalize_hours;
  "duration_normalize_days": typeof duration_normalize_days
};
const __defaultExports: __defaultExports = {
  "date_duration": date_duration,
  "local_date": local_date,
  "local_datetime": local_datetime,
  "local_time": local_time,
  "relative_duration": relative_duration,
  "to_local_datetime": to_local_datetime,
  "to_local_date": to_local_date,
  "to_local_time": to_local_time,
  "to_relative_duration": to_relative_duration,
  "to_date_duration": to_date_duration,
  "time_get": time_get,
  "date_get": date_get,
  "duration_normalize_hours": duration_normalize_hours,
  "duration_normalize_days": duration_normalize_days
};
export default __defaultExports;
