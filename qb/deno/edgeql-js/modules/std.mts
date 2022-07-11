import { $ } from "edgedb";
import * as _ from "../imports.mjs";
import type * as _cal from "./cal.mjs";
import type * as _cfg from "./cfg.mjs";
import type * as _default from "./default.mjs";
import type * as _schema from "./schema.mjs";
type $anyscalar = $uuid | $str | $bytes | $bool | $datetime | _cal.$local_datetime | _cal.$local_date | _cal.$local_time | $duration | $json | _cal.$relative_duration | _cal.$date_duration | _cfg.$memory | $anypoint | $anyreal | $.EnumType;

type $anypoint = $anydiscrete | $anycontiguous;

type $anydiscrete = $number | _cal.$local_date;

type $anycontiguous = $decimal | $datetime | _cal.$local_datetime | $duration | $anyfloat;

type $anyreal = $anyint | $anyfloat | $anynumeric;

type $anyint = $number | $bigint;

export type $int64 = $.ScalarType<"std::number", number>;
const int64: $.scalarTypeWithConstructor<$number, string> = $.makeType<$.scalarTypeWithConstructor<$number, string>>(_.spec, "00000000-0000-0000-0000-000000000105", _.syntax.literal);

type $sequence = _default.$bag_seq | _default.$global_seq;

export type $str = $.ScalarType<"std::str", string>;
const str: $.scalarTypeWithConstructor<$str, never> = $.makeType<$.scalarTypeWithConstructor<$str, never>>(_.spec, "00000000-0000-0000-0000-000000000101", _.syntax.literal);

type $anyfloat = $number;

type $anynumeric = $decimal | $bigint;

export type $bigint = $.ScalarType<"std::bigint", bigint>;
const bigint: $.scalarTypeWithConstructor<$bigint, never> = $.makeType<$.scalarTypeWithConstructor<$bigint, never>>(_.spec, "00000000-0000-0000-0000-000000000110", _.syntax.literal);

export type $bool = $.ScalarType<"std::bool", boolean>;
const bool: $.scalarTypeWithConstructor<$bool, never> = $.makeType<$.scalarTypeWithConstructor<$bool, never>>(_.spec, "00000000-0000-0000-0000-000000000109", _.syntax.literal);

export type $bytes = $.ScalarType<"std::bytes", Buffer>;
const bytes: $.scalarTypeWithConstructor<$bytes, never> = $.makeType<$.scalarTypeWithConstructor<$bytes, never>>(_.spec, "00000000-0000-0000-0000-000000000102", _.syntax.literal);

export type $datetime = $.ScalarType<"std::datetime", Date>;
const datetime: $.scalarTypeWithConstructor<$datetime, never> = $.makeType<$.scalarTypeWithConstructor<$datetime, never>>(_.spec, "00000000-0000-0000-0000-00000000010a", _.syntax.literal);

export type $decimal = $.ScalarType<"std::decimal", unknown>;
const decimal: $.scalarTypeWithConstructor<$decimal, never> = $.makeType<$.scalarTypeWithConstructor<$decimal, never>>(_.spec, "00000000-0000-0000-0000-000000000108", _.syntax.literal);
export type $decimalλICastableTo = $decimal | $bigint;
export type $decimalλIAssignableBy = $decimal | $bigint;

export type $duration = $.ScalarType<"std::duration", _.edgedb.Duration>;
const duration: $.scalarTypeWithConstructor<$duration, never> = $.makeType<$.scalarTypeWithConstructor<$duration, never>>(_.spec, "00000000-0000-0000-0000-00000000010e", _.syntax.literal);

export type $float32 = $.ScalarType<"std::number", number>;
const float32: $.scalarTypeWithConstructor<$number, string> = $.makeType<$.scalarTypeWithConstructor<$number, string>>(_.spec, "00000000-0000-0000-0000-000000000106", _.syntax.literal);

export type $float64 = $.ScalarType<"std::number", number>;
const float64: $.scalarTypeWithConstructor<$number, string> = $.makeType<$.scalarTypeWithConstructor<$number, string>>(_.spec, "00000000-0000-0000-0000-000000000107", _.syntax.literal);

export type $int16 = $.ScalarType<"std::number", number>;
const int16: $.scalarTypeWithConstructor<$number, string> = $.makeType<$.scalarTypeWithConstructor<$number, string>>(_.spec, "00000000-0000-0000-0000-000000000103", _.syntax.literal);

export type $int32 = $.ScalarType<"std::number", number>;
const int32: $.scalarTypeWithConstructor<$number, string> = $.makeType<$.scalarTypeWithConstructor<$number, string>>(_.spec, "00000000-0000-0000-0000-000000000104", _.syntax.literal);

export type $json = $.ScalarType<"std::json", string>;
const json: $.scalarTypeWithConstructor<$json, any> = $.makeType<$.scalarTypeWithConstructor<$json, any>>(_.spec, "00000000-0000-0000-0000-00000000010f", _.syntax.literal);

export type $uuid = $.ScalarType<"std::uuid", string>;
const uuid: $.scalarTypeWithConstructor<$uuid, never> = $.makeType<$.scalarTypeWithConstructor<$uuid, never>>(_.spec, "00000000-0000-0000-0000-000000000100", _.syntax.literal);

export type $number = $.ScalarType<"std::number", number>;
const number: $.scalarTypeWithConstructor<$number, string> = $.makeType<$.scalarTypeWithConstructor<$number, string>>(_.spec, "00000000-0000-0000-0000-0000000001ff", _.syntax.literal);

export type $BaseObjectλShape = $.typeutil.flatten<{
  "id": $.PropertyDesc<$uuid, $.Cardinality.One, true, false, true, true>;
  "__type__": $.LinkDesc<_schema.$ObjectType, $.Cardinality.One, {}, false, false,  true, false>;
}>;
type $BaseObject = $.ObjectType<"std::BaseObject", $BaseObjectλShape, null>;
const $BaseObject = $.makeType<$BaseObject>(_.spec, "0a039a96-06d1-11ed-9f1e-e1d377f9ce5c", _.syntax.literal);

const BaseObject: $.$expr_PathNode<$.TypeSet<$BaseObject, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($BaseObject, $.Cardinality.Many), null, true);

export type $Object_0a07d6d806d111ed94d94589f54dfbc0λShape = $.typeutil.flatten<$BaseObjectλShape & {
}>;
type $Object_0a07d6d806d111ed94d94589f54dfbc0 = $.ObjectType<"std::Object", $Object_0a07d6d806d111ed94d94589f54dfbc0λShape, null>;
export type $Object = $Object_0a07d6d806d111ed94d94589f54dfbc0
const $Object_0a07d6d806d111ed94d94589f54dfbc0 = $.makeType<$Object_0a07d6d806d111ed94d94589f54dfbc0>(_.spec, "0a07d6d8-06d1-11ed-94d9-4589f54dfbc0", _.syntax.literal);

const Object_0a07d6d806d111ed94d94589f54dfbc0: $.$expr_PathNode<$.TypeSet<$Object_0a07d6d806d111ed94d94589f54dfbc0, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($Object_0a07d6d806d111ed94d94589f54dfbc0, $.Cardinality.Many), null, true);

export type $FreeObjectλShape = $.typeutil.flatten<$BaseObjectλShape & {
}>;
type $FreeObject = $.ObjectType<"std::FreeObject", $FreeObjectλShape, null>;
const $FreeObject = $.makeType<$FreeObject>(_.spec, "0a0cac26-06d1-11ed-a0c5-2f9892f5a512", _.syntax.literal);

const FreeObject: $.$expr_PathNode<$.TypeSet<$FreeObject, $.Cardinality.One>, null, true> = _.syntax.$PathNode($.$toSet($FreeObject, $.Cardinality.One), null, true);

type assert_singleλFuncExpr<
  NamedArgs extends {
    "message"?: _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
  },
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$.BaseType>>,
> = $.$expr_Function<
  "std::assert_single",
  _.castMaps.mapLiteralToTypeSet<[P1]>,
  _.castMaps.mapLiteralToTypeSet<NamedArgs>,
  $.TypeSet<$.getPrimitiveBaseType<_.castMaps.literalToTypeSet<P1>["__element__"]>, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.overrideUpperBound<$.cardinalityUtil.paramCardinality<P1>, "One">, $.cardinalityUtil.optionalParamCardinality<NamedArgs["message"]>>>
>;
type assert_singleλFuncExpr2<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$.BaseType>>,
> = $.$expr_Function<
  "std::assert_single",
  _.castMaps.mapLiteralToTypeSet<[P1]>,
  {},
  $.TypeSet<$.getPrimitiveBaseType<_.castMaps.literalToTypeSet<P1>["__element__"]>, $.cardinalityUtil.overrideUpperBound<$.cardinalityUtil.paramCardinality<P1>, "One">>
>;
/**
 * Check that the input set contains at most one element, raise
         CardinalityViolationError otherwise.
 */
function assert_single<
  NamedArgs extends {
    "message"?: _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
  },
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$.BaseType>>,
>(
  namedArgs: NamedArgs,
  input: P1,
): assert_singleλFuncExpr<NamedArgs, P1>;
/**
 * Check that the input set contains at most one element, raise
         CardinalityViolationError otherwise.
 */
function assert_single<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$.BaseType>>,
>(
  input: P1,
): assert_singleλFuncExpr2<P1>;
function assert_single(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('std::assert_single', args, _.spec, [
    {args: [{typeId: "00000000-0000-0000-0000-000000000001", optional: false, setoftype: true, variadic: false}], namedArgs: {"message": {typeId: "00000000-0000-0000-0000-000000000101", optional: true, setoftype: false, variadic: false}}, returnTypeId: "00000000-0000-0000-0000-000000000001", returnTypemod: "OptionalType", preservesOptionality: true},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "std::assert_single",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type assert_existsλFuncExpr<
  NamedArgs extends {
    "message"?: _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
  },
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$.BaseType>>,
> = $.$expr_Function<
  "std::assert_exists",
  _.castMaps.mapLiteralToTypeSet<[P1]>,
  _.castMaps.mapLiteralToTypeSet<NamedArgs>,
  $.TypeSet<$.getPrimitiveBaseType<_.castMaps.literalToTypeSet<P1>["__element__"]>, $.cardinalityUtil.overrideLowerBound<$.cardinalityUtil.paramCardinality<P1>, "One">>
>;
type assert_existsλFuncExpr2<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$.BaseType>>,
> = $.$expr_Function<
  "std::assert_exists",
  _.castMaps.mapLiteralToTypeSet<[P1]>,
  {},
  $.TypeSet<$.getPrimitiveBaseType<_.castMaps.literalToTypeSet<P1>["__element__"]>, $.cardinalityUtil.overrideLowerBound<$.cardinalityUtil.paramCardinality<P1>, "One">>
>;
/**
 * Check that the input set contains at least one element, raise
         CardinalityViolationError otherwise.
 */
function assert_exists<
  NamedArgs extends {
    "message"?: _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
  },
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$.BaseType>>,
>(
  namedArgs: NamedArgs,
  input: P1,
): assert_existsλFuncExpr<NamedArgs, P1>;
/**
 * Check that the input set contains at least one element, raise
         CardinalityViolationError otherwise.
 */
function assert_exists<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$.BaseType>>,
>(
  input: P1,
): assert_existsλFuncExpr2<P1>;
function assert_exists(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('std::assert_exists', args, _.spec, [
    {args: [{typeId: "00000000-0000-0000-0000-000000000001", optional: false, setoftype: true, variadic: false}], namedArgs: {"message": {typeId: "00000000-0000-0000-0000-000000000101", optional: true, setoftype: false, variadic: false}}, returnTypeId: "00000000-0000-0000-0000-000000000001", returnTypemod: "SetOfType"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "std::assert_exists",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type assert_distinctλFuncExpr<
  NamedArgs extends {
    "message"?: _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
  },
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$.BaseType>>,
> = $.$expr_Function<
  "std::assert_distinct",
  _.castMaps.mapLiteralToTypeSet<[P1]>,
  _.castMaps.mapLiteralToTypeSet<NamedArgs>,
  $.TypeSet<$.getPrimitiveBaseType<_.castMaps.literalToTypeSet<P1>["__element__"]>, $.Cardinality.Many>
>;
type assert_distinctλFuncExpr2<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$.BaseType>>,
> = $.$expr_Function<
  "std::assert_distinct",
  _.castMaps.mapLiteralToTypeSet<[P1]>,
  {},
  $.TypeSet<$.getPrimitiveBaseType<_.castMaps.literalToTypeSet<P1>["__element__"]>, $.Cardinality.Many>
>;
/**
 * Check that the input set is a proper set, i.e. all elements
         are unique
 */
function assert_distinct<
  NamedArgs extends {
    "message"?: _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
  },
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$.BaseType>>,
>(
  namedArgs: NamedArgs,
  input: P1,
): assert_distinctλFuncExpr<NamedArgs, P1>;
/**
 * Check that the input set is a proper set, i.e. all elements
         are unique
 */
function assert_distinct<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$.BaseType>>,
>(
  input: P1,
): assert_distinctλFuncExpr2<P1>;
function assert_distinct(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('std::assert_distinct', args, _.spec, [
    {args: [{typeId: "00000000-0000-0000-0000-000000000001", optional: false, setoftype: true, variadic: false}], namedArgs: {"message": {typeId: "00000000-0000-0000-0000-000000000101", optional: true, setoftype: false, variadic: false}}, returnTypeId: "00000000-0000-0000-0000-000000000001", returnTypemod: "SetOfType", preservesOptionality: true},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "std::assert_distinct",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type lenλFuncExpr<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
> = $.$expr_Function<
  "std::len",
  _.castMaps.mapLiteralToTypeSet<[P1]>,
  {},
  $.TypeSet<$number, $.cardinalityUtil.paramCardinality<P1>>
>;
type lenλFuncExpr2<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$bytes>>,
> = $.$expr_Function<
  "std::len",
  _.castMaps.mapLiteralToTypeSet<[P1]>,
  {},
  $.TypeSet<$number, $.cardinalityUtil.paramCardinality<P1>>
>;
type lenλFuncExpr3<
  P1 extends $.TypeSet<$.ArrayType<$.NonArrayType>>,
> = $.$expr_Function<
  "std::len",
  [P1],
  {},
  $.TypeSet<$number, $.cardinalityUtil.paramCardinality<P1>>
>;
/**
 * A polymorphic function to calculate a "length" of its first argument.
 */
function len<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
>(
  str: P1,
): lenλFuncExpr<P1>;
/**
 * A polymorphic function to calculate a "length" of its first argument.
 */
function len<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$bytes>>,
>(
  bytes: P1,
): lenλFuncExpr2<P1>;
/**
 * A polymorphic function to calculate a "length" of its first argument.
 */
function len<
  P1 extends $.TypeSet<$.ArrayType<$.NonArrayType>>,
>(
  array: P1,
): lenλFuncExpr3<P1>;
function len(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('std::len', args, _.spec, [
    {args: [{typeId: "00000000-0000-0000-0000-000000000101", optional: false, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-0000000001ff"},
    {args: [{typeId: "00000000-0000-0000-0000-000000000102", optional: false, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-0000000001ff"},
    {args: [{typeId: "5d31584b-3a5f-533d-3d64-fab0fdab61b3", optional: false, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-0000000001ff"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "std::len",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type sumλFuncExpr<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$bigint>>,
> = $.$expr_Function<
  "std::sum",
  _.castMaps.mapLiteralToTypeSet<[P1]>,
  {},
  $.TypeSet<$bigint, $.Cardinality.One>
>;
type sumλFuncExpr2<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
> = $.$expr_Function<
  "std::sum",
  _.castMaps.mapLiteralToTypeSet<[P1]>,
  {},
  $.TypeSet<$number, $.Cardinality.One>
>;
type sumλFuncExpr3<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$decimalλICastableTo>>,
> = $.$expr_Function<
  "std::sum",
  _.castMaps.mapLiteralToTypeSet<[P1]>,
  {},
  $.TypeSet<$decimal, $.Cardinality.One>
>;
/**
 * Return the sum of the set of numbers.
 */
function sum<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$bigint>>,
>(
  s: P1,
): sumλFuncExpr<P1>;
/**
 * Return the sum of the set of numbers.
 */
function sum<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
>(
  s: P1,
): sumλFuncExpr2<P1>;
/**
 * Return the sum of the set of numbers.
 */
function sum<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$decimalλICastableTo>>,
>(
  s: P1,
): sumλFuncExpr3<P1>;
function sum(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('std::sum', args, _.spec, [
    {args: [{typeId: "00000000-0000-0000-0000-000000000110", optional: false, setoftype: true, variadic: false}], returnTypeId: "00000000-0000-0000-0000-000000000110"},
    {args: [{typeId: "00000000-0000-0000-0000-0000000001ff", optional: false, setoftype: true, variadic: false}], returnTypeId: "00000000-0000-0000-0000-0000000001ff"},
    {args: [{typeId: "00000000-0000-0000-0000-000000000108", optional: false, setoftype: true, variadic: false}], returnTypeId: "00000000-0000-0000-0000-000000000108"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "std::sum",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type countλFuncExpr<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$.BaseType>>,
> = $.$expr_Function<
  "std::count",
  _.castMaps.mapLiteralToTypeSet<[P1]>,
  {},
  $.TypeSet<$number, $.Cardinality.One>
>;
/**
 * Return the number of elements in a set.
 */
function count<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$.BaseType>>,
>(
  s: P1,
): countλFuncExpr<P1>;
function count(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('std::count', args, _.spec, [
    {args: [{typeId: "00000000-0000-0000-0000-000000000001", optional: false, setoftype: true, variadic: false}], returnTypeId: "00000000-0000-0000-0000-0000000001ff"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "std::count",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type randomλFuncExpr = $.$expr_Function<
  "std::random",
  [],
  {},
  $.TypeSet<$number, $.Cardinality.One>
>;
/**
 * Return a pseudo-random number in the range `0.0 <= x < 1.0`
 */
function random(): randomλFuncExpr;
function random(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('std::random', args, _.spec, [
    {args: [], returnTypeId: "00000000-0000-0000-0000-0000000001ff"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "std::random",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type minλFuncExpr<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$anyreal>>,
> = $.$expr_Function<
  "std::min",
  _.castMaps.mapLiteralToTypeSet<[P1]>,
  {},
  $.TypeSet<$anyreal, $.cardinalityUtil.overrideUpperBound<$.cardinalityUtil.paramCardinality<P1>, "One">>
>;
type minλFuncExpr2<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$.EnumType>>,
> = $.$expr_Function<
  "std::min",
  _.castMaps.mapLiteralToTypeSet<[P1]>,
  {},
  $.TypeSet<$.EnumType, $.cardinalityUtil.overrideUpperBound<$.cardinalityUtil.paramCardinality<P1>, "One">>
>;
type minλFuncExpr3<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
> = $.$expr_Function<
  "std::min",
  _.castMaps.mapLiteralToTypeSet<[P1]>,
  {},
  $.TypeSet<$str, $.cardinalityUtil.overrideUpperBound<$.cardinalityUtil.paramCardinality<P1>, "One">>
>;
type minλFuncExpr4<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$datetime>>,
> = $.$expr_Function<
  "std::min",
  _.castMaps.mapLiteralToTypeSet<[P1]>,
  {},
  $.TypeSet<$datetime, $.cardinalityUtil.overrideUpperBound<$.cardinalityUtil.paramCardinality<P1>, "One">>
>;
type minλFuncExpr5<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$duration>>,
> = $.$expr_Function<
  "std::min",
  _.castMaps.mapLiteralToTypeSet<[P1]>,
  {},
  $.TypeSet<$duration, $.cardinalityUtil.overrideUpperBound<$.cardinalityUtil.paramCardinality<P1>, "One">>
>;
type minλFuncExpr6<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<_cal.$local_date>>,
> = $.$expr_Function<
  "std::min",
  _.castMaps.mapLiteralToTypeSet<[P1]>,
  {},
  $.TypeSet<_cal.$local_date, $.cardinalityUtil.overrideUpperBound<$.cardinalityUtil.paramCardinality<P1>, "One">>
>;
type minλFuncExpr7<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<_cal.$local_time>>,
> = $.$expr_Function<
  "std::min",
  _.castMaps.mapLiteralToTypeSet<[P1]>,
  {},
  $.TypeSet<_cal.$local_time, $.cardinalityUtil.overrideUpperBound<$.cardinalityUtil.paramCardinality<P1>, "One">>
>;
type minλFuncExpr8<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<_cal.$date_duration>>,
> = $.$expr_Function<
  "std::min",
  _.castMaps.mapLiteralToTypeSet<[P1]>,
  {},
  $.TypeSet<_cal.$date_duration, $.cardinalityUtil.overrideUpperBound<$.cardinalityUtil.paramCardinality<P1>, "One">>
>;
type minλFuncExpr9<
  P1 extends $.TypeSet<$.ArrayType<_cal.$local_datetimeλICastableTo>>,
> = $.$expr_Function<
  "std::min",
  [P1],
  {},
  $.TypeSet<$.ArrayType<_cal.$local_datetime>, $.cardinalityUtil.overrideUpperBound<$.cardinalityUtil.paramCardinality<P1>, "One">>
>;
type minλFuncExpr10<
  P1 extends $.TypeSet<$.ArrayType<_cal.$local_date>>,
> = $.$expr_Function<
  "std::min",
  [P1],
  {},
  $.TypeSet<$.ArrayType<_cal.$local_date>, $.cardinalityUtil.overrideUpperBound<$.cardinalityUtil.paramCardinality<P1>, "One">>
>;
type minλFuncExpr11<
  P1 extends $.TypeSet<$.ArrayType<_cal.$local_time>>,
> = $.$expr_Function<
  "std::min",
  [P1],
  {},
  $.TypeSet<$.ArrayType<_cal.$local_time>, $.cardinalityUtil.overrideUpperBound<$.cardinalityUtil.paramCardinality<P1>, "One">>
>;
type minλFuncExpr12<
  P1 extends $.TypeSet<$.ArrayType<_cal.$relative_durationλICastableTo>>,
> = $.$expr_Function<
  "std::min",
  [P1],
  {},
  $.TypeSet<$.ArrayType<_cal.$relative_duration>, $.cardinalityUtil.overrideUpperBound<$.cardinalityUtil.paramCardinality<P1>, "One">>
>;
type minλFuncExpr13<
  P1 extends $.TypeSet<$.ArrayType<_cal.$date_duration>>,
> = $.$expr_Function<
  "std::min",
  [P1],
  {},
  $.TypeSet<$.ArrayType<_cal.$date_duration>, $.cardinalityUtil.overrideUpperBound<$.cardinalityUtil.paramCardinality<P1>, "One">>
>;
type minλFuncExpr14<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<_cal.$local_datetimeλICastableTo>>,
> = $.$expr_Function<
  "std::min",
  _.castMaps.mapLiteralToTypeSet<[P1]>,
  {},
  $.TypeSet<_cal.$local_datetime, $.cardinalityUtil.overrideUpperBound<$.cardinalityUtil.paramCardinality<P1>, "One">>
>;
type minλFuncExpr15<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<_cal.$relative_durationλICastableTo>>,
> = $.$expr_Function<
  "std::min",
  _.castMaps.mapLiteralToTypeSet<[P1]>,
  {},
  $.TypeSet<_cal.$relative_duration, $.cardinalityUtil.overrideUpperBound<$.cardinalityUtil.paramCardinality<P1>, "One">>
>;
type minλFuncExpr16<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$.BaseType>>,
> = $.$expr_Function<
  "std::min",
  _.castMaps.mapLiteralToTypeSet<[P1]>,
  {},
  $.TypeSet<$.getPrimitiveBaseType<_.castMaps.literalToTypeSet<P1>["__element__"]>, $.cardinalityUtil.overrideUpperBound<$.cardinalityUtil.paramCardinality<P1>, "One">>
>;
/**
 * Return the smallest value of the input set.
 */
function min<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$anyreal>>,
>(
  vals: P1,
): minλFuncExpr<P1>;
/**
 * Return the smallest value of the input set.
 */
function min<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$.EnumType>>,
>(
  vals: P1,
): minλFuncExpr2<P1>;
/**
 * Return the smallest value of the input set.
 */
function min<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
>(
  vals: P1,
): minλFuncExpr3<P1>;
/**
 * Return the smallest value of the input set.
 */
function min<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$datetime>>,
>(
  vals: P1,
): minλFuncExpr4<P1>;
/**
 * Return the smallest value of the input set.
 */
function min<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$duration>>,
>(
  vals: P1,
): minλFuncExpr5<P1>;
/**
 * Return the smallest value of the input set.
 */
function min<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<_cal.$local_date>>,
>(
  vals: P1,
): minλFuncExpr6<P1>;
/**
 * Return the smallest value of the input set.
 */
function min<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<_cal.$local_time>>,
>(
  vals: P1,
): minλFuncExpr7<P1>;
/**
 * Return the smallest value of the input set.
 */
function min<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<_cal.$date_duration>>,
>(
  vals: P1,
): minλFuncExpr8<P1>;
/**
 * Return the smallest value of the input set.
 */
function min<
  P1 extends $.TypeSet<$.ArrayType<_cal.$local_datetimeλICastableTo>>,
>(
  vals: P1,
): minλFuncExpr9<P1>;
/**
 * Return the smallest value of the input set.
 */
function min<
  P1 extends $.TypeSet<$.ArrayType<_cal.$local_date>>,
>(
  vals: P1,
): minλFuncExpr10<P1>;
/**
 * Return the smallest value of the input set.
 */
function min<
  P1 extends $.TypeSet<$.ArrayType<_cal.$local_time>>,
>(
  vals: P1,
): minλFuncExpr11<P1>;
/**
 * Return the smallest value of the input set.
 */
function min<
  P1 extends $.TypeSet<$.ArrayType<_cal.$relative_durationλICastableTo>>,
>(
  vals: P1,
): minλFuncExpr12<P1>;
/**
 * Return the smallest value of the input set.
 */
function min<
  P1 extends $.TypeSet<$.ArrayType<_cal.$date_duration>>,
>(
  vals: P1,
): minλFuncExpr13<P1>;
/**
 * Return the smallest value of the input set.
 */
function min<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<_cal.$local_datetimeλICastableTo>>,
>(
  vals: P1,
): minλFuncExpr14<P1>;
/**
 * Return the smallest value of the input set.
 */
function min<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<_cal.$relative_durationλICastableTo>>,
>(
  vals: P1,
): minλFuncExpr15<P1>;
/**
 * Return the smallest value of the input set.
 */
function min<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$.BaseType>>,
>(
  vals: P1,
): minλFuncExpr16<P1>;
function min(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('std::min', args, _.spec, [
    {args: [{typeId: "0493821a-06d1-11ed-ba6d-796161c15188", optional: false, setoftype: true, variadic: false}], returnTypeId: "0493821a-06d1-11ed-ba6d-796161c15188", returnTypemod: "OptionalType", preservesOptionality: true},
    {args: [{typeId: "04997b02-06d1-11ed-a689-41fea57b90a5", optional: false, setoftype: true, variadic: false}], returnTypeId: "04997b02-06d1-11ed-a689-41fea57b90a5", returnTypemod: "OptionalType", preservesOptionality: true},
    {args: [{typeId: "00000000-0000-0000-0000-000000000101", optional: false, setoftype: true, variadic: false}], returnTypeId: "00000000-0000-0000-0000-000000000101", returnTypemod: "OptionalType", preservesOptionality: true},
    {args: [{typeId: "00000000-0000-0000-0000-00000000010a", optional: false, setoftype: true, variadic: false}], returnTypeId: "00000000-0000-0000-0000-00000000010a", returnTypemod: "OptionalType", preservesOptionality: true},
    {args: [{typeId: "00000000-0000-0000-0000-00000000010e", optional: false, setoftype: true, variadic: false}], returnTypeId: "00000000-0000-0000-0000-00000000010e", returnTypemod: "OptionalType", preservesOptionality: true},
    {args: [{typeId: "00000000-0000-0000-0000-00000000010c", optional: false, setoftype: true, variadic: false}], returnTypeId: "00000000-0000-0000-0000-00000000010c", returnTypemod: "OptionalType", preservesOptionality: true},
    {args: [{typeId: "00000000-0000-0000-0000-00000000010d", optional: false, setoftype: true, variadic: false}], returnTypeId: "00000000-0000-0000-0000-00000000010d", returnTypemod: "OptionalType", preservesOptionality: true},
    {args: [{typeId: "00000000-0000-0000-0000-000000000112", optional: false, setoftype: true, variadic: false}], returnTypeId: "00000000-0000-0000-0000-000000000112", returnTypemod: "OptionalType", preservesOptionality: true},
    {args: [{typeId: "44a76fab-349d-00e9-396b-1000d7e967da", optional: false, setoftype: true, variadic: false}], returnTypeId: "44a76fab-349d-00e9-396b-1000d7e967da", returnTypemod: "OptionalType", preservesOptionality: true},
    {args: [{typeId: "076e1d6f-f104-88b2-0632-d53171d9c827", optional: false, setoftype: true, variadic: false}], returnTypeId: "076e1d6f-f104-88b2-0632-d53171d9c827", returnTypemod: "OptionalType", preservesOptionality: true},
    {args: [{typeId: "82ea7b30-73d3-c79c-86fb-b253f194f53e", optional: false, setoftype: true, variadic: false}], returnTypeId: "82ea7b30-73d3-c79c-86fb-b253f194f53e", returnTypemod: "OptionalType", preservesOptionality: true},
    {args: [{typeId: "63acbf06-4c0c-67ac-c508-50a5ef4f4b16", optional: false, setoftype: true, variadic: false}], returnTypeId: "63acbf06-4c0c-67ac-c508-50a5ef4f4b16", returnTypemod: "OptionalType", preservesOptionality: true},
    {args: [{typeId: "6b937ab8-47dc-95f9-8213-dc2fd50cd7fe", optional: false, setoftype: true, variadic: false}], returnTypeId: "6b937ab8-47dc-95f9-8213-dc2fd50cd7fe", returnTypemod: "OptionalType", preservesOptionality: true},
    {args: [{typeId: "00000000-0000-0000-0000-00000000010b", optional: false, setoftype: true, variadic: false}], returnTypeId: "00000000-0000-0000-0000-00000000010b", returnTypemod: "OptionalType", preservesOptionality: true},
    {args: [{typeId: "00000000-0000-0000-0000-000000000111", optional: false, setoftype: true, variadic: false}], returnTypeId: "00000000-0000-0000-0000-000000000111", returnTypemod: "OptionalType", preservesOptionality: true},
    {args: [{typeId: "00000000-0000-0000-0000-000000000001", optional: false, setoftype: true, variadic: false}], returnTypeId: "00000000-0000-0000-0000-000000000001", returnTypemod: "OptionalType", preservesOptionality: true},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "std::min",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type maxλFuncExpr<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$anyreal>>,
> = $.$expr_Function<
  "std::max",
  _.castMaps.mapLiteralToTypeSet<[P1]>,
  {},
  $.TypeSet<$anyreal, $.cardinalityUtil.overrideUpperBound<$.cardinalityUtil.paramCardinality<P1>, "One">>
>;
type maxλFuncExpr2<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$.EnumType>>,
> = $.$expr_Function<
  "std::max",
  _.castMaps.mapLiteralToTypeSet<[P1]>,
  {},
  $.TypeSet<$.EnumType, $.cardinalityUtil.overrideUpperBound<$.cardinalityUtil.paramCardinality<P1>, "One">>
>;
type maxλFuncExpr3<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
> = $.$expr_Function<
  "std::max",
  _.castMaps.mapLiteralToTypeSet<[P1]>,
  {},
  $.TypeSet<$str, $.cardinalityUtil.overrideUpperBound<$.cardinalityUtil.paramCardinality<P1>, "One">>
>;
type maxλFuncExpr4<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$datetime>>,
> = $.$expr_Function<
  "std::max",
  _.castMaps.mapLiteralToTypeSet<[P1]>,
  {},
  $.TypeSet<$datetime, $.cardinalityUtil.overrideUpperBound<$.cardinalityUtil.paramCardinality<P1>, "One">>
>;
type maxλFuncExpr5<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$duration>>,
> = $.$expr_Function<
  "std::max",
  _.castMaps.mapLiteralToTypeSet<[P1]>,
  {},
  $.TypeSet<$duration, $.cardinalityUtil.overrideUpperBound<$.cardinalityUtil.paramCardinality<P1>, "One">>
>;
type maxλFuncExpr6<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<_cal.$local_date>>,
> = $.$expr_Function<
  "std::max",
  _.castMaps.mapLiteralToTypeSet<[P1]>,
  {},
  $.TypeSet<_cal.$local_date, $.cardinalityUtil.overrideUpperBound<$.cardinalityUtil.paramCardinality<P1>, "One">>
>;
type maxλFuncExpr7<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<_cal.$local_time>>,
> = $.$expr_Function<
  "std::max",
  _.castMaps.mapLiteralToTypeSet<[P1]>,
  {},
  $.TypeSet<_cal.$local_time, $.cardinalityUtil.overrideUpperBound<$.cardinalityUtil.paramCardinality<P1>, "One">>
>;
type maxλFuncExpr8<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<_cal.$date_duration>>,
> = $.$expr_Function<
  "std::max",
  _.castMaps.mapLiteralToTypeSet<[P1]>,
  {},
  $.TypeSet<_cal.$date_duration, $.cardinalityUtil.overrideUpperBound<$.cardinalityUtil.paramCardinality<P1>, "One">>
>;
type maxλFuncExpr9<
  P1 extends $.TypeSet<$.ArrayType<_cal.$local_datetimeλICastableTo>>,
> = $.$expr_Function<
  "std::max",
  [P1],
  {},
  $.TypeSet<$.ArrayType<_cal.$local_datetime>, $.cardinalityUtil.overrideUpperBound<$.cardinalityUtil.paramCardinality<P1>, "One">>
>;
type maxλFuncExpr10<
  P1 extends $.TypeSet<$.ArrayType<_cal.$local_date>>,
> = $.$expr_Function<
  "std::max",
  [P1],
  {},
  $.TypeSet<$.ArrayType<_cal.$local_date>, $.cardinalityUtil.overrideUpperBound<$.cardinalityUtil.paramCardinality<P1>, "One">>
>;
type maxλFuncExpr11<
  P1 extends $.TypeSet<$.ArrayType<_cal.$local_time>>,
> = $.$expr_Function<
  "std::max",
  [P1],
  {},
  $.TypeSet<$.ArrayType<_cal.$local_time>, $.cardinalityUtil.overrideUpperBound<$.cardinalityUtil.paramCardinality<P1>, "One">>
>;
type maxλFuncExpr12<
  P1 extends $.TypeSet<$.ArrayType<_cal.$relative_durationλICastableTo>>,
> = $.$expr_Function<
  "std::max",
  [P1],
  {},
  $.TypeSet<$.ArrayType<_cal.$relative_duration>, $.cardinalityUtil.overrideUpperBound<$.cardinalityUtil.paramCardinality<P1>, "One">>
>;
type maxλFuncExpr13<
  P1 extends $.TypeSet<$.ArrayType<_cal.$date_duration>>,
> = $.$expr_Function<
  "std::max",
  [P1],
  {},
  $.TypeSet<$.ArrayType<_cal.$date_duration>, $.cardinalityUtil.overrideUpperBound<$.cardinalityUtil.paramCardinality<P1>, "One">>
>;
type maxλFuncExpr14<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<_cal.$local_datetimeλICastableTo>>,
> = $.$expr_Function<
  "std::max",
  _.castMaps.mapLiteralToTypeSet<[P1]>,
  {},
  $.TypeSet<_cal.$local_datetime, $.cardinalityUtil.overrideUpperBound<$.cardinalityUtil.paramCardinality<P1>, "One">>
>;
type maxλFuncExpr15<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<_cal.$relative_durationλICastableTo>>,
> = $.$expr_Function<
  "std::max",
  _.castMaps.mapLiteralToTypeSet<[P1]>,
  {},
  $.TypeSet<_cal.$relative_duration, $.cardinalityUtil.overrideUpperBound<$.cardinalityUtil.paramCardinality<P1>, "One">>
>;
type maxλFuncExpr16<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$.BaseType>>,
> = $.$expr_Function<
  "std::max",
  _.castMaps.mapLiteralToTypeSet<[P1]>,
  {},
  $.TypeSet<$.getPrimitiveBaseType<_.castMaps.literalToTypeSet<P1>["__element__"]>, $.cardinalityUtil.overrideUpperBound<$.cardinalityUtil.paramCardinality<P1>, "One">>
>;
/**
 * Return the greatest value of the input set.
 */
function max<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$anyreal>>,
>(
  vals: P1,
): maxλFuncExpr<P1>;
/**
 * Return the greatest value of the input set.
 */
function max<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$.EnumType>>,
>(
  vals: P1,
): maxλFuncExpr2<P1>;
/**
 * Return the greatest value of the input set.
 */
function max<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
>(
  vals: P1,
): maxλFuncExpr3<P1>;
/**
 * Return the greatest value of the input set.
 */
function max<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$datetime>>,
>(
  vals: P1,
): maxλFuncExpr4<P1>;
/**
 * Return the greatest value of the input set.
 */
function max<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$duration>>,
>(
  vals: P1,
): maxλFuncExpr5<P1>;
/**
 * Return the smallest value of the input set.
 */
function max<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<_cal.$local_date>>,
>(
  vals: P1,
): maxλFuncExpr6<P1>;
/**
 * Return the smallest value of the input set.
 */
function max<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<_cal.$local_time>>,
>(
  vals: P1,
): maxλFuncExpr7<P1>;
/**
 * Return the greatest value of the input set.
 */
function max<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<_cal.$date_duration>>,
>(
  vals: P1,
): maxλFuncExpr8<P1>;
/**
 * Return the smallest value of the input set.
 */
function max<
  P1 extends $.TypeSet<$.ArrayType<_cal.$local_datetimeλICastableTo>>,
>(
  vals: P1,
): maxλFuncExpr9<P1>;
/**
 * Return the smallest value of the input set.
 */
function max<
  P1 extends $.TypeSet<$.ArrayType<_cal.$local_date>>,
>(
  vals: P1,
): maxλFuncExpr10<P1>;
/**
 * Return the smallest value of the input set.
 */
function max<
  P1 extends $.TypeSet<$.ArrayType<_cal.$local_time>>,
>(
  vals: P1,
): maxλFuncExpr11<P1>;
/**
 * Return the smallest value of the input set.
 */
function max<
  P1 extends $.TypeSet<$.ArrayType<_cal.$relative_durationλICastableTo>>,
>(
  vals: P1,
): maxλFuncExpr12<P1>;
/**
 * Return the smallest value of the input set.
 */
function max<
  P1 extends $.TypeSet<$.ArrayType<_cal.$date_duration>>,
>(
  vals: P1,
): maxλFuncExpr13<P1>;
/**
 * Return the smallest value of the input set.
 */
function max<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<_cal.$local_datetimeλICastableTo>>,
>(
  vals: P1,
): maxλFuncExpr14<P1>;
/**
 * Return the greatest value of the input set.
 */
function max<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<_cal.$relative_durationλICastableTo>>,
>(
  vals: P1,
): maxλFuncExpr15<P1>;
/**
 * Return the greatest value of the input set.
 */
function max<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$.BaseType>>,
>(
  vals: P1,
): maxλFuncExpr16<P1>;
function max(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('std::max', args, _.spec, [
    {args: [{typeId: "0493821a-06d1-11ed-ba6d-796161c15188", optional: false, setoftype: true, variadic: false}], returnTypeId: "0493821a-06d1-11ed-ba6d-796161c15188", returnTypemod: "OptionalType", preservesOptionality: true},
    {args: [{typeId: "04997b02-06d1-11ed-a689-41fea57b90a5", optional: false, setoftype: true, variadic: false}], returnTypeId: "04997b02-06d1-11ed-a689-41fea57b90a5", returnTypemod: "OptionalType", preservesOptionality: true},
    {args: [{typeId: "00000000-0000-0000-0000-000000000101", optional: false, setoftype: true, variadic: false}], returnTypeId: "00000000-0000-0000-0000-000000000101", returnTypemod: "OptionalType", preservesOptionality: true},
    {args: [{typeId: "00000000-0000-0000-0000-00000000010a", optional: false, setoftype: true, variadic: false}], returnTypeId: "00000000-0000-0000-0000-00000000010a", returnTypemod: "OptionalType", preservesOptionality: true},
    {args: [{typeId: "00000000-0000-0000-0000-00000000010e", optional: false, setoftype: true, variadic: false}], returnTypeId: "00000000-0000-0000-0000-00000000010e", returnTypemod: "OptionalType", preservesOptionality: true},
    {args: [{typeId: "00000000-0000-0000-0000-00000000010c", optional: false, setoftype: true, variadic: false}], returnTypeId: "00000000-0000-0000-0000-00000000010c", returnTypemod: "OptionalType", preservesOptionality: true},
    {args: [{typeId: "00000000-0000-0000-0000-00000000010d", optional: false, setoftype: true, variadic: false}], returnTypeId: "00000000-0000-0000-0000-00000000010d", returnTypemod: "OptionalType", preservesOptionality: true},
    {args: [{typeId: "00000000-0000-0000-0000-000000000112", optional: false, setoftype: true, variadic: false}], returnTypeId: "00000000-0000-0000-0000-000000000112", returnTypemod: "OptionalType", preservesOptionality: true},
    {args: [{typeId: "44a76fab-349d-00e9-396b-1000d7e967da", optional: false, setoftype: true, variadic: false}], returnTypeId: "44a76fab-349d-00e9-396b-1000d7e967da", returnTypemod: "OptionalType", preservesOptionality: true},
    {args: [{typeId: "076e1d6f-f104-88b2-0632-d53171d9c827", optional: false, setoftype: true, variadic: false}], returnTypeId: "076e1d6f-f104-88b2-0632-d53171d9c827", returnTypemod: "OptionalType", preservesOptionality: true},
    {args: [{typeId: "82ea7b30-73d3-c79c-86fb-b253f194f53e", optional: false, setoftype: true, variadic: false}], returnTypeId: "82ea7b30-73d3-c79c-86fb-b253f194f53e", returnTypemod: "OptionalType", preservesOptionality: true},
    {args: [{typeId: "63acbf06-4c0c-67ac-c508-50a5ef4f4b16", optional: false, setoftype: true, variadic: false}], returnTypeId: "63acbf06-4c0c-67ac-c508-50a5ef4f4b16", returnTypemod: "OptionalType", preservesOptionality: true},
    {args: [{typeId: "6b937ab8-47dc-95f9-8213-dc2fd50cd7fe", optional: false, setoftype: true, variadic: false}], returnTypeId: "6b937ab8-47dc-95f9-8213-dc2fd50cd7fe", returnTypemod: "OptionalType", preservesOptionality: true},
    {args: [{typeId: "00000000-0000-0000-0000-00000000010b", optional: false, setoftype: true, variadic: false}], returnTypeId: "00000000-0000-0000-0000-00000000010b", returnTypemod: "OptionalType", preservesOptionality: true},
    {args: [{typeId: "00000000-0000-0000-0000-000000000111", optional: false, setoftype: true, variadic: false}], returnTypeId: "00000000-0000-0000-0000-000000000111", returnTypemod: "OptionalType", preservesOptionality: true},
    {args: [{typeId: "00000000-0000-0000-0000-000000000001", optional: false, setoftype: true, variadic: false}], returnTypeId: "00000000-0000-0000-0000-000000000001", returnTypemod: "OptionalType", preservesOptionality: true},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "std::max",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type allλFuncExpr<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$bool>>,
> = $.$expr_Function<
  "std::all",
  _.castMaps.mapLiteralToTypeSet<[P1]>,
  {},
  $.TypeSet<$bool, $.Cardinality.One>
>;
/**
 * Generalized boolean `AND` applied to the set of *values*.
 */
function all<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$bool>>,
>(
  vals: P1,
): allλFuncExpr<P1>;
function all(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('std::all', args, _.spec, [
    {args: [{typeId: "00000000-0000-0000-0000-000000000109", optional: false, setoftype: true, variadic: false}], returnTypeId: "00000000-0000-0000-0000-000000000109"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "std::all",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type anyλFuncExpr<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$bool>>,
> = $.$expr_Function<
  "std::any",
  _.castMaps.mapLiteralToTypeSet<[P1]>,
  {},
  $.TypeSet<$bool, $.Cardinality.One>
>;
/**
 * Generalized boolean `OR` applied to the set of *values*.
 */
function any<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$bool>>,
>(
  vals: P1,
): anyλFuncExpr<P1>;
function any(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('std::any', args, _.spec, [
    {args: [{typeId: "00000000-0000-0000-0000-000000000109", optional: false, setoftype: true, variadic: false}], returnTypeId: "00000000-0000-0000-0000-000000000109"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "std::any",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type enumerateλFuncExpr<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$.BaseType>>,
> = $.$expr_Function<
  "std::enumerate",
  _.castMaps.mapLiteralToTypeSet<[P1]>,
  {},
  $.TypeSet<$.TupleType<[$int64, $.getPrimitiveBaseType<_.castMaps.literalToTypeSet<P1>["__element__"]>]>, $.Cardinality.Many>
>;
/**
 * Return a set of tuples of the form `(index, element)`.
 */
function enumerate<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$.BaseType>>,
>(
  vals: P1,
): enumerateλFuncExpr<P1>;
function enumerate(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('std::enumerate', args, _.spec, [
    {args: [{typeId: "00000000-0000-0000-0000-000000000001", optional: false, setoftype: true, variadic: false}], returnTypeId: "9c27acd9-0932-6050-c7b0-c7410e2e0a85", returnTypemod: "SetOfType", preservesOptionality: true},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "std::enumerate",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type roundλFuncExpr<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
> = $.$expr_Function<
  "std::round",
  _.castMaps.mapLiteralToTypeSet<[P1]>,
  {},
  $.TypeSet<$number, $.cardinalityUtil.paramCardinality<P1>>
>;
type roundλFuncExpr2<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$bigint>>,
> = $.$expr_Function<
  "std::round",
  _.castMaps.mapLiteralToTypeSet<[P1]>,
  {},
  $.TypeSet<$bigint, $.cardinalityUtil.paramCardinality<P1>>
>;
type roundλFuncExpr3<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$decimalλICastableTo>>,
> = $.$expr_Function<
  "std::round",
  _.castMaps.mapLiteralToTypeSet<[P1]>,
  {},
  $.TypeSet<$decimal, $.cardinalityUtil.paramCardinality<P1>>
>;
type roundλFuncExpr4<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$decimalλICastableTo>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
> = $.$expr_Function<
  "std::round",
  _.castMaps.mapLiteralToTypeSet<[P1, P2]>,
  {},
  $.TypeSet<$decimal, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.paramCardinality<P2>>>
>;
/**
 * Round to the nearest value.
 */
function round<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
>(
  val: P1,
): roundλFuncExpr<P1>;
/**
 * Round to the nearest value.
 */
function round<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$bigint>>,
>(
  val: P1,
): roundλFuncExpr2<P1>;
/**
 * Round to the nearest value.
 */
function round<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$decimalλICastableTo>>,
>(
  val: P1,
): roundλFuncExpr3<P1>;
/**
 * Round to the nearest value.
 */
function round<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$decimalλICastableTo>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
>(
  val: P1,
  d: P2,
): roundλFuncExpr4<P1, P2>;
function round(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('std::round', args, _.spec, [
    {args: [{typeId: "00000000-0000-0000-0000-0000000001ff", optional: false, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-0000000001ff"},
    {args: [{typeId: "00000000-0000-0000-0000-000000000110", optional: false, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-000000000110"},
    {args: [{typeId: "00000000-0000-0000-0000-000000000108", optional: false, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-000000000108"},
    {args: [{typeId: "00000000-0000-0000-0000-000000000108", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-0000000001ff", optional: false, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-000000000108"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "std::round",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type containsλFuncExpr<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
> = $.$expr_Function<
  "std::contains",
  _.castMaps.mapLiteralToTypeSet<[P1, P2]>,
  {},
  $.TypeSet<$bool, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.paramCardinality<P2>>>
>;
type containsλFuncExpr2<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$bytes>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$bytes>>,
> = $.$expr_Function<
  "std::contains",
  _.castMaps.mapLiteralToTypeSet<[P1, P2]>,
  {},
  $.TypeSet<$bool, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.paramCardinality<P2>>>
>;
type containsλFuncExpr3<
  P1 extends $.TypeSet<$.RangeType<$anypoint>>,
  P2 extends $.TypeSet<$.RangeType<$.getPrimitiveBaseType<P1["__element__"]["__element__"]>>>,
> = $.$expr_Function<
  "std::contains",
  [P1, P2],
  {},
  $.TypeSet<$bool, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.paramCardinality<P2>>>
>;
type containsλFuncExpr4<
  P1 extends $.TypeSet<$.RangeType<$anypoint>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$.getPrimitiveBaseType<P1["__element__"]["__element__"]>>>,
> = $.$expr_Function<
  "std::contains",
  _.castMaps.mapLiteralToTypeSet<[P1, P2]>,
  {},
  $.TypeSet<$bool, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.paramCardinality<P2>>>
>;
type containsλFuncExpr5<
  P1 extends $.TypeSet<$.RangeType<_cal.$local_date>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<_cal.$local_date>>,
> = $.$expr_Function<
  "std::contains",
  _.castMaps.mapLiteralToTypeSet<[P1, P2]>,
  {},
  $.TypeSet<$bool, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.paramCardinality<P2>>>
>;
type containsλFuncExpr6<
  P1 extends $.TypeSet<$.ArrayType<_cal.$relative_durationλICastableTo>>,
  P2 extends $.TypeSet<_cal.$relative_durationλICastableTo>,
> = $.$expr_Function<
  "std::contains",
  [P1, P2],
  {},
  $.TypeSet<$bool, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.paramCardinality<P2>>>
>;
type containsλFuncExpr7<
  P1 extends $.TypeSet<$.ArrayType<_cal.$local_datetimeλICastableTo>>,
  P2 extends $.TypeSet<_cal.$local_datetimeλICastableTo>,
> = $.$expr_Function<
  "std::contains",
  [P1, P2],
  {},
  $.TypeSet<$bool, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.paramCardinality<P2>>>
>;
type containsλFuncExpr8<
  P1 extends $.TypeSet<$.ArrayType<$decimalλICastableTo>>,
  P2 extends $.TypeSet<$decimalλICastableTo>,
> = $.$expr_Function<
  "std::contains",
  [P1, P2],
  {},
  $.TypeSet<$bool, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.paramCardinality<P2>>>
>;
type containsλFuncExpr9<
  P1 extends $.TypeSet<$.ArrayType<$.ObjectType>>,
  P2 extends $.TypeSet<$.ObjectType>,
> = $.$expr_Function<
  "std::contains",
  [P1, P2],
  {},
  $.TypeSet<$bool, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.paramCardinality<P2>>>
>;
type containsλFuncExpr10<
  P1 extends $.TypeSet<$.ArrayType<$.AnyTupleType>>,
  P2 extends $.TypeSet<$.AnyTupleType>,
> = $.$expr_Function<
  "std::contains",
  [P1, P2],
  {},
  $.TypeSet<$bool, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.paramCardinality<P2>>>
>;
type containsλFuncExpr11<
  P1 extends $.TypeSet<$.ArrayType<$.NonArrayType>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$.getPrimitiveNonArrayBaseType<P1["__element__"]["__element__"]>>>,
> = $.$expr_Function<
  "std::contains",
  _.castMaps.mapLiteralToTypeSet<[P1, P2]>,
  {},
  $.TypeSet<$bool, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.paramCardinality<P2>>>
>;
/**
 * A polymorphic function to test if a sequence contains a certain element.
 */
function contains<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
>(
  haystack: P1,
  needle: P2,
): containsλFuncExpr<P1, P2>;
/**
 * A polymorphic function to test if a sequence contains a certain element.
 */
function contains<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$bytes>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$bytes>>,
>(
  haystack: P1,
  needle: P2,
): containsλFuncExpr2<P1, P2>;
function contains<
  P1 extends $.TypeSet<$.RangeType<$anypoint>>,
  P2 extends $.TypeSet<$.RangeType<$.getPrimitiveBaseType<P1["__element__"]["__element__"]>>>,
>(
  haystack: P1,
  needle: P2,
): containsλFuncExpr3<P1, P2>;
function contains<
  P1 extends $.TypeSet<$.RangeType<$anypoint>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$.getPrimitiveBaseType<P1["__element__"]["__element__"]>>>,
>(
  haystack: P1,
  needle: P2,
): containsλFuncExpr4<P1, P2>;
function contains<
  P1 extends $.TypeSet<$.RangeType<_cal.$local_date>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<_cal.$local_date>>,
>(
  haystack: P1,
  needle: P2,
): containsλFuncExpr5<P1, P2>;
/**
 * A polymorphic function to test if a sequence contains a certain element.
 */
function contains<
  P1 extends $.TypeSet<$.ArrayType<_cal.$relative_durationλICastableTo>>,
  P2 extends $.TypeSet<_cal.$relative_durationλICastableTo>,
>(
  haystack: P1,
  needle: P2,
): containsλFuncExpr6<P1, P2>;
/**
 * A polymorphic function to test if a sequence contains a certain element.
 */
function contains<
  P1 extends $.TypeSet<$.ArrayType<_cal.$local_datetimeλICastableTo>>,
  P2 extends $.TypeSet<_cal.$local_datetimeλICastableTo>,
>(
  haystack: P1,
  needle: P2,
): containsλFuncExpr7<P1, P2>;
/**
 * A polymorphic function to test if a sequence contains a certain element.
 */
function contains<
  P1 extends $.TypeSet<$.ArrayType<$decimalλICastableTo>>,
  P2 extends $.TypeSet<$decimalλICastableTo>,
>(
  haystack: P1,
  needle: P2,
): containsλFuncExpr8<P1, P2>;
/**
 * A polymorphic function to test if a sequence contains a certain element.
 */
function contains<
  P1 extends $.TypeSet<$.ArrayType<$.ObjectType>>,
  P2 extends $.TypeSet<$.ObjectType>,
>(
  haystack: P1,
  needle: P2,
): containsλFuncExpr9<P1, P2>;
/**
 * A polymorphic function to test if a sequence contains a certain element.
 */
function contains<
  P1 extends $.TypeSet<$.ArrayType<$.AnyTupleType>>,
  P2 extends $.TypeSet<$.AnyTupleType>,
>(
  haystack: P1,
  needle: P2,
): containsλFuncExpr10<P1, P2>;
/**
 * A polymorphic function to test if a sequence contains a certain element.
 */
function contains<
  P1 extends $.TypeSet<$.ArrayType<$.NonArrayType>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$.getPrimitiveNonArrayBaseType<P1["__element__"]["__element__"]>>>,
>(
  haystack: P1,
  needle: P2,
): containsλFuncExpr11<P1, P2>;
function contains(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('std::contains', args, _.spec, [
    {args: [{typeId: "00000000-0000-0000-0000-000000000101", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-000000000101", optional: false, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-000000000109"},
    {args: [{typeId: "00000000-0000-0000-0000-000000000102", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-000000000102", optional: false, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-000000000109"},
    {args: [{typeId: "ef11779e-e3c8-8225-93d0-5cff264f4228", optional: false, setoftype: false, variadic: false}, {typeId: "ef11779e-e3c8-8225-93d0-5cff264f4228", optional: false, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-000000000109"},
    {args: [{typeId: "ef11779e-e3c8-8225-93d0-5cff264f4228", optional: false, setoftype: false, variadic: false}, {typeId: "048e9a16-06d1-11ed-a488-81ecd69e27a7", optional: false, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-000000000109"},
    {args: [{typeId: "ca752a6b-54a8-ba10-285b-13a79b02a110", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-00000000010c", optional: false, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-000000000109"},
    {args: [{typeId: "5d31584b-3a5f-533d-3d64-fab0fdab61b3", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-000000000001", optional: false, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-000000000109"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "std::contains",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type array_replaceλFuncExpr<
  P1 extends $.TypeSet<$.ArrayType<_cal.$relative_durationλICastableTo>>,
  P2 extends $.TypeSet<_cal.$relative_durationλICastableTo>,
  P3 extends $.TypeSet<_cal.$relative_durationλICastableTo>,
> = $.$expr_Function<
  "std::array_replace",
  [P1, P2, P3],
  {},
  $.TypeSet<$.ArrayType<_.syntax.getSharedParentPrimitive<_.syntax.getSharedParentPrimitive<P1["__element__"]["__element__"], P2["__element__"]>, P3["__element__"]>>, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.paramCardinality<P2>>, $.cardinalityUtil.paramCardinality<P3>>>
>;
type array_replaceλFuncExpr2<
  P1 extends $.TypeSet<$.ArrayType<_cal.$local_datetimeλICastableTo>>,
  P2 extends $.TypeSet<_cal.$local_datetimeλICastableTo>,
  P3 extends $.TypeSet<_cal.$local_datetimeλICastableTo>,
> = $.$expr_Function<
  "std::array_replace",
  [P1, P2, P3],
  {},
  $.TypeSet<$.ArrayType<_.syntax.getSharedParentPrimitive<_.syntax.getSharedParentPrimitive<P1["__element__"]["__element__"], P2["__element__"]>, P3["__element__"]>>, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.paramCardinality<P2>>, $.cardinalityUtil.paramCardinality<P3>>>
>;
type array_replaceλFuncExpr3<
  P1 extends $.TypeSet<$.ArrayType<$decimalλICastableTo>>,
  P2 extends $.TypeSet<$decimalλICastableTo>,
  P3 extends $.TypeSet<$decimalλICastableTo>,
> = $.$expr_Function<
  "std::array_replace",
  [P1, P2, P3],
  {},
  $.TypeSet<$.ArrayType<_.syntax.getSharedParentPrimitive<_.syntax.getSharedParentPrimitive<P1["__element__"]["__element__"], P2["__element__"]>, P3["__element__"]>>, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.paramCardinality<P2>>, $.cardinalityUtil.paramCardinality<P3>>>
>;
type array_replaceλFuncExpr4<
  P1 extends $.TypeSet<$.ArrayType<$.ObjectType>>,
  P2 extends $.TypeSet<$.ObjectType>,
  P3 extends $.TypeSet<$.ObjectType>,
> = $.$expr_Function<
  "std::array_replace",
  [P1, P2, P3],
  {},
  $.TypeSet<$.ArrayType<_.syntax.mergeObjectTypes<_.syntax.mergeObjectTypes<P1["__element__"]["__element__"], P2["__element__"]>, P3["__element__"]>>, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.paramCardinality<P2>>, $.cardinalityUtil.paramCardinality<P3>>>
>;
type array_replaceλFuncExpr5<
  P1 extends $.TypeSet<$.ArrayType<$.AnyTupleType>>,
  P2 extends $.TypeSet<$.AnyTupleType>,
  P3 extends $.TypeSet<$.AnyTupleType>,
> = $.$expr_Function<
  "std::array_replace",
  [P1, P2, P3],
  {},
  $.TypeSet<$.ArrayType<_.syntax.getSharedParentPrimitive<_.syntax.getSharedParentPrimitive<P1["__element__"]["__element__"], P2["__element__"]>, P3["__element__"]>>, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.paramCardinality<P2>>, $.cardinalityUtil.paramCardinality<P3>>>
>;
type array_replaceλFuncExpr6<
  P1 extends $.TypeSet<$.ArrayType<$.NonArrayType>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$.getPrimitiveNonArrayBaseType<P1["__element__"]["__element__"]>>>,
  P3 extends _.castMaps.orScalarLiteral<$.TypeSet<$.getPrimitiveNonArrayBaseType<P1["__element__"]["__element__"]>>>,
> = $.$expr_Function<
  "std::array_replace",
  _.castMaps.mapLiteralToTypeSet<[P1, P2, P3]>,
  {},
  $.TypeSet<$.ArrayType<$.getPrimitiveNonArrayBaseType<P1["__element__"]["__element__"]>>, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.paramCardinality<P2>>, $.cardinalityUtil.paramCardinality<P3>>>
>;
/**
 * Replace each array element equal to the second argument with the third argument.
 */
function array_replace<
  P1 extends $.TypeSet<$.ArrayType<_cal.$relative_durationλICastableTo>>,
  P2 extends $.TypeSet<_cal.$relative_durationλICastableTo>,
  P3 extends $.TypeSet<_cal.$relative_durationλICastableTo>,
>(
  array: P1,
  old: P2,
  new_2: P3,
): array_replaceλFuncExpr<P1, P2, P3>;
/**
 * Replace each array element equal to the second argument with the third argument.
 */
function array_replace<
  P1 extends $.TypeSet<$.ArrayType<_cal.$local_datetimeλICastableTo>>,
  P2 extends $.TypeSet<_cal.$local_datetimeλICastableTo>,
  P3 extends $.TypeSet<_cal.$local_datetimeλICastableTo>,
>(
  array: P1,
  old: P2,
  new_2: P3,
): array_replaceλFuncExpr2<P1, P2, P3>;
/**
 * Replace each array element equal to the second argument with the third argument.
 */
function array_replace<
  P1 extends $.TypeSet<$.ArrayType<$decimalλICastableTo>>,
  P2 extends $.TypeSet<$decimalλICastableTo>,
  P3 extends $.TypeSet<$decimalλICastableTo>,
>(
  array: P1,
  old: P2,
  new_2: P3,
): array_replaceλFuncExpr3<P1, P2, P3>;
/**
 * Replace each array element equal to the second argument with the third argument.
 */
function array_replace<
  P1 extends $.TypeSet<$.ArrayType<$.ObjectType>>,
  P2 extends $.TypeSet<$.ObjectType>,
  P3 extends $.TypeSet<$.ObjectType>,
>(
  array: P1,
  old: P2,
  new_2: P3,
): array_replaceλFuncExpr4<P1, P2, P3>;
/**
 * Replace each array element equal to the second argument with the third argument.
 */
function array_replace<
  P1 extends $.TypeSet<$.ArrayType<$.AnyTupleType>>,
  P2 extends $.TypeSet<$.AnyTupleType>,
  P3 extends $.TypeSet<$.AnyTupleType>,
>(
  array: P1,
  old: P2,
  new_2: P3,
): array_replaceλFuncExpr5<P1, P2, P3>;
/**
 * Replace each array element equal to the second argument with the third argument.
 */
function array_replace<
  P1 extends $.TypeSet<$.ArrayType<$.NonArrayType>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$.getPrimitiveNonArrayBaseType<P1["__element__"]["__element__"]>>>,
  P3 extends _.castMaps.orScalarLiteral<$.TypeSet<$.getPrimitiveNonArrayBaseType<P1["__element__"]["__element__"]>>>,
>(
  array: P1,
  old: P2,
  new_2: P3,
): array_replaceλFuncExpr6<P1, P2, P3>;
function array_replace(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('std::array_replace', args, _.spec, [
    {args: [{typeId: "5d31584b-3a5f-533d-3d64-fab0fdab61b3", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-000000000001", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-000000000001", optional: false, setoftype: false, variadic: false}], returnTypeId: "5d31584b-3a5f-533d-3d64-fab0fdab61b3"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "std::array_replace",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type findλFuncExpr<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
> = $.$expr_Function<
  "std::find",
  _.castMaps.mapLiteralToTypeSet<[P1, P2]>,
  {},
  $.TypeSet<$number, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.paramCardinality<P2>>>
>;
type findλFuncExpr2<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$bytes>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$bytes>>,
> = $.$expr_Function<
  "std::find",
  _.castMaps.mapLiteralToTypeSet<[P1, P2]>,
  {},
  $.TypeSet<$number, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.paramCardinality<P2>>>
>;
type findλFuncExpr3<
  P1 extends $.TypeSet<$.ArrayType<_cal.$relative_durationλICastableTo>>,
  P2 extends $.TypeSet<_cal.$relative_durationλICastableTo>,
  P3 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>> | undefined,
> = $.$expr_Function<
  "std::find",
  _.castMaps.mapLiteralToTypeSet<[P1, P2, P3]>,
  {},
  $.TypeSet<$number, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.paramCardinality<P2>>, $.cardinalityUtil.optionalParamCardinality<P3>>>
>;
type findλFuncExpr4<
  P1 extends $.TypeSet<$.ArrayType<_cal.$local_datetimeλICastableTo>>,
  P2 extends $.TypeSet<_cal.$local_datetimeλICastableTo>,
  P3 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>> | undefined,
> = $.$expr_Function<
  "std::find",
  _.castMaps.mapLiteralToTypeSet<[P1, P2, P3]>,
  {},
  $.TypeSet<$number, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.paramCardinality<P2>>, $.cardinalityUtil.optionalParamCardinality<P3>>>
>;
type findλFuncExpr5<
  P1 extends $.TypeSet<$.ArrayType<$decimalλICastableTo>>,
  P2 extends $.TypeSet<$decimalλICastableTo>,
  P3 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>> | undefined,
> = $.$expr_Function<
  "std::find",
  _.castMaps.mapLiteralToTypeSet<[P1, P2, P3]>,
  {},
  $.TypeSet<$number, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.paramCardinality<P2>>, $.cardinalityUtil.optionalParamCardinality<P3>>>
>;
type findλFuncExpr6<
  P1 extends $.TypeSet<$.ArrayType<$.ObjectType>>,
  P2 extends $.TypeSet<$.ObjectType>,
  P3 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>> | undefined,
> = $.$expr_Function<
  "std::find",
  _.castMaps.mapLiteralToTypeSet<[P1, P2, P3]>,
  {},
  $.TypeSet<$number, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.paramCardinality<P2>>, $.cardinalityUtil.optionalParamCardinality<P3>>>
>;
type findλFuncExpr7<
  P1 extends $.TypeSet<$.ArrayType<$.AnyTupleType>>,
  P2 extends $.TypeSet<$.AnyTupleType>,
  P3 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>> | undefined,
> = $.$expr_Function<
  "std::find",
  _.castMaps.mapLiteralToTypeSet<[P1, P2, P3]>,
  {},
  $.TypeSet<$number, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.paramCardinality<P2>>, $.cardinalityUtil.optionalParamCardinality<P3>>>
>;
type findλFuncExpr8<
  P1 extends $.TypeSet<$.ArrayType<$.NonArrayType>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$.getPrimitiveNonArrayBaseType<P1["__element__"]["__element__"]>>>,
  P3 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>> | undefined,
> = $.$expr_Function<
  "std::find",
  _.castMaps.mapLiteralToTypeSet<[P1, P2, P3]>,
  {},
  $.TypeSet<$number, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.paramCardinality<P2>>, $.cardinalityUtil.optionalParamCardinality<P3>>>
>;
/**
 * A polymorphic function to find index of an element in a sequence.
 */
function find<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
>(
  haystack: P1,
  needle: P2,
): findλFuncExpr<P1, P2>;
/**
 * A polymorphic function to find index of an element in a sequence.
 */
function find<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$bytes>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$bytes>>,
>(
  haystack: P1,
  needle: P2,
): findλFuncExpr2<P1, P2>;
/**
 * A polymorphic function to find index of an element in a sequence.
 */
function find<
  P1 extends $.TypeSet<$.ArrayType<_cal.$relative_durationλICastableTo>>,
  P2 extends $.TypeSet<_cal.$relative_durationλICastableTo>,
  P3 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>> | undefined,
>(
  haystack: P1,
  needle: P2,
  from_pos?: P3,
): findλFuncExpr3<P1, P2, P3>;
/**
 * A polymorphic function to find index of an element in a sequence.
 */
function find<
  P1 extends $.TypeSet<$.ArrayType<_cal.$local_datetimeλICastableTo>>,
  P2 extends $.TypeSet<_cal.$local_datetimeλICastableTo>,
  P3 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>> | undefined,
>(
  haystack: P1,
  needle: P2,
  from_pos?: P3,
): findλFuncExpr4<P1, P2, P3>;
/**
 * A polymorphic function to find index of an element in a sequence.
 */
function find<
  P1 extends $.TypeSet<$.ArrayType<$decimalλICastableTo>>,
  P2 extends $.TypeSet<$decimalλICastableTo>,
  P3 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>> | undefined,
>(
  haystack: P1,
  needle: P2,
  from_pos?: P3,
): findλFuncExpr5<P1, P2, P3>;
/**
 * A polymorphic function to find index of an element in a sequence.
 */
function find<
  P1 extends $.TypeSet<$.ArrayType<$.ObjectType>>,
  P2 extends $.TypeSet<$.ObjectType>,
  P3 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>> | undefined,
>(
  haystack: P1,
  needle: P2,
  from_pos?: P3,
): findλFuncExpr6<P1, P2, P3>;
/**
 * A polymorphic function to find index of an element in a sequence.
 */
function find<
  P1 extends $.TypeSet<$.ArrayType<$.AnyTupleType>>,
  P2 extends $.TypeSet<$.AnyTupleType>,
  P3 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>> | undefined,
>(
  haystack: P1,
  needle: P2,
  from_pos?: P3,
): findλFuncExpr7<P1, P2, P3>;
/**
 * A polymorphic function to find index of an element in a sequence.
 */
function find<
  P1 extends $.TypeSet<$.ArrayType<$.NonArrayType>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$.getPrimitiveNonArrayBaseType<P1["__element__"]["__element__"]>>>,
  P3 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>> | undefined,
>(
  haystack: P1,
  needle: P2,
  from_pos?: P3,
): findλFuncExpr8<P1, P2, P3>;
function find(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('std::find', args, _.spec, [
    {args: [{typeId: "00000000-0000-0000-0000-000000000101", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-000000000101", optional: false, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-0000000001ff"},
    {args: [{typeId: "00000000-0000-0000-0000-000000000102", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-000000000102", optional: false, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-0000000001ff"},
    {args: [{typeId: "5d31584b-3a5f-533d-3d64-fab0fdab61b3", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-000000000001", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-0000000001ff", optional: true, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-0000000001ff"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "std::find",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type bit_andλFuncExpr<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
> = $.$expr_Function<
  "std::bit_and",
  _.castMaps.mapLiteralToTypeSet<[P1, P2]>,
  {},
  $.TypeSet<$number, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.paramCardinality<P2>>>
>;
/**
 * Bitwise AND operator for 16-bit integers.
 */
function bit_and<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
>(
  l: P1,
  r: P2,
): bit_andλFuncExpr<P1, P2>;
function bit_and(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('std::bit_and', args, _.spec, [
    {args: [{typeId: "00000000-0000-0000-0000-0000000001ff", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-0000000001ff", optional: false, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-0000000001ff"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "std::bit_and",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type bit_orλFuncExpr<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
> = $.$expr_Function<
  "std::bit_or",
  _.castMaps.mapLiteralToTypeSet<[P1, P2]>,
  {},
  $.TypeSet<$number, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.paramCardinality<P2>>>
>;
/**
 * Bitwise OR operator for 16-bit integers.
 */
function bit_or<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
>(
  l: P1,
  r: P2,
): bit_orλFuncExpr<P1, P2>;
function bit_or(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('std::bit_or', args, _.spec, [
    {args: [{typeId: "00000000-0000-0000-0000-0000000001ff", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-0000000001ff", optional: false, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-0000000001ff"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "std::bit_or",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type bit_xorλFuncExpr<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
> = $.$expr_Function<
  "std::bit_xor",
  _.castMaps.mapLiteralToTypeSet<[P1, P2]>,
  {},
  $.TypeSet<$number, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.paramCardinality<P2>>>
>;
/**
 * Bitwise exclusive OR operator for 16-bit integers.
 */
function bit_xor<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
>(
  l: P1,
  r: P2,
): bit_xorλFuncExpr<P1, P2>;
function bit_xor(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('std::bit_xor', args, _.spec, [
    {args: [{typeId: "00000000-0000-0000-0000-0000000001ff", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-0000000001ff", optional: false, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-0000000001ff"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "std::bit_xor",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type bit_notλFuncExpr<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
> = $.$expr_Function<
  "std::bit_not",
  _.castMaps.mapLiteralToTypeSet<[P1]>,
  {},
  $.TypeSet<$number, $.cardinalityUtil.paramCardinality<P1>>
>;
/**
 * Bitwise NOT operator for 16-bit integers.
 */
function bit_not<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
>(
  r: P1,
): bit_notλFuncExpr<P1>;
function bit_not(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('std::bit_not', args, _.spec, [
    {args: [{typeId: "00000000-0000-0000-0000-0000000001ff", optional: false, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-0000000001ff"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "std::bit_not",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type bit_rshiftλFuncExpr<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
> = $.$expr_Function<
  "std::bit_rshift",
  _.castMaps.mapLiteralToTypeSet<[P1, P2]>,
  {},
  $.TypeSet<$number, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.paramCardinality<P2>>>
>;
/**
 * Bitwise right-shift operator for 16-bit integers.
 */
function bit_rshift<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
>(
  val: P1,
  n: P2,
): bit_rshiftλFuncExpr<P1, P2>;
function bit_rshift(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('std::bit_rshift', args, _.spec, [
    {args: [{typeId: "00000000-0000-0000-0000-0000000001ff", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-0000000001ff", optional: false, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-0000000001ff"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "std::bit_rshift",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type bit_lshiftλFuncExpr<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
> = $.$expr_Function<
  "std::bit_lshift",
  _.castMaps.mapLiteralToTypeSet<[P1, P2]>,
  {},
  $.TypeSet<$number, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.paramCardinality<P2>>>
>;
/**
 * Bitwise left-shift operator for 16-bit integers.
 */
function bit_lshift<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
>(
  val: P1,
  n: P2,
): bit_lshiftλFuncExpr<P1, P2>;
function bit_lshift(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('std::bit_lshift', args, _.spec, [
    {args: [{typeId: "00000000-0000-0000-0000-0000000001ff", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-0000000001ff", optional: false, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-0000000001ff"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "std::bit_lshift",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type array_aggλFuncExpr<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$.NonArrayType>>,
> = $.$expr_Function<
  "std::array_agg",
  _.castMaps.mapLiteralToTypeSet<[P1]>,
  {},
  $.TypeSet<$.ArrayType<$.getPrimitiveNonArrayBaseType<_.castMaps.literalToTypeSet<P1>["__element__"]>>, $.Cardinality.One>
>;
/**
 * Return the array made from all of the input set elements.
 */
function array_agg<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$.NonArrayType>>,
>(
  s: P1,
): array_aggλFuncExpr<P1>;
function array_agg(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('std::array_agg', args, _.spec, [
    {args: [{typeId: "00000000-0000-0000-0000-000000000001", optional: false, setoftype: true, variadic: false}], returnTypeId: "5d31584b-3a5f-533d-3d64-fab0fdab61b3"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "std::array_agg",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type array_unpackλFuncExpr<
  P1 extends $.TypeSet<$.ArrayType<$.NonArrayType>>,
> = $.$expr_Function<
  "std::array_unpack",
  [P1],
  {},
  $.TypeSet<$.getPrimitiveNonArrayBaseType<P1["__element__"]["__element__"]>, $.Cardinality.Many>
>;
/**
 * Return array elements as a set.
 */
function array_unpack<
  P1 extends $.TypeSet<$.ArrayType<$.NonArrayType>>,
>(
  array: P1,
): array_unpackλFuncExpr<P1>;
function array_unpack(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('std::array_unpack', args, _.spec, [
    {args: [{typeId: "5d31584b-3a5f-533d-3d64-fab0fdab61b3", optional: false, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-000000000001", returnTypemod: "SetOfType"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "std::array_unpack",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type array_fillλFuncExpr<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$.NonArrayType>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
> = $.$expr_Function<
  "std::array_fill",
  _.castMaps.mapLiteralToTypeSet<[P1, P2]>,
  {},
  $.TypeSet<$.ArrayType<$.getPrimitiveNonArrayBaseType<_.castMaps.literalToTypeSet<P1>["__element__"]>>, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.paramCardinality<P2>>>
>;
/**
 * Return an array filled with the given value repeated as many times as specified.
 */
function array_fill<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$.NonArrayType>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
>(
  val: P1,
  n: P2,
): array_fillλFuncExpr<P1, P2>;
function array_fill(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('std::array_fill', args, _.spec, [
    {args: [{typeId: "00000000-0000-0000-0000-000000000001", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-0000000001ff", optional: false, setoftype: false, variadic: false}], returnTypeId: "5d31584b-3a5f-533d-3d64-fab0fdab61b3"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "std::array_fill",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type array_getλFuncExpr<
  NamedArgs extends {
    "default"?: $.TypeSet<_cal.$relative_durationλICastableTo>,
  },
  P1 extends $.TypeSet<$.ArrayType<_cal.$relative_durationλICastableTo>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
> = $.$expr_Function<
  "std::array_get",
  _.castMaps.mapLiteralToTypeSet<[P1, P2]>,
  NamedArgs,
  $.TypeSet<_.syntax.getSharedParentPrimitive<NamedArgs["default"] extends $.TypeSet ? NamedArgs["default"]["__element__"] : undefined, P1["__element__"]["__element__"]>, $.cardinalityUtil.overrideLowerBound<$.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.paramCardinality<P2>>, $.cardinalityUtil.optionalParamCardinality<NamedArgs["default"]>>, 'Zero'>>
>;
type array_getλFuncExpr2<
  P1 extends $.TypeSet<$.ArrayType<_cal.$relative_durationλICastableTo>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
> = $.$expr_Function<
  "std::array_get",
  _.castMaps.mapLiteralToTypeSet<[P1, P2]>,
  {},
  $.TypeSet<P1["__element__"]["__element__"], $.cardinalityUtil.overrideLowerBound<$.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.paramCardinality<P2>>, 'Zero'>>
>;
type array_getλFuncExpr3<
  NamedArgs extends {
    "default"?: $.TypeSet<_cal.$local_datetimeλICastableTo>,
  },
  P1 extends $.TypeSet<$.ArrayType<_cal.$local_datetimeλICastableTo>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
> = $.$expr_Function<
  "std::array_get",
  _.castMaps.mapLiteralToTypeSet<[P1, P2]>,
  NamedArgs,
  $.TypeSet<_.syntax.getSharedParentPrimitive<NamedArgs["default"] extends $.TypeSet ? NamedArgs["default"]["__element__"] : undefined, P1["__element__"]["__element__"]>, $.cardinalityUtil.overrideLowerBound<$.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.paramCardinality<P2>>, $.cardinalityUtil.optionalParamCardinality<NamedArgs["default"]>>, 'Zero'>>
>;
type array_getλFuncExpr4<
  P1 extends $.TypeSet<$.ArrayType<_cal.$local_datetimeλICastableTo>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
> = $.$expr_Function<
  "std::array_get",
  _.castMaps.mapLiteralToTypeSet<[P1, P2]>,
  {},
  $.TypeSet<P1["__element__"]["__element__"], $.cardinalityUtil.overrideLowerBound<$.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.paramCardinality<P2>>, 'Zero'>>
>;
type array_getλFuncExpr5<
  NamedArgs extends {
    "default"?: $.TypeSet<$decimalλICastableTo>,
  },
  P1 extends $.TypeSet<$.ArrayType<$decimalλICastableTo>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
> = $.$expr_Function<
  "std::array_get",
  _.castMaps.mapLiteralToTypeSet<[P1, P2]>,
  NamedArgs,
  $.TypeSet<_.syntax.getSharedParentPrimitive<NamedArgs["default"] extends $.TypeSet ? NamedArgs["default"]["__element__"] : undefined, P1["__element__"]["__element__"]>, $.cardinalityUtil.overrideLowerBound<$.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.paramCardinality<P2>>, $.cardinalityUtil.optionalParamCardinality<NamedArgs["default"]>>, 'Zero'>>
>;
type array_getλFuncExpr6<
  P1 extends $.TypeSet<$.ArrayType<$decimalλICastableTo>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
> = $.$expr_Function<
  "std::array_get",
  _.castMaps.mapLiteralToTypeSet<[P1, P2]>,
  {},
  $.TypeSet<P1["__element__"]["__element__"], $.cardinalityUtil.overrideLowerBound<$.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.paramCardinality<P2>>, 'Zero'>>
>;
type array_getλFuncExpr7<
  NamedArgs extends {
    "default"?: $.TypeSet<$.ObjectType>,
  },
  P1 extends $.TypeSet<$.ArrayType<$.ObjectType>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
> = $.$expr_Function<
  "std::array_get",
  _.castMaps.mapLiteralToTypeSet<[P1, P2]>,
  NamedArgs,
  $.TypeSet<_.syntax.mergeObjectTypes<NamedArgs["default"] extends $.TypeSet ? NamedArgs["default"]["__element__"] : undefined, P1["__element__"]["__element__"]>, $.cardinalityUtil.overrideLowerBound<$.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.paramCardinality<P2>>, $.cardinalityUtil.optionalParamCardinality<NamedArgs["default"]>>, 'Zero'>>
>;
type array_getλFuncExpr8<
  P1 extends $.TypeSet<$.ArrayType<$.ObjectType>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
> = $.$expr_Function<
  "std::array_get",
  _.castMaps.mapLiteralToTypeSet<[P1, P2]>,
  {},
  $.TypeSet<P1["__element__"]["__element__"], $.cardinalityUtil.overrideLowerBound<$.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.paramCardinality<P2>>, 'Zero'>>
>;
type array_getλFuncExpr9<
  NamedArgs extends {
    "default"?: $.TypeSet<$.AnyTupleType>,
  },
  P1 extends $.TypeSet<$.ArrayType<$.AnyTupleType>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
> = $.$expr_Function<
  "std::array_get",
  _.castMaps.mapLiteralToTypeSet<[P1, P2]>,
  NamedArgs,
  $.TypeSet<_.syntax.getSharedParentPrimitive<NamedArgs["default"] extends $.TypeSet ? NamedArgs["default"]["__element__"] : undefined, P1["__element__"]["__element__"]>, $.cardinalityUtil.overrideLowerBound<$.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.paramCardinality<P2>>, $.cardinalityUtil.optionalParamCardinality<NamedArgs["default"]>>, 'Zero'>>
>;
type array_getλFuncExpr10<
  P1 extends $.TypeSet<$.ArrayType<$.AnyTupleType>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
> = $.$expr_Function<
  "std::array_get",
  _.castMaps.mapLiteralToTypeSet<[P1, P2]>,
  {},
  $.TypeSet<P1["__element__"]["__element__"], $.cardinalityUtil.overrideLowerBound<$.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.paramCardinality<P2>>, 'Zero'>>
>;
type array_getλFuncExpr11<
  NamedArgs extends {
    "default"?: _.castMaps.orScalarLiteral<$.TypeSet<$.getPrimitiveNonArrayBaseType<P1["__element__"]["__element__"]>>>,
  },
  P1 extends $.TypeSet<$.ArrayType<$.NonArrayType>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
> = $.$expr_Function<
  "std::array_get",
  _.castMaps.mapLiteralToTypeSet<[P1, P2]>,
  _.castMaps.mapLiteralToTypeSet<NamedArgs>,
  $.TypeSet<$.getPrimitiveNonArrayBaseType<P1["__element__"]["__element__"]>, $.cardinalityUtil.overrideLowerBound<$.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.paramCardinality<P2>>, $.cardinalityUtil.optionalParamCardinality<NamedArgs["default"]>>, 'Zero'>>
>;
type array_getλFuncExpr12<
  P1 extends $.TypeSet<$.ArrayType<$.NonArrayType>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
> = $.$expr_Function<
  "std::array_get",
  _.castMaps.mapLiteralToTypeSet<[P1, P2]>,
  {},
  $.TypeSet<$.getPrimitiveNonArrayBaseType<P1["__element__"]["__element__"]>, $.cardinalityUtil.overrideLowerBound<$.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.paramCardinality<P2>>, 'Zero'>>
>;
/**
 * Return the element of *array* at the specified *index*.
 */
function array_get<
  NamedArgs extends {
    "default"?: $.TypeSet<_cal.$relative_durationλICastableTo>,
  },
  P1 extends $.TypeSet<$.ArrayType<_cal.$relative_durationλICastableTo>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
>(
  namedArgs: NamedArgs,
  array: P1,
  idx: P2,
): array_getλFuncExpr<NamedArgs, P1, P2>;
/**
 * Return the element of *array* at the specified *index*.
 */
function array_get<
  P1 extends $.TypeSet<$.ArrayType<_cal.$relative_durationλICastableTo>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
>(
  array: P1,
  idx: P2,
): array_getλFuncExpr2<P1, P2>;
/**
 * Return the element of *array* at the specified *index*.
 */
function array_get<
  NamedArgs extends {
    "default"?: $.TypeSet<_cal.$local_datetimeλICastableTo>,
  },
  P1 extends $.TypeSet<$.ArrayType<_cal.$local_datetimeλICastableTo>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
>(
  namedArgs: NamedArgs,
  array: P1,
  idx: P2,
): array_getλFuncExpr3<NamedArgs, P1, P2>;
/**
 * Return the element of *array* at the specified *index*.
 */
function array_get<
  P1 extends $.TypeSet<$.ArrayType<_cal.$local_datetimeλICastableTo>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
>(
  array: P1,
  idx: P2,
): array_getλFuncExpr4<P1, P2>;
/**
 * Return the element of *array* at the specified *index*.
 */
function array_get<
  NamedArgs extends {
    "default"?: $.TypeSet<$decimalλICastableTo>,
  },
  P1 extends $.TypeSet<$.ArrayType<$decimalλICastableTo>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
>(
  namedArgs: NamedArgs,
  array: P1,
  idx: P2,
): array_getλFuncExpr5<NamedArgs, P1, P2>;
/**
 * Return the element of *array* at the specified *index*.
 */
function array_get<
  P1 extends $.TypeSet<$.ArrayType<$decimalλICastableTo>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
>(
  array: P1,
  idx: P2,
): array_getλFuncExpr6<P1, P2>;
/**
 * Return the element of *array* at the specified *index*.
 */
function array_get<
  NamedArgs extends {
    "default"?: $.TypeSet<$.ObjectType>,
  },
  P1 extends $.TypeSet<$.ArrayType<$.ObjectType>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
>(
  namedArgs: NamedArgs,
  array: P1,
  idx: P2,
): array_getλFuncExpr7<NamedArgs, P1, P2>;
/**
 * Return the element of *array* at the specified *index*.
 */
function array_get<
  P1 extends $.TypeSet<$.ArrayType<$.ObjectType>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
>(
  array: P1,
  idx: P2,
): array_getλFuncExpr8<P1, P2>;
/**
 * Return the element of *array* at the specified *index*.
 */
function array_get<
  NamedArgs extends {
    "default"?: $.TypeSet<$.AnyTupleType>,
  },
  P1 extends $.TypeSet<$.ArrayType<$.AnyTupleType>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
>(
  namedArgs: NamedArgs,
  array: P1,
  idx: P2,
): array_getλFuncExpr9<NamedArgs, P1, P2>;
/**
 * Return the element of *array* at the specified *index*.
 */
function array_get<
  P1 extends $.TypeSet<$.ArrayType<$.AnyTupleType>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
>(
  array: P1,
  idx: P2,
): array_getλFuncExpr10<P1, P2>;
/**
 * Return the element of *array* at the specified *index*.
 */
function array_get<
  NamedArgs extends {
    "default"?: _.castMaps.orScalarLiteral<$.TypeSet<$.getPrimitiveNonArrayBaseType<P1["__element__"]["__element__"]>>>,
  },
  P1 extends $.TypeSet<$.ArrayType<$.NonArrayType>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
>(
  namedArgs: NamedArgs,
  array: P1,
  idx: P2,
): array_getλFuncExpr11<NamedArgs, P1, P2>;
/**
 * Return the element of *array* at the specified *index*.
 */
function array_get<
  P1 extends $.TypeSet<$.ArrayType<$.NonArrayType>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
>(
  array: P1,
  idx: P2,
): array_getλFuncExpr12<P1, P2>;
function array_get(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('std::array_get', args, _.spec, [
    {args: [{typeId: "5d31584b-3a5f-533d-3d64-fab0fdab61b3", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-0000000001ff", optional: false, setoftype: false, variadic: false}], namedArgs: {"default": {typeId: "00000000-0000-0000-0000-000000000001", optional: true, setoftype: false, variadic: false}}, returnTypeId: "00000000-0000-0000-0000-000000000001", returnTypemod: "OptionalType"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "std::array_get",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type array_joinλFuncExpr<
  P1 extends $.TypeSet<$.ArrayType<$str>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
> = $.$expr_Function<
  "std::array_join",
  _.castMaps.mapLiteralToTypeSet<[P1, P2]>,
  {},
  $.TypeSet<$str, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.paramCardinality<P2>>>
>;
/**
 * Render an array to a string.
 */
function array_join<
  P1 extends $.TypeSet<$.ArrayType<$str>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
>(
  array: P1,
  delimiter: P2,
): array_joinλFuncExpr<P1, P2>;
function array_join(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('std::array_join', args, _.spec, [
    {args: [{typeId: "05f91774-15ea-9001-038e-092c1cad80af", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-000000000101", optional: false, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-000000000101"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "std::array_join",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type bytes_get_bitλFuncExpr<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$bytes>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
> = $.$expr_Function<
  "std::bytes_get_bit",
  _.castMaps.mapLiteralToTypeSet<[P1, P2]>,
  {},
  $.TypeSet<$number, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.paramCardinality<P2>>>
>;
/**
 * Get the *nth* bit of the *bytes* value.
 */
function bytes_get_bit<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$bytes>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
>(
  bytes: P1,
  num: P2,
): bytes_get_bitλFuncExpr<P1, P2>;
function bytes_get_bit(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('std::bytes_get_bit', args, _.spec, [
    {args: [{typeId: "00000000-0000-0000-0000-000000000102", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-0000000001ff", optional: false, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-0000000001ff"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "std::bytes_get_bit",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type datetime_currentλFuncExpr = $.$expr_Function<
  "std::datetime_current",
  [],
  {},
  $.TypeSet<$datetime, $.Cardinality.One>
>;
/**
 * Return the current server date and time.
 */
function datetime_current(): datetime_currentλFuncExpr;
function datetime_current(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('std::datetime_current', args, _.spec, [
    {args: [], returnTypeId: "00000000-0000-0000-0000-00000000010a"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "std::datetime_current",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type datetime_of_transactionλFuncExpr = $.$expr_Function<
  "std::datetime_of_transaction",
  [],
  {},
  $.TypeSet<$datetime, $.Cardinality.One>
>;
/**
 * Return the date and time of the start of the current transaction.
 */
function datetime_of_transaction(): datetime_of_transactionλFuncExpr;
function datetime_of_transaction(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('std::datetime_of_transaction', args, _.spec, [
    {args: [], returnTypeId: "00000000-0000-0000-0000-00000000010a"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "std::datetime_of_transaction",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type datetime_of_statementλFuncExpr = $.$expr_Function<
  "std::datetime_of_statement",
  [],
  {},
  $.TypeSet<$datetime, $.Cardinality.One>
>;
/**
 * Return the date and time of the start of the current statement.
 */
function datetime_of_statement(): datetime_of_statementλFuncExpr;
function datetime_of_statement(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('std::datetime_of_statement', args, _.spec, [
    {args: [], returnTypeId: "00000000-0000-0000-0000-00000000010a"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "std::datetime_of_statement",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type datetime_getλFuncExpr<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$datetime>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
> = $.$expr_Function<
  "std::datetime_get",
  _.castMaps.mapLiteralToTypeSet<[P1, P2]>,
  {},
  $.TypeSet<$number, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.paramCardinality<P2>>>
>;
type datetime_getλFuncExpr2<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<_cal.$local_datetimeλICastableTo>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
> = $.$expr_Function<
  "std::datetime_get",
  _.castMaps.mapLiteralToTypeSet<[P1, P2]>,
  {},
  $.TypeSet<$number, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.paramCardinality<P2>>>
>;
/**
 * Extract a specific element of input datetime by name.
 */
function datetime_get<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$datetime>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
>(
  dt: P1,
  el: P2,
): datetime_getλFuncExpr<P1, P2>;
/**
 * Extract a specific element of input datetime by name.
 */
function datetime_get<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<_cal.$local_datetimeλICastableTo>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
>(
  dt: P1,
  el: P2,
): datetime_getλFuncExpr2<P1, P2>;
function datetime_get(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('std::datetime_get', args, _.spec, [
    {args: [{typeId: "00000000-0000-0000-0000-00000000010a", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-000000000101", optional: false, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-0000000001ff"},
    {args: [{typeId: "00000000-0000-0000-0000-00000000010b", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-000000000101", optional: false, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-0000000001ff"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "std::datetime_get",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type datetime_truncateλFuncExpr<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$datetime>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
> = $.$expr_Function<
  "std::datetime_truncate",
  _.castMaps.mapLiteralToTypeSet<[P1, P2]>,
  {},
  $.TypeSet<$datetime, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.paramCardinality<P2>>>
>;
/**
 * Truncate the input datetime to a particular precision.
 */
function datetime_truncate<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$datetime>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
>(
  dt: P1,
  unit: P2,
): datetime_truncateλFuncExpr<P1, P2>;
function datetime_truncate(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('std::datetime_truncate', args, _.spec, [
    {args: [{typeId: "00000000-0000-0000-0000-00000000010a", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-000000000101", optional: false, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-00000000010a"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "std::datetime_truncate",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type duration_getλFuncExpr<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$duration>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
> = $.$expr_Function<
  "std::duration_get",
  _.castMaps.mapLiteralToTypeSet<[P1, P2]>,
  {},
  $.TypeSet<$number, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.paramCardinality<P2>>>
>;
type duration_getλFuncExpr2<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<_cal.$date_duration>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
> = $.$expr_Function<
  "std::duration_get",
  _.castMaps.mapLiteralToTypeSet<[P1, P2]>,
  {},
  $.TypeSet<$number, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.paramCardinality<P2>>>
>;
type duration_getλFuncExpr3<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<_cal.$relative_durationλICastableTo>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
> = $.$expr_Function<
  "std::duration_get",
  _.castMaps.mapLiteralToTypeSet<[P1, P2]>,
  {},
  $.TypeSet<$number, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.paramCardinality<P2>>>
>;
/**
 * Extract a specific element of input duration by name.
 */
function duration_get<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$duration>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
>(
  dt: P1,
  el: P2,
): duration_getλFuncExpr<P1, P2>;
/**
 * Extract a specific element of input duration by name.
 */
function duration_get<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<_cal.$date_duration>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
>(
  dt: P1,
  el: P2,
): duration_getλFuncExpr2<P1, P2>;
/**
 * Extract a specific element of input duration by name.
 */
function duration_get<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<_cal.$relative_durationλICastableTo>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
>(
  dt: P1,
  el: P2,
): duration_getλFuncExpr3<P1, P2>;
function duration_get(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('std::duration_get', args, _.spec, [
    {args: [{typeId: "00000000-0000-0000-0000-00000000010e", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-000000000101", optional: false, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-0000000001ff"},
    {args: [{typeId: "00000000-0000-0000-0000-000000000112", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-000000000101", optional: false, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-0000000001ff"},
    {args: [{typeId: "00000000-0000-0000-0000-000000000111", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-000000000101", optional: false, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-0000000001ff"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "std::duration_get",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type duration_truncateλFuncExpr<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$duration>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
> = $.$expr_Function<
  "std::duration_truncate",
  _.castMaps.mapLiteralToTypeSet<[P1, P2]>,
  {},
  $.TypeSet<$duration, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.paramCardinality<P2>>>
>;
type duration_truncateλFuncExpr2<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<_cal.$date_duration>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
> = $.$expr_Function<
  "std::duration_truncate",
  _.castMaps.mapLiteralToTypeSet<[P1, P2]>,
  {},
  $.TypeSet<_cal.$date_duration, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.paramCardinality<P2>>>
>;
type duration_truncateλFuncExpr3<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<_cal.$relative_durationλICastableTo>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
> = $.$expr_Function<
  "std::duration_truncate",
  _.castMaps.mapLiteralToTypeSet<[P1, P2]>,
  {},
  $.TypeSet<_cal.$relative_duration, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.paramCardinality<P2>>>
>;
/**
 * Truncate the input duration to a particular precision.
 */
function duration_truncate<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$duration>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
>(
  dt: P1,
  unit: P2,
): duration_truncateλFuncExpr<P1, P2>;
/**
 * Truncate the input duration to a particular precision.
 */
function duration_truncate<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<_cal.$date_duration>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
>(
  dt: P1,
  unit: P2,
): duration_truncateλFuncExpr2<P1, P2>;
/**
 * Truncate the input duration to a particular precision.
 */
function duration_truncate<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<_cal.$relative_durationλICastableTo>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
>(
  dt: P1,
  unit: P2,
): duration_truncateλFuncExpr3<P1, P2>;
function duration_truncate(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('std::duration_truncate', args, _.spec, [
    {args: [{typeId: "00000000-0000-0000-0000-00000000010e", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-000000000101", optional: false, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-00000000010e"},
    {args: [{typeId: "00000000-0000-0000-0000-000000000112", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-000000000101", optional: false, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-000000000112"},
    {args: [{typeId: "00000000-0000-0000-0000-000000000111", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-000000000101", optional: false, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-000000000111"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "std::duration_truncate",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type duration_to_secondsλFuncExpr<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$duration>>,
> = $.$expr_Function<
  "std::duration_to_seconds",
  _.castMaps.mapLiteralToTypeSet<[P1]>,
  {},
  $.TypeSet<$decimal, $.cardinalityUtil.paramCardinality<P1>>
>;
/**
 * Return duration as total number of seconds in interval.
 */
function duration_to_seconds<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$duration>>,
>(
  dur: P1,
): duration_to_secondsλFuncExpr<P1>;
function duration_to_seconds(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('std::duration_to_seconds', args, _.spec, [
    {args: [{typeId: "00000000-0000-0000-0000-00000000010e", optional: false, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-000000000108"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "std::duration_to_seconds",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type json_typeofλFuncExpr<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$json>>,
> = $.$expr_Function<
  "std::json_typeof",
  _.castMaps.mapLiteralToTypeSet<[P1]>,
  {},
  $.TypeSet<$str, $.cardinalityUtil.paramCardinality<P1>>
>;
/**
 * Return the type of the outermost JSON value as a string.
 */
function json_typeof<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$json>>,
>(
  json: P1,
): json_typeofλFuncExpr<P1>;
function json_typeof(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('std::json_typeof', args, _.spec, [
    {args: [{typeId: "00000000-0000-0000-0000-00000000010f", optional: false, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-000000000101"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "std::json_typeof",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type json_array_unpackλFuncExpr<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$json>>,
> = $.$expr_Function<
  "std::json_array_unpack",
  _.castMaps.mapLiteralToTypeSet<[P1]>,
  {},
  $.TypeSet<$json, $.Cardinality.Many>
>;
/**
 * Return elements of JSON array as a set of `json`.
 */
function json_array_unpack<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$json>>,
>(
  array: P1,
): json_array_unpackλFuncExpr<P1>;
function json_array_unpack(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('std::json_array_unpack', args, _.spec, [
    {args: [{typeId: "00000000-0000-0000-0000-00000000010f", optional: false, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-00000000010f", returnTypemod: "SetOfType"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "std::json_array_unpack",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type json_object_unpackλFuncExpr<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$json>>,
> = $.$expr_Function<
  "std::json_object_unpack",
  _.castMaps.mapLiteralToTypeSet<[P1]>,
  {},
  $.TypeSet<$.TupleType<[$str, $json]>, $.Cardinality.Many>
>;
/**
 * Return set of key/value tuples that make up the JSON object.
 */
function json_object_unpack<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$json>>,
>(
  obj: P1,
): json_object_unpackλFuncExpr<P1>;
function json_object_unpack(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('std::json_object_unpack', args, _.spec, [
    {args: [{typeId: "00000000-0000-0000-0000-00000000010f", optional: false, setoftype: false, variadic: false}], returnTypeId: "79d8ede8-30f1-a805-fbc3-503ece3c9205", returnTypemod: "SetOfType"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "std::json_object_unpack",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type json_getλFuncExpr<
  NamedArgs extends {
    "default"?: _.castMaps.orScalarLiteral<$.TypeSet<$json>>,
  },
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$json>>,
  P2 extends [_.castMaps.orScalarLiteral<$.TypeSet<$str>>, ..._.castMaps.orScalarLiteral<$.TypeSet<$str>>[]],
> = $.$expr_Function<
  "std::json_get",
  _.castMaps.mapLiteralToTypeSet<[P1, ...P2]>,
  _.castMaps.mapLiteralToTypeSet<NamedArgs>,
  $.TypeSet<$json, $.cardinalityUtil.overrideLowerBound<$.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.paramArrayCardinality<P2>>, $.cardinalityUtil.optionalParamCardinality<NamedArgs["default"]>>, 'Zero'>>
>;
type json_getλFuncExpr2<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$json>>,
  P2 extends [_.castMaps.orScalarLiteral<$.TypeSet<$str>>, ..._.castMaps.orScalarLiteral<$.TypeSet<$str>>[]],
> = $.$expr_Function<
  "std::json_get",
  _.castMaps.mapLiteralToTypeSet<[P1, ...P2]>,
  {},
  $.TypeSet<$json, $.cardinalityUtil.overrideLowerBound<$.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.paramArrayCardinality<P2>>, 'Zero'>>
>;
/**
 * Return the JSON value at the end of the specified path or an empty set.
 */
function json_get<
  NamedArgs extends {
    "default"?: _.castMaps.orScalarLiteral<$.TypeSet<$json>>,
  },
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$json>>,
  P2 extends [_.castMaps.orScalarLiteral<$.TypeSet<$str>>, ..._.castMaps.orScalarLiteral<$.TypeSet<$str>>[]],
>(
  namedArgs: NamedArgs,
  json: P1,
  ...path: P2
): json_getλFuncExpr<NamedArgs, P1, P2>;
/**
 * Return the JSON value at the end of the specified path or an empty set.
 */
function json_get<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$json>>,
  P2 extends [_.castMaps.orScalarLiteral<$.TypeSet<$str>>, ..._.castMaps.orScalarLiteral<$.TypeSet<$str>>[]],
>(
  json: P1,
  ...path: P2
): json_getλFuncExpr2<P1, P2>;
function json_get(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('std::json_get', args, _.spec, [
    {args: [{typeId: "00000000-0000-0000-0000-00000000010f", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-000000000101", optional: false, setoftype: false, variadic: true}], namedArgs: {"default": {typeId: "00000000-0000-0000-0000-00000000010f", optional: true, setoftype: false, variadic: false}}, returnTypeId: "00000000-0000-0000-0000-00000000010f", returnTypemod: "OptionalType"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "std::json_get",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type re_matchλFuncExpr<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
> = $.$expr_Function<
  "std::re_match",
  _.castMaps.mapLiteralToTypeSet<[P1, P2]>,
  {},
  $.TypeSet<$.ArrayType<$str>, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.paramCardinality<P2>>>
>;
/**
 * Find the first regular expression match in a string.
 */
function re_match<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
>(
  pattern: P1,
  str: P2,
): re_matchλFuncExpr<P1, P2>;
function re_match(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('std::re_match', args, _.spec, [
    {args: [{typeId: "00000000-0000-0000-0000-000000000101", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-000000000101", optional: false, setoftype: false, variadic: false}], returnTypeId: "05f91774-15ea-9001-038e-092c1cad80af"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "std::re_match",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type re_match_allλFuncExpr<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
> = $.$expr_Function<
  "std::re_match_all",
  _.castMaps.mapLiteralToTypeSet<[P1, P2]>,
  {},
  $.TypeSet<$.ArrayType<$str>, $.Cardinality.Many>
>;
/**
 * Find all regular expression matches in a string.
 */
function re_match_all<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
>(
  pattern: P1,
  str: P2,
): re_match_allλFuncExpr<P1, P2>;
function re_match_all(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('std::re_match_all', args, _.spec, [
    {args: [{typeId: "00000000-0000-0000-0000-000000000101", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-000000000101", optional: false, setoftype: false, variadic: false}], returnTypeId: "05f91774-15ea-9001-038e-092c1cad80af", returnTypemod: "SetOfType"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "std::re_match_all",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type re_testλFuncExpr<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
> = $.$expr_Function<
  "std::re_test",
  _.castMaps.mapLiteralToTypeSet<[P1, P2]>,
  {},
  $.TypeSet<$bool, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.paramCardinality<P2>>>
>;
/**
 * Test if a regular expression has a match in a string.
 */
function re_test<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
>(
  pattern: P1,
  str: P2,
): re_testλFuncExpr<P1, P2>;
function re_test(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('std::re_test', args, _.spec, [
    {args: [{typeId: "00000000-0000-0000-0000-000000000101", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-000000000101", optional: false, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-000000000109"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "std::re_test",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type re_replaceλFuncExpr<
  NamedArgs extends {
    "flags"?: _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
  },
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
  P3 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
> = $.$expr_Function<
  "std::re_replace",
  _.castMaps.mapLiteralToTypeSet<[P1, P2, P3]>,
  _.castMaps.mapLiteralToTypeSet<NamedArgs>,
  $.TypeSet<$str, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.paramCardinality<P2>>, $.cardinalityUtil.paramCardinality<P3>>, $.cardinalityUtil.optionalParamCardinality<NamedArgs["flags"]>>>
>;
type re_replaceλFuncExpr2<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
  P3 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
> = $.$expr_Function<
  "std::re_replace",
  _.castMaps.mapLiteralToTypeSet<[P1, P2, P3]>,
  {},
  $.TypeSet<$str, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.paramCardinality<P2>>, $.cardinalityUtil.paramCardinality<P3>>>
>;
/**
 * Replace matching substrings in a given string.
 */
function re_replace<
  NamedArgs extends {
    "flags"?: _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
  },
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
  P3 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
>(
  namedArgs: NamedArgs,
  pattern: P1,
  sub: P2,
  str: P3,
): re_replaceλFuncExpr<NamedArgs, P1, P2, P3>;
/**
 * Replace matching substrings in a given string.
 */
function re_replace<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
  P3 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
>(
  pattern: P1,
  sub: P2,
  str: P3,
): re_replaceλFuncExpr2<P1, P2, P3>;
function re_replace(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('std::re_replace', args, _.spec, [
    {args: [{typeId: "00000000-0000-0000-0000-000000000101", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-000000000101", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-000000000101", optional: false, setoftype: false, variadic: false}], namedArgs: {"flags": {typeId: "00000000-0000-0000-0000-000000000101", optional: true, setoftype: false, variadic: false}}, returnTypeId: "00000000-0000-0000-0000-000000000101"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "std::re_replace",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type str_repeatλFuncExpr<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
> = $.$expr_Function<
  "std::str_repeat",
  _.castMaps.mapLiteralToTypeSet<[P1, P2]>,
  {},
  $.TypeSet<$str, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.paramCardinality<P2>>>
>;
/**
 * Repeat the input *string* *n* times.
 */
function str_repeat<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
>(
  s: P1,
  n: P2,
): str_repeatλFuncExpr<P1, P2>;
function str_repeat(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('std::str_repeat', args, _.spec, [
    {args: [{typeId: "00000000-0000-0000-0000-000000000101", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-0000000001ff", optional: false, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-000000000101"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "std::str_repeat",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type str_lowerλFuncExpr<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
> = $.$expr_Function<
  "std::str_lower",
  _.castMaps.mapLiteralToTypeSet<[P1]>,
  {},
  $.TypeSet<$str, $.cardinalityUtil.paramCardinality<P1>>
>;
/**
 * Return a lowercase copy of the input *string*.
 */
function str_lower<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
>(
  s: P1,
): str_lowerλFuncExpr<P1>;
function str_lower(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('std::str_lower', args, _.spec, [
    {args: [{typeId: "00000000-0000-0000-0000-000000000101", optional: false, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-000000000101"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "std::str_lower",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type str_upperλFuncExpr<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
> = $.$expr_Function<
  "std::str_upper",
  _.castMaps.mapLiteralToTypeSet<[P1]>,
  {},
  $.TypeSet<$str, $.cardinalityUtil.paramCardinality<P1>>
>;
/**
 * Return an uppercase copy of the input *string*.
 */
function str_upper<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
>(
  s: P1,
): str_upperλFuncExpr<P1>;
function str_upper(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('std::str_upper', args, _.spec, [
    {args: [{typeId: "00000000-0000-0000-0000-000000000101", optional: false, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-000000000101"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "std::str_upper",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type str_titleλFuncExpr<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
> = $.$expr_Function<
  "std::str_title",
  _.castMaps.mapLiteralToTypeSet<[P1]>,
  {},
  $.TypeSet<$str, $.cardinalityUtil.paramCardinality<P1>>
>;
/**
 * Return a titlecase copy of the input *string*.
 */
function str_title<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
>(
  s: P1,
): str_titleλFuncExpr<P1>;
function str_title(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('std::str_title', args, _.spec, [
    {args: [{typeId: "00000000-0000-0000-0000-000000000101", optional: false, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-000000000101"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "std::str_title",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type str_pad_startλFuncExpr<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
  P3 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>> | undefined,
> = $.$expr_Function<
  "std::str_pad_start",
  _.castMaps.mapLiteralToTypeSet<[P1, P2, P3]>,
  {},
  $.TypeSet<$str, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.paramCardinality<P2>>, $.cardinalityUtil.optionalParamCardinality<P3>>>
>;
/**
 * Return the input string padded at the start to the length *n*.
 */
function str_pad_start<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
  P3 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>> | undefined,
>(
  s: P1,
  n: P2,
  fill?: P3,
): str_pad_startλFuncExpr<P1, P2, P3>;
function str_pad_start(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('std::str_pad_start', args, _.spec, [
    {args: [{typeId: "00000000-0000-0000-0000-000000000101", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-0000000001ff", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-000000000101", optional: true, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-000000000101"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "std::str_pad_start",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type str_lpadλFuncExpr<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
  P3 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>> | undefined,
> = $.$expr_Function<
  "std::str_lpad",
  _.castMaps.mapLiteralToTypeSet<[P1, P2, P3]>,
  {},
  $.TypeSet<$str, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.paramCardinality<P2>>, $.cardinalityUtil.optionalParamCardinality<P3>>>
>;
/**
 * Return the input string left-padded to the length *n*.
 */
function str_lpad<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
  P3 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>> | undefined,
>(
  s: P1,
  n: P2,
  fill?: P3,
): str_lpadλFuncExpr<P1, P2, P3>;
function str_lpad(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('std::str_lpad', args, _.spec, [
    {args: [{typeId: "00000000-0000-0000-0000-000000000101", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-0000000001ff", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-000000000101", optional: true, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-000000000101"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "std::str_lpad",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type str_pad_endλFuncExpr<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
  P3 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>> | undefined,
> = $.$expr_Function<
  "std::str_pad_end",
  _.castMaps.mapLiteralToTypeSet<[P1, P2, P3]>,
  {},
  $.TypeSet<$str, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.paramCardinality<P2>>, $.cardinalityUtil.optionalParamCardinality<P3>>>
>;
/**
 * Return the input string padded at the end to the length *n*.
 */
function str_pad_end<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
  P3 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>> | undefined,
>(
  s: P1,
  n: P2,
  fill?: P3,
): str_pad_endλFuncExpr<P1, P2, P3>;
function str_pad_end(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('std::str_pad_end', args, _.spec, [
    {args: [{typeId: "00000000-0000-0000-0000-000000000101", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-0000000001ff", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-000000000101", optional: true, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-000000000101"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "std::str_pad_end",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type str_rpadλFuncExpr<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
  P3 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>> | undefined,
> = $.$expr_Function<
  "std::str_rpad",
  _.castMaps.mapLiteralToTypeSet<[P1, P2, P3]>,
  {},
  $.TypeSet<$str, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.paramCardinality<P2>>, $.cardinalityUtil.optionalParamCardinality<P3>>>
>;
/**
 * Return the input string right-padded to the length *n*.
 */
function str_rpad<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
  P3 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>> | undefined,
>(
  s: P1,
  n: P2,
  fill?: P3,
): str_rpadλFuncExpr<P1, P2, P3>;
function str_rpad(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('std::str_rpad', args, _.spec, [
    {args: [{typeId: "00000000-0000-0000-0000-000000000101", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-0000000001ff", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-000000000101", optional: true, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-000000000101"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "std::str_rpad",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type str_trim_startλFuncExpr<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>> | undefined,
> = $.$expr_Function<
  "std::str_trim_start",
  _.castMaps.mapLiteralToTypeSet<[P1, P2]>,
  {},
  $.TypeSet<$str, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.optionalParamCardinality<P2>>>
>;
/**
 * Return the input string with all *trim* characters removed from its start.
 */
function str_trim_start<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>> | undefined,
>(
  s: P1,
  tr?: P2,
): str_trim_startλFuncExpr<P1, P2>;
function str_trim_start(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('std::str_trim_start', args, _.spec, [
    {args: [{typeId: "00000000-0000-0000-0000-000000000101", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-000000000101", optional: true, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-000000000101"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "std::str_trim_start",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type str_ltrimλFuncExpr<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>> | undefined,
> = $.$expr_Function<
  "std::str_ltrim",
  _.castMaps.mapLiteralToTypeSet<[P1, P2]>,
  {},
  $.TypeSet<$str, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.optionalParamCardinality<P2>>>
>;
/**
 * Return the input string with all leftmost *trim* characters removed.
 */
function str_ltrim<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>> | undefined,
>(
  s: P1,
  tr?: P2,
): str_ltrimλFuncExpr<P1, P2>;
function str_ltrim(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('std::str_ltrim', args, _.spec, [
    {args: [{typeId: "00000000-0000-0000-0000-000000000101", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-000000000101", optional: true, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-000000000101"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "std::str_ltrim",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type str_trim_endλFuncExpr<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>> | undefined,
> = $.$expr_Function<
  "std::str_trim_end",
  _.castMaps.mapLiteralToTypeSet<[P1, P2]>,
  {},
  $.TypeSet<$str, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.optionalParamCardinality<P2>>>
>;
/**
 * Return the input string with all *trim* characters removed from its end.
 */
function str_trim_end<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>> | undefined,
>(
  s: P1,
  tr?: P2,
): str_trim_endλFuncExpr<P1, P2>;
function str_trim_end(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('std::str_trim_end', args, _.spec, [
    {args: [{typeId: "00000000-0000-0000-0000-000000000101", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-000000000101", optional: true, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-000000000101"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "std::str_trim_end",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type str_rtrimλFuncExpr<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>> | undefined,
> = $.$expr_Function<
  "std::str_rtrim",
  _.castMaps.mapLiteralToTypeSet<[P1, P2]>,
  {},
  $.TypeSet<$str, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.optionalParamCardinality<P2>>>
>;
/**
 * Return the input string with all rightmost *trim* characters removed.
 */
function str_rtrim<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>> | undefined,
>(
  s: P1,
  tr?: P2,
): str_rtrimλFuncExpr<P1, P2>;
function str_rtrim(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('std::str_rtrim', args, _.spec, [
    {args: [{typeId: "00000000-0000-0000-0000-000000000101", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-000000000101", optional: true, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-000000000101"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "std::str_rtrim",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type str_trimλFuncExpr<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>> | undefined,
> = $.$expr_Function<
  "std::str_trim",
  _.castMaps.mapLiteralToTypeSet<[P1, P2]>,
  {},
  $.TypeSet<$str, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.optionalParamCardinality<P2>>>
>;
/**
 * Return the input string with *trim* characters removed from both ends.
 */
function str_trim<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>> | undefined,
>(
  s: P1,
  tr?: P2,
): str_trimλFuncExpr<P1, P2>;
function str_trim(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('std::str_trim', args, _.spec, [
    {args: [{typeId: "00000000-0000-0000-0000-000000000101", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-000000000101", optional: true, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-000000000101"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "std::str_trim",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type str_splitλFuncExpr<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
> = $.$expr_Function<
  "std::str_split",
  _.castMaps.mapLiteralToTypeSet<[P1, P2]>,
  {},
  $.TypeSet<$.ArrayType<$str>, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.paramCardinality<P2>>>
>;
/**
 * Split string into array elements using the supplied delimiter.
 */
function str_split<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
>(
  s: P1,
  delimiter: P2,
): str_splitλFuncExpr<P1, P2>;
function str_split(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('std::str_split', args, _.spec, [
    {args: [{typeId: "00000000-0000-0000-0000-000000000101", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-000000000101", optional: false, setoftype: false, variadic: false}], returnTypeId: "05f91774-15ea-9001-038e-092c1cad80af"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "std::str_split",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type str_replaceλFuncExpr<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
  P3 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
> = $.$expr_Function<
  "std::str_replace",
  _.castMaps.mapLiteralToTypeSet<[P1, P2, P3]>,
  {},
  $.TypeSet<$str, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.paramCardinality<P2>>, $.cardinalityUtil.paramCardinality<P3>>>
>;
/**
 * Given a string, find a matching substring and replace all its occurrences with a new substring.
 */
function str_replace<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
  P3 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
>(
  s: P1,
  old: P2,
  new_2: P3,
): str_replaceλFuncExpr<P1, P2, P3>;
function str_replace(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('std::str_replace', args, _.spec, [
    {args: [{typeId: "00000000-0000-0000-0000-000000000101", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-000000000101", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-000000000101", optional: false, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-000000000101"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "std::str_replace",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type str_reverseλFuncExpr<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
> = $.$expr_Function<
  "std::str_reverse",
  _.castMaps.mapLiteralToTypeSet<[P1]>,
  {},
  $.TypeSet<$str, $.cardinalityUtil.paramCardinality<P1>>
>;
/**
 * Reverse the order of the characters in the string.
 */
function str_reverse<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
>(
  s: P1,
): str_reverseλFuncExpr<P1>;
function str_reverse(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('std::str_reverse', args, _.spec, [
    {args: [{typeId: "00000000-0000-0000-0000-000000000101", optional: false, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-000000000101"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "std::str_reverse",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type uuid_generate_v1mcλFuncExpr = $.$expr_Function<
  "std::uuid_generate_v1mc",
  [],
  {},
  $.TypeSet<$uuid, $.Cardinality.One>
>;
/**
 * Return a version 1 UUID.
 */
function uuid_generate_v1mc(): uuid_generate_v1mcλFuncExpr;
function uuid_generate_v1mc(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('std::uuid_generate_v1mc', args, _.spec, [
    {args: [], returnTypeId: "00000000-0000-0000-0000-000000000100"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "std::uuid_generate_v1mc",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type uuid_generate_v4λFuncExpr = $.$expr_Function<
  "std::uuid_generate_v4",
  [],
  {},
  $.TypeSet<$uuid, $.Cardinality.One>
>;
/**
 * Return a version 4 UUID.
 */
function uuid_generate_v4(): uuid_generate_v4λFuncExpr;
function uuid_generate_v4(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('std::uuid_generate_v4', args, _.spec, [
    {args: [], returnTypeId: "00000000-0000-0000-0000-000000000100"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "std::uuid_generate_v4",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

const range = _.syntax.$range;

type range_is_emptyλFuncExpr<
  P1 extends $.TypeSet<$.RangeType<$anypoint>>,
> = $.$expr_Function<
  "std::range_is_empty",
  [P1],
  {},
  $.TypeSet<$bool, $.cardinalityUtil.paramCardinality<P1>>
>;
function range_is_empty<
  P1 extends $.TypeSet<$.RangeType<$anypoint>>,
>(
  val: P1,
): range_is_emptyλFuncExpr<P1>;
function range_is_empty(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('std::range_is_empty', args, _.spec, [
    {args: [{typeId: "ef11779e-e3c8-8225-93d0-5cff264f4228", optional: false, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-000000000109"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "std::range_is_empty",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type range_unpackλFuncExpr<
  P1 extends $.TypeSet<$.RangeType<$int32>>,
> = $.$expr_Function<
  "std::range_unpack",
  [P1],
  {},
  $.TypeSet<$number, $.Cardinality.Many>
>;
type range_unpackλFuncExpr2<
  P1 extends $.TypeSet<$.RangeType<$int64>>,
> = $.$expr_Function<
  "std::range_unpack",
  [P1],
  {},
  $.TypeSet<$number, $.Cardinality.Many>
>;
type range_unpackλFuncExpr3<
  P1 extends $.TypeSet<$.RangeType<_cal.$local_date>>,
> = $.$expr_Function<
  "std::range_unpack",
  [P1],
  {},
  $.TypeSet<_cal.$local_date, $.Cardinality.Many>
>;
type range_unpackλFuncExpr4<
  P1 extends $.TypeSet<$.RangeType<$int32>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
> = $.$expr_Function<
  "std::range_unpack",
  _.castMaps.mapLiteralToTypeSet<[P1, P2]>,
  {},
  $.TypeSet<$number, $.Cardinality.Many>
>;
type range_unpackλFuncExpr5<
  P1 extends $.TypeSet<$.RangeType<$int64>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
> = $.$expr_Function<
  "std::range_unpack",
  _.castMaps.mapLiteralToTypeSet<[P1, P2]>,
  {},
  $.TypeSet<$number, $.Cardinality.Many>
>;
type range_unpackλFuncExpr6<
  P1 extends $.TypeSet<$.RangeType<$float32>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
> = $.$expr_Function<
  "std::range_unpack",
  _.castMaps.mapLiteralToTypeSet<[P1, P2]>,
  {},
  $.TypeSet<$number, $.Cardinality.Many>
>;
type range_unpackλFuncExpr7<
  P1 extends $.TypeSet<$.RangeType<$float64>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
> = $.$expr_Function<
  "std::range_unpack",
  _.castMaps.mapLiteralToTypeSet<[P1, P2]>,
  {},
  $.TypeSet<$number, $.Cardinality.Many>
>;
type range_unpackλFuncExpr8<
  P1 extends $.TypeSet<$.RangeType<$datetime>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$duration>>,
> = $.$expr_Function<
  "std::range_unpack",
  _.castMaps.mapLiteralToTypeSet<[P1, P2]>,
  {},
  $.TypeSet<$datetime, $.Cardinality.Many>
>;
type range_unpackλFuncExpr9<
  P1 extends $.TypeSet<$.RangeType<_cal.$local_date>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<_cal.$date_duration>>,
> = $.$expr_Function<
  "std::range_unpack",
  _.castMaps.mapLiteralToTypeSet<[P1, P2]>,
  {},
  $.TypeSet<_cal.$local_date, $.Cardinality.Many>
>;
type range_unpackλFuncExpr10<
  P1 extends $.TypeSet<$.RangeType<$decimalλICastableTo>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$decimalλICastableTo>>,
> = $.$expr_Function<
  "std::range_unpack",
  _.castMaps.mapLiteralToTypeSet<[P1, P2]>,
  {},
  $.TypeSet<$decimal, $.Cardinality.Many>
>;
type range_unpackλFuncExpr11<
  P1 extends $.TypeSet<$.RangeType<_cal.$local_datetimeλICastableTo>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<_cal.$relative_durationλICastableTo>>,
> = $.$expr_Function<
  "std::range_unpack",
  _.castMaps.mapLiteralToTypeSet<[P1, P2]>,
  {},
  $.TypeSet<_cal.$local_datetime, $.Cardinality.Many>
>;
function range_unpack<
  P1 extends $.TypeSet<$.RangeType<$int32>>,
>(
  val: P1,
): range_unpackλFuncExpr<P1>;
function range_unpack<
  P1 extends $.TypeSet<$.RangeType<$int64>>,
>(
  val: P1,
): range_unpackλFuncExpr2<P1>;
function range_unpack<
  P1 extends $.TypeSet<$.RangeType<_cal.$local_date>>,
>(
  val: P1,
): range_unpackλFuncExpr3<P1>;
function range_unpack<
  P1 extends $.TypeSet<$.RangeType<$int32>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
>(
  val: P1,
  step: P2,
): range_unpackλFuncExpr4<P1, P2>;
function range_unpack<
  P1 extends $.TypeSet<$.RangeType<$int64>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
>(
  val: P1,
  step: P2,
): range_unpackλFuncExpr5<P1, P2>;
function range_unpack<
  P1 extends $.TypeSet<$.RangeType<$float32>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
>(
  val: P1,
  step: P2,
): range_unpackλFuncExpr6<P1, P2>;
function range_unpack<
  P1 extends $.TypeSet<$.RangeType<$float64>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
>(
  val: P1,
  step: P2,
): range_unpackλFuncExpr7<P1, P2>;
function range_unpack<
  P1 extends $.TypeSet<$.RangeType<$datetime>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$duration>>,
>(
  val: P1,
  step: P2,
): range_unpackλFuncExpr8<P1, P2>;
function range_unpack<
  P1 extends $.TypeSet<$.RangeType<_cal.$local_date>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<_cal.$date_duration>>,
>(
  val: P1,
  step: P2,
): range_unpackλFuncExpr9<P1, P2>;
function range_unpack<
  P1 extends $.TypeSet<$.RangeType<$decimalλICastableTo>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$decimalλICastableTo>>,
>(
  val: P1,
  step: P2,
): range_unpackλFuncExpr10<P1, P2>;
function range_unpack<
  P1 extends $.TypeSet<$.RangeType<_cal.$local_datetimeλICastableTo>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<_cal.$relative_durationλICastableTo>>,
>(
  val: P1,
  step: P2,
): range_unpackλFuncExpr11<P1, P2>;
function range_unpack(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('std::range_unpack', args, _.spec, [
    {args: [{typeId: "9cd6f1bb-820a-e4e0-15cf-bc45c4e7baa0", optional: false, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-0000000001ff", returnTypemod: "SetOfType"},
    {args: [{typeId: "2dcd88a1-d377-baa4-c12e-d4abfef28c86", optional: false, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-0000000001ff", returnTypemod: "SetOfType"},
    {args: [{typeId: "ca752a6b-54a8-ba10-285b-13a79b02a110", optional: false, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-00000000010c", returnTypemod: "SetOfType"},
    {args: [{typeId: "9cd6f1bb-820a-e4e0-15cf-bc45c4e7baa0", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-0000000001ff", optional: false, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-0000000001ff", returnTypemod: "SetOfType"},
    {args: [{typeId: "2dcd88a1-d377-baa4-c12e-d4abfef28c86", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-0000000001ff", optional: false, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-0000000001ff", returnTypemod: "SetOfType"},
    {args: [{typeId: "e0169746-82b2-efaf-ec9e-fea17257877c", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-0000000001ff", optional: false, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-0000000001ff", returnTypemod: "SetOfType"},
    {args: [{typeId: "b5052505-ceb2-a54d-f438-97a8f6a2120b", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-0000000001ff", optional: false, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-0000000001ff", returnTypemod: "SetOfType"},
    {args: [{typeId: "1847fc4b-5f10-5b74-8257-168c3a85faa5", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-00000000010e", optional: false, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-00000000010a", returnTypemod: "SetOfType"},
    {args: [{typeId: "ca752a6b-54a8-ba10-285b-13a79b02a110", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-000000000112", optional: false, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-00000000010c", returnTypemod: "SetOfType"},
    {args: [{typeId: "c98e3620-6f26-d050-921e-24fbfb0b5873", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-000000000108", optional: false, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-000000000108", returnTypemod: "SetOfType"},
    {args: [{typeId: "31bc1223-f64b-a6f0-b9b3-c7f3df5321dc", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-000000000111", optional: false, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-00000000010b", returnTypemod: "SetOfType"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "std::range_unpack",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type range_get_upperλFuncExpr<
  P1 extends $.TypeSet<$.RangeType<$anypoint>>,
> = $.$expr_Function<
  "std::range_get_upper",
  [P1],
  {},
  $.TypeSet<$.getPrimitiveBaseType<P1["__element__"]["__element__"]>, $.cardinalityUtil.overrideLowerBound<$.cardinalityUtil.paramCardinality<P1>, 'Zero'>>
>;
function range_get_upper<
  P1 extends $.TypeSet<$.RangeType<$anypoint>>,
>(
  r: P1,
): range_get_upperλFuncExpr<P1>;
function range_get_upper(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('std::range_get_upper', args, _.spec, [
    {args: [{typeId: "ef11779e-e3c8-8225-93d0-5cff264f4228", optional: false, setoftype: false, variadic: false}], returnTypeId: "048e9a16-06d1-11ed-a488-81ecd69e27a7", returnTypemod: "OptionalType"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "std::range_get_upper",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type range_get_lowerλFuncExpr<
  P1 extends $.TypeSet<$.RangeType<$anypoint>>,
> = $.$expr_Function<
  "std::range_get_lower",
  [P1],
  {},
  $.TypeSet<$.getPrimitiveBaseType<P1["__element__"]["__element__"]>, $.cardinalityUtil.overrideLowerBound<$.cardinalityUtil.paramCardinality<P1>, 'Zero'>>
>;
function range_get_lower<
  P1 extends $.TypeSet<$.RangeType<$anypoint>>,
>(
  r: P1,
): range_get_lowerλFuncExpr<P1>;
function range_get_lower(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('std::range_get_lower', args, _.spec, [
    {args: [{typeId: "ef11779e-e3c8-8225-93d0-5cff264f4228", optional: false, setoftype: false, variadic: false}], returnTypeId: "048e9a16-06d1-11ed-a488-81ecd69e27a7", returnTypemod: "OptionalType"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "std::range_get_lower",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type range_is_inclusive_upperλFuncExpr<
  P1 extends $.TypeSet<$.RangeType<$anypoint>>,
> = $.$expr_Function<
  "std::range_is_inclusive_upper",
  [P1],
  {},
  $.TypeSet<$bool, $.cardinalityUtil.paramCardinality<P1>>
>;
function range_is_inclusive_upper<
  P1 extends $.TypeSet<$.RangeType<$anypoint>>,
>(
  r: P1,
): range_is_inclusive_upperλFuncExpr<P1>;
function range_is_inclusive_upper(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('std::range_is_inclusive_upper', args, _.spec, [
    {args: [{typeId: "ef11779e-e3c8-8225-93d0-5cff264f4228", optional: false, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-000000000109"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "std::range_is_inclusive_upper",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type range_is_inclusive_lowerλFuncExpr<
  P1 extends $.TypeSet<$.RangeType<$anypoint>>,
> = $.$expr_Function<
  "std::range_is_inclusive_lower",
  [P1],
  {},
  $.TypeSet<$bool, $.cardinalityUtil.paramCardinality<P1>>
>;
function range_is_inclusive_lower<
  P1 extends $.TypeSet<$.RangeType<$anypoint>>,
>(
  r: P1,
): range_is_inclusive_lowerλFuncExpr<P1>;
function range_is_inclusive_lower(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('std::range_is_inclusive_lower', args, _.spec, [
    {args: [{typeId: "ef11779e-e3c8-8225-93d0-5cff264f4228", optional: false, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-000000000109"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "std::range_is_inclusive_lower",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type overlapsλFuncExpr<
  P1 extends $.TypeSet<$.RangeType<$anypoint>>,
  P2 extends $.TypeSet<$.RangeType<$.getPrimitiveBaseType<P1["__element__"]["__element__"]>>>,
> = $.$expr_Function<
  "std::overlaps",
  [P1, P2],
  {},
  $.TypeSet<$bool, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.paramCardinality<P2>>>
>;
function overlaps<
  P1 extends $.TypeSet<$.RangeType<$anypoint>>,
  P2 extends $.TypeSet<$.RangeType<$.getPrimitiveBaseType<P1["__element__"]["__element__"]>>>,
>(
  l: P1,
  r: P2,
): overlapsλFuncExpr<P1, P2>;
function overlaps(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('std::overlaps', args, _.spec, [
    {args: [{typeId: "ef11779e-e3c8-8225-93d0-5cff264f4228", optional: false, setoftype: false, variadic: false}, {typeId: "ef11779e-e3c8-8225-93d0-5cff264f4228", optional: false, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-000000000109"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "std::overlaps",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type to_strλFuncExpr<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$datetime>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>> | undefined,
> = $.$expr_Function<
  "std::to_str",
  _.castMaps.mapLiteralToTypeSet<[P1, P2]>,
  {},
  $.TypeSet<$str, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.optionalParamCardinality<P2>>>
>;
type to_strλFuncExpr2<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$duration>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>> | undefined,
> = $.$expr_Function<
  "std::to_str",
  _.castMaps.mapLiteralToTypeSet<[P1, P2]>,
  {},
  $.TypeSet<$str, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.optionalParamCardinality<P2>>>
>;
type to_strλFuncExpr3<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>> | undefined,
> = $.$expr_Function<
  "std::to_str",
  _.castMaps.mapLiteralToTypeSet<[P1, P2]>,
  {},
  $.TypeSet<$str, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.optionalParamCardinality<P2>>>
>;
type to_strλFuncExpr4<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$bigint>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>> | undefined,
> = $.$expr_Function<
  "std::to_str",
  _.castMaps.mapLiteralToTypeSet<[P1, P2]>,
  {},
  $.TypeSet<$str, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.optionalParamCardinality<P2>>>
>;
type to_strλFuncExpr5<
  P1 extends $.TypeSet<$.ArrayType<$str>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
> = $.$expr_Function<
  "std::to_str",
  _.castMaps.mapLiteralToTypeSet<[P1, P2]>,
  {},
  $.TypeSet<$str, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.paramCardinality<P2>>>
>;
type to_strλFuncExpr6<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$json>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>> | undefined,
> = $.$expr_Function<
  "std::to_str",
  _.castMaps.mapLiteralToTypeSet<[P1, P2]>,
  {},
  $.TypeSet<$str, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.optionalParamCardinality<P2>>>
>;
type to_strλFuncExpr7<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<_cal.$local_date>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>> | undefined,
> = $.$expr_Function<
  "std::to_str",
  _.castMaps.mapLiteralToTypeSet<[P1, P2]>,
  {},
  $.TypeSet<$str, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.optionalParamCardinality<P2>>>
>;
type to_strλFuncExpr8<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<_cal.$local_time>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>> | undefined,
> = $.$expr_Function<
  "std::to_str",
  _.castMaps.mapLiteralToTypeSet<[P1, P2]>,
  {},
  $.TypeSet<$str, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.optionalParamCardinality<P2>>>
>;
type to_strλFuncExpr9<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$decimalλICastableTo>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>> | undefined,
> = $.$expr_Function<
  "std::to_str",
  _.castMaps.mapLiteralToTypeSet<[P1, P2]>,
  {},
  $.TypeSet<$str, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.optionalParamCardinality<P2>>>
>;
type to_strλFuncExpr10<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<_cal.$local_datetimeλICastableTo>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>> | undefined,
> = $.$expr_Function<
  "std::to_str",
  _.castMaps.mapLiteralToTypeSet<[P1, P2]>,
  {},
  $.TypeSet<$str, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.optionalParamCardinality<P2>>>
>;
type to_strλFuncExpr11<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<_cal.$relative_durationλICastableTo>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>> | undefined,
> = $.$expr_Function<
  "std::to_str",
  _.castMaps.mapLiteralToTypeSet<[P1, P2]>,
  {},
  $.TypeSet<$str, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.optionalParamCardinality<P2>>>
>;
/**
 * Return string representation of the input value.
 */
function to_str<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$datetime>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>> | undefined,
>(
  dt: P1,
  fmt?: P2,
): to_strλFuncExpr<P1, P2>;
/**
 * Return string representation of the input value.
 */
function to_str<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$duration>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>> | undefined,
>(
  td: P1,
  fmt?: P2,
): to_strλFuncExpr2<P1, P2>;
/**
 * Return string representation of the input value.
 */
function to_str<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>> | undefined,
>(
  i: P1,
  fmt?: P2,
): to_strλFuncExpr3<P1, P2>;
/**
 * Return string representation of the input value.
 */
function to_str<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$bigint>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>> | undefined,
>(
  d: P1,
  fmt?: P2,
): to_strλFuncExpr4<P1, P2>;
/**
 * Return string representation of the input value.
 */
function to_str<
  P1 extends $.TypeSet<$.ArrayType<$str>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
>(
  array: P1,
  delimiter: P2,
): to_strλFuncExpr5<P1, P2>;
/**
 * Return string representation of the input value.
 */
function to_str<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$json>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>> | undefined,
>(
  json: P1,
  fmt?: P2,
): to_strλFuncExpr6<P1, P2>;
/**
 * Return string representation of the input value.
 */
function to_str<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<_cal.$local_date>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>> | undefined,
>(
  d: P1,
  fmt?: P2,
): to_strλFuncExpr7<P1, P2>;
/**
 * Return string representation of the input value.
 */
function to_str<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<_cal.$local_time>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>> | undefined,
>(
  nt: P1,
  fmt?: P2,
): to_strλFuncExpr8<P1, P2>;
/**
 * Return string representation of the input value.
 */
function to_str<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$decimalλICastableTo>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>> | undefined,
>(
  d: P1,
  fmt?: P2,
): to_strλFuncExpr9<P1, P2>;
/**
 * Return string representation of the input value.
 */
function to_str<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<_cal.$local_datetimeλICastableTo>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>> | undefined,
>(
  dt: P1,
  fmt?: P2,
): to_strλFuncExpr10<P1, P2>;
/**
 * Return string representation of the input value.
 */
function to_str<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<_cal.$relative_durationλICastableTo>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>> | undefined,
>(
  rd: P1,
  fmt?: P2,
): to_strλFuncExpr11<P1, P2>;
function to_str(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('std::to_str', args, _.spec, [
    {args: [{typeId: "00000000-0000-0000-0000-00000000010a", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-000000000101", optional: true, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-000000000101"},
    {args: [{typeId: "00000000-0000-0000-0000-00000000010e", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-000000000101", optional: true, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-000000000101"},
    {args: [{typeId: "00000000-0000-0000-0000-0000000001ff", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-000000000101", optional: true, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-000000000101"},
    {args: [{typeId: "00000000-0000-0000-0000-000000000110", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-000000000101", optional: true, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-000000000101"},
    {args: [{typeId: "05f91774-15ea-9001-038e-092c1cad80af", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-000000000101", optional: false, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-000000000101"},
    {args: [{typeId: "00000000-0000-0000-0000-00000000010f", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-000000000101", optional: true, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-000000000101"},
    {args: [{typeId: "00000000-0000-0000-0000-00000000010c", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-000000000101", optional: true, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-000000000101"},
    {args: [{typeId: "00000000-0000-0000-0000-00000000010d", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-000000000101", optional: true, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-000000000101"},
    {args: [{typeId: "00000000-0000-0000-0000-000000000108", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-000000000101", optional: true, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-000000000101"},
    {args: [{typeId: "00000000-0000-0000-0000-00000000010b", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-000000000101", optional: true, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-000000000101"},
    {args: [{typeId: "00000000-0000-0000-0000-000000000111", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-000000000101", optional: true, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-000000000101"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "std::to_str",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type to_jsonλFuncExpr<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
> = $.$expr_Function<
  "std::to_json",
  _.castMaps.mapLiteralToTypeSet<[P1]>,
  {},
  $.TypeSet<$json, $.cardinalityUtil.paramCardinality<P1>>
>;
/**
 * Return JSON value represented by the input *string*.
 */
function to_json<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
>(
  str: P1,
): to_jsonλFuncExpr<P1>;
function to_json(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('std::to_json', args, _.spec, [
    {args: [{typeId: "00000000-0000-0000-0000-000000000101", optional: false, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-00000000010f"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "std::to_json",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type to_datetimeλFuncExpr<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
> = $.$expr_Function<
  "std::to_datetime",
  _.castMaps.mapLiteralToTypeSet<[P1]>,
  {},
  $.TypeSet<$datetime, $.cardinalityUtil.paramCardinality<P1>>
>;
type to_datetimeλFuncExpr2<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>> | undefined,
> = $.$expr_Function<
  "std::to_datetime",
  _.castMaps.mapLiteralToTypeSet<[P1, P2]>,
  {},
  $.TypeSet<$datetime, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.optionalParamCardinality<P2>>>
>;
type to_datetimeλFuncExpr3<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
  P3 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
  P4 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
  P5 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
  P6 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
  P7 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
> = $.$expr_Function<
  "std::to_datetime",
  _.castMaps.mapLiteralToTypeSet<[P1, P2, P3, P4, P5, P6, P7]>,
  {},
  $.TypeSet<$datetime, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.paramCardinality<P2>>, $.cardinalityUtil.paramCardinality<P3>>, $.cardinalityUtil.paramCardinality<P4>>, $.cardinalityUtil.paramCardinality<P5>>, $.cardinalityUtil.paramCardinality<P6>>, $.cardinalityUtil.paramCardinality<P7>>>
>;
type to_datetimeλFuncExpr4<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$decimalλICastableTo>>,
> = $.$expr_Function<
  "std::to_datetime",
  _.castMaps.mapLiteralToTypeSet<[P1]>,
  {},
  $.TypeSet<$datetime, $.cardinalityUtil.paramCardinality<P1>>
>;
type to_datetimeλFuncExpr5<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<_cal.$local_datetimeλICastableTo>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
> = $.$expr_Function<
  "std::to_datetime",
  _.castMaps.mapLiteralToTypeSet<[P1, P2]>,
  {},
  $.TypeSet<$datetime, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.paramCardinality<P2>>>
>;
/**
 * Create a `datetime` value.
 */
function to_datetime<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
>(
  epochseconds: P1,
): to_datetimeλFuncExpr<P1>;
/**
 * Create a `datetime` value.
 */
function to_datetime<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>> | undefined,
>(
  s: P1,
  fmt?: P2,
): to_datetimeλFuncExpr2<P1, P2>;
/**
 * Create a `datetime` value.
 */
function to_datetime<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
  P3 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
  P4 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
  P5 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
  P6 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
  P7 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
>(
  year: P1,
  month: P2,
  day: P3,
  hour: P4,
  min: P5,
  sec: P6,
  timezone: P7,
): to_datetimeλFuncExpr3<P1, P2, P3, P4, P5, P6, P7>;
/**
 * Create a `datetime` value.
 */
function to_datetime<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$decimalλICastableTo>>,
>(
  epochseconds: P1,
): to_datetimeλFuncExpr4<P1>;
/**
 * Create a `datetime` value.
 */
function to_datetime<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<_cal.$local_datetimeλICastableTo>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
>(
  local: P1,
  zone: P2,
): to_datetimeλFuncExpr5<P1, P2>;
function to_datetime(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('std::to_datetime', args, _.spec, [
    {args: [{typeId: "00000000-0000-0000-0000-0000000001ff", optional: false, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-00000000010a"},
    {args: [{typeId: "00000000-0000-0000-0000-000000000101", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-000000000101", optional: true, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-00000000010a"},
    {args: [{typeId: "00000000-0000-0000-0000-0000000001ff", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-0000000001ff", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-0000000001ff", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-0000000001ff", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-0000000001ff", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-0000000001ff", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-000000000101", optional: false, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-00000000010a"},
    {args: [{typeId: "00000000-0000-0000-0000-000000000108", optional: false, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-00000000010a"},
    {args: [{typeId: "00000000-0000-0000-0000-00000000010b", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-000000000101", optional: false, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-00000000010a"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "std::to_datetime",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type to_durationλFuncExpr<
  NamedArgs extends {
    "hours"?: _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
    "minutes"?: _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
    "seconds"?: _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
    "microseconds"?: _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
  },
> = $.$expr_Function<
  "std::to_duration",
  [],
  _.castMaps.mapLiteralToTypeSet<NamedArgs>,
  $.TypeSet<$duration, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.optionalParamCardinality<NamedArgs["hours"]>, $.cardinalityUtil.optionalParamCardinality<NamedArgs["minutes"]>>, $.cardinalityUtil.optionalParamCardinality<NamedArgs["seconds"]>>, $.cardinalityUtil.optionalParamCardinality<NamedArgs["microseconds"]>>>
>;
/**
 * Create a `duration` value.
 */
function to_duration<
  NamedArgs extends {
    "hours"?: _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
    "minutes"?: _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
    "seconds"?: _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
    "microseconds"?: _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
  },
>(
  namedArgs: NamedArgs,
): to_durationλFuncExpr<NamedArgs>;
function to_duration(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('std::to_duration', args, _.spec, [
    {args: [], namedArgs: {"hours": {typeId: "00000000-0000-0000-0000-0000000001ff", optional: true, setoftype: false, variadic: false}, "minutes": {typeId: "00000000-0000-0000-0000-0000000001ff", optional: true, setoftype: false, variadic: false}, "seconds": {typeId: "00000000-0000-0000-0000-0000000001ff", optional: true, setoftype: false, variadic: false}, "microseconds": {typeId: "00000000-0000-0000-0000-0000000001ff", optional: true, setoftype: false, variadic: false}}, returnTypeId: "00000000-0000-0000-0000-00000000010e"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "std::to_duration",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type to_bigintλFuncExpr<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>> | undefined,
> = $.$expr_Function<
  "std::to_bigint",
  _.castMaps.mapLiteralToTypeSet<[P1, P2]>,
  {},
  $.TypeSet<$bigint, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.optionalParamCardinality<P2>>>
>;
/**
 * Create a `bigint` value.
 */
function to_bigint<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>> | undefined,
>(
  s: P1,
  fmt?: P2,
): to_bigintλFuncExpr<P1, P2>;
function to_bigint(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('std::to_bigint', args, _.spec, [
    {args: [{typeId: "00000000-0000-0000-0000-000000000101", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-000000000101", optional: true, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-000000000110"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "std::to_bigint",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type to_decimalλFuncExpr<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>> | undefined,
> = $.$expr_Function<
  "std::to_decimal",
  _.castMaps.mapLiteralToTypeSet<[P1, P2]>,
  {},
  $.TypeSet<$decimal, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.optionalParamCardinality<P2>>>
>;
/**
 * Create a `decimal` value.
 */
function to_decimal<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>> | undefined,
>(
  s: P1,
  fmt?: P2,
): to_decimalλFuncExpr<P1, P2>;
function to_decimal(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('std::to_decimal', args, _.spec, [
    {args: [{typeId: "00000000-0000-0000-0000-000000000101", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-000000000101", optional: true, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-000000000108"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "std::to_decimal",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type to_int64λFuncExpr<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>> | undefined,
> = $.$expr_Function<
  "std::to_int64",
  _.castMaps.mapLiteralToTypeSet<[P1, P2]>,
  {},
  $.TypeSet<$number, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.optionalParamCardinality<P2>>>
>;
/**
 * Create a `int64` value.
 */
function to_int64<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>> | undefined,
>(
  s: P1,
  fmt?: P2,
): to_int64λFuncExpr<P1, P2>;
function to_int64(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('std::to_int64', args, _.spec, [
    {args: [{typeId: "00000000-0000-0000-0000-000000000101", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-000000000101", optional: true, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-0000000001ff"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "std::to_int64",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type to_int32λFuncExpr<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>> | undefined,
> = $.$expr_Function<
  "std::to_int32",
  _.castMaps.mapLiteralToTypeSet<[P1, P2]>,
  {},
  $.TypeSet<$number, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.optionalParamCardinality<P2>>>
>;
/**
 * Create a `int32` value.
 */
function to_int32<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>> | undefined,
>(
  s: P1,
  fmt?: P2,
): to_int32λFuncExpr<P1, P2>;
function to_int32(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('std::to_int32', args, _.spec, [
    {args: [{typeId: "00000000-0000-0000-0000-000000000101", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-000000000101", optional: true, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-0000000001ff"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "std::to_int32",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type to_int16λFuncExpr<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>> | undefined,
> = $.$expr_Function<
  "std::to_int16",
  _.castMaps.mapLiteralToTypeSet<[P1, P2]>,
  {},
  $.TypeSet<$number, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.optionalParamCardinality<P2>>>
>;
/**
 * Create a `int16` value.
 */
function to_int16<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>> | undefined,
>(
  s: P1,
  fmt?: P2,
): to_int16λFuncExpr<P1, P2>;
function to_int16(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('std::to_int16', args, _.spec, [
    {args: [{typeId: "00000000-0000-0000-0000-000000000101", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-000000000101", optional: true, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-0000000001ff"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "std::to_int16",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type to_float64λFuncExpr<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>> | undefined,
> = $.$expr_Function<
  "std::to_float64",
  _.castMaps.mapLiteralToTypeSet<[P1, P2]>,
  {},
  $.TypeSet<$number, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.optionalParamCardinality<P2>>>
>;
/**
 * Create a `float64` value.
 */
function to_float64<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>> | undefined,
>(
  s: P1,
  fmt?: P2,
): to_float64λFuncExpr<P1, P2>;
function to_float64(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('std::to_float64', args, _.spec, [
    {args: [{typeId: "00000000-0000-0000-0000-000000000101", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-000000000101", optional: true, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-0000000001ff"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "std::to_float64",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type to_float32λFuncExpr<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>> | undefined,
> = $.$expr_Function<
  "std::to_float32",
  _.castMaps.mapLiteralToTypeSet<[P1, P2]>,
  {},
  $.TypeSet<$number, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.optionalParamCardinality<P2>>>
>;
/**
 * Create a `float32` value.
 */
function to_float32<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>> | undefined,
>(
  s: P1,
  fmt?: P2,
): to_float32λFuncExpr<P1, P2>;
function to_float32(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('std::to_float32', args, _.spec, [
    {args: [{typeId: "00000000-0000-0000-0000-000000000101", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-000000000101", optional: true, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-0000000001ff"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "std::to_float32",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type sequence_resetλFuncExpr<
  P1 extends $.TypeSet<_schema.$ScalarType>,
> = $.$expr_Function<
  "std::sequence_reset",
  [P1],
  {},
  $.TypeSet<$number, $.cardinalityUtil.paramCardinality<P1>>
>;
type sequence_resetλFuncExpr2<
  P1 extends $.TypeSet<_schema.$ScalarType>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
> = $.$expr_Function<
  "std::sequence_reset",
  _.castMaps.mapLiteralToTypeSet<[P1, P2]>,
  {},
  $.TypeSet<$number, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.paramCardinality<P1>, $.cardinalityUtil.paramCardinality<P2>>>
>;
function sequence_reset<
  P1 extends $.TypeSet<_schema.$ScalarType>,
>(
  seq: P1,
): sequence_resetλFuncExpr<P1>;
function sequence_reset<
  P1 extends $.TypeSet<_schema.$ScalarType>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
>(
  seq: P1,
  value: P2,
): sequence_resetλFuncExpr2<P1, P2>;
function sequence_reset(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('std::sequence_reset', args, _.spec, [
    {args: [{typeId: "0c9307a6-06d1-11ed-9279-4da418e7160e", optional: false, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-0000000001ff"},
    {args: [{typeId: "0c9307a6-06d1-11ed-9279-4da418e7160e", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-0000000001ff", optional: false, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-0000000001ff"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "std::sequence_reset",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type sequence_nextλFuncExpr<
  P1 extends $.TypeSet<_schema.$ScalarType>,
> = $.$expr_Function<
  "std::sequence_next",
  [P1],
  {},
  $.TypeSet<$number, $.cardinalityUtil.paramCardinality<P1>>
>;
function sequence_next<
  P1 extends $.TypeSet<_schema.$ScalarType>,
>(
  seq: P1,
): sequence_nextλFuncExpr<P1>;
function sequence_next(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('std::sequence_next', args, _.spec, [
    {args: [{typeId: "0c9307a6-06d1-11ed-9279-4da418e7160e", optional: false, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-0000000001ff"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "std::sequence_next",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type gen_series_12f7ad2206d111ed86898335ed0ecc70λFuncExpr<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$bigint>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$bigint>>,
> = $.$expr_Function<
  "std::_gen_series",
  _.castMaps.mapLiteralToTypeSet<[P1, P2]>,
  {},
  $.TypeSet<$bigint, $.Cardinality.Many>
>;
type gen_series_12f7ad2206d111ed86898335ed0ecc70λFuncExpr2<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
> = $.$expr_Function<
  "std::_gen_series",
  _.castMaps.mapLiteralToTypeSet<[P1, P2]>,
  {},
  $.TypeSet<$number, $.Cardinality.Many>
>;
type gen_series_12f7ad2206d111ed86898335ed0ecc70λFuncExpr3<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
  P3 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
> = $.$expr_Function<
  "std::_gen_series",
  _.castMaps.mapLiteralToTypeSet<[P1, P2, P3]>,
  {},
  $.TypeSet<$number, $.Cardinality.Many>
>;
type gen_series_12f7ad2206d111ed86898335ed0ecc70λFuncExpr4<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$bigint>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$bigint>>,
  P3 extends _.castMaps.orScalarLiteral<$.TypeSet<$bigint>>,
> = $.$expr_Function<
  "std::_gen_series",
  _.castMaps.mapLiteralToTypeSet<[P1, P2, P3]>,
  {},
  $.TypeSet<$bigint, $.Cardinality.Many>
>;
function gen_series_12f7ad2206d111ed86898335ed0ecc70<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$bigint>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$bigint>>,
>(
  start: P1,
  stop: P2,
): gen_series_12f7ad2206d111ed86898335ed0ecc70λFuncExpr<P1, P2>;
function gen_series_12f7ad2206d111ed86898335ed0ecc70<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
>(
  start: P1,
  stop: P2,
): gen_series_12f7ad2206d111ed86898335ed0ecc70λFuncExpr2<P1, P2>;
function gen_series_12f7ad2206d111ed86898335ed0ecc70<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
  P3 extends _.castMaps.orScalarLiteral<$.TypeSet<$number>>,
>(
  start: P1,
  stop: P2,
  step: P3,
): gen_series_12f7ad2206d111ed86898335ed0ecc70λFuncExpr3<P1, P2, P3>;
function gen_series_12f7ad2206d111ed86898335ed0ecc70<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$bigint>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$bigint>>,
  P3 extends _.castMaps.orScalarLiteral<$.TypeSet<$bigint>>,
>(
  start: P1,
  stop: P2,
  step: P3,
): gen_series_12f7ad2206d111ed86898335ed0ecc70λFuncExpr4<P1, P2, P3>;
function gen_series_12f7ad2206d111ed86898335ed0ecc70(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('std::_gen_series', args, _.spec, [
    {args: [{typeId: "00000000-0000-0000-0000-000000000110", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-000000000110", optional: false, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-000000000110", returnTypemod: "SetOfType"},
    {args: [{typeId: "00000000-0000-0000-0000-0000000001ff", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-0000000001ff", optional: false, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-0000000001ff", returnTypemod: "SetOfType"},
    {args: [{typeId: "00000000-0000-0000-0000-0000000001ff", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-0000000001ff", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-0000000001ff", optional: false, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-0000000001ff", returnTypemod: "SetOfType"},
    {args: [{typeId: "00000000-0000-0000-0000-000000000110", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-000000000110", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-000000000110", optional: false, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-000000000110", returnTypemod: "SetOfType"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "std::_gen_series",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type datetime_range_buckets_1306f4e406d111edad3ddb0f210389a2λFuncExpr<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$datetime>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$datetime>>,
  P3 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
> = $.$expr_Function<
  "std::_datetime_range_buckets",
  _.castMaps.mapLiteralToTypeSet<[P1, P2, P3]>,
  {},
  $.TypeSet<$.TupleType<[$datetime, $datetime]>, $.Cardinality.Many>
>;
/**
 * Generate a set of datetime buckets for a given time period and a given granularity
 */
function datetime_range_buckets_1306f4e406d111edad3ddb0f210389a2<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<$datetime>>,
  P2 extends _.castMaps.orScalarLiteral<$.TypeSet<$datetime>>,
  P3 extends _.castMaps.orScalarLiteral<$.TypeSet<$str>>,
>(
  low: P1,
  high: P2,
  granularity: P3,
): datetime_range_buckets_1306f4e406d111edad3ddb0f210389a2λFuncExpr<P1, P2, P3>;
function datetime_range_buckets_1306f4e406d111edad3ddb0f210389a2(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('std::_datetime_range_buckets', args, _.spec, [
    {args: [{typeId: "00000000-0000-0000-0000-00000000010a", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-00000000010a", optional: false, setoftype: false, variadic: false}, {typeId: "00000000-0000-0000-0000-000000000101", optional: false, setoftype: false, variadic: false}], returnTypeId: "323bcb9d-7883-329a-4514-58c24bfb7104", returnTypemod: "SetOfType"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "std::_datetime_range_buckets",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};



export { int64, str, bigint, bool, bytes, datetime, decimal, duration, float32, float64, int16, int32, json, uuid, number, $BaseObject, BaseObject, $Object_0a07d6d806d111ed94d94589f54dfbc0, Object_0a07d6d806d111ed94d94589f54dfbc0, $FreeObject, FreeObject };

export type { $anyscalar, $anypoint, $anydiscrete, $anycontiguous, $anyreal, $anyint, $sequence, $anyfloat, $anynumeric };

type __defaultExports = {
  "int64": typeof int64;
  "str": typeof str;
  "bigint": typeof bigint;
  "bool": typeof bool;
  "bytes": typeof bytes;
  "datetime": typeof datetime;
  "decimal": typeof decimal;
  "duration": typeof duration;
  "float32": typeof float32;
  "float64": typeof float64;
  "int16": typeof int16;
  "int32": typeof int32;
  "json": typeof json;
  "uuid": typeof uuid;
  "BaseObject": typeof BaseObject;
  "Object": typeof Object_0a07d6d806d111ed94d94589f54dfbc0;
  "FreeObject": typeof FreeObject;
  "assert_single": typeof assert_single;
  "assert_exists": typeof assert_exists;
  "assert_distinct": typeof assert_distinct;
  "len": typeof len;
  "sum": typeof sum;
  "count": typeof count;
  "random": typeof random;
  "min": typeof min;
  "max": typeof max;
  "all": typeof all;
  "any": typeof any;
  "enumerate": typeof enumerate;
  "round": typeof round;
  "contains": typeof contains;
  "array_replace": typeof array_replace;
  "find": typeof find;
  "bit_and": typeof bit_and;
  "bit_or": typeof bit_or;
  "bit_xor": typeof bit_xor;
  "bit_not": typeof bit_not;
  "bit_rshift": typeof bit_rshift;
  "bit_lshift": typeof bit_lshift;
  "array_agg": typeof array_agg;
  "array_unpack": typeof array_unpack;
  "array_fill": typeof array_fill;
  "array_get": typeof array_get;
  "array_join": typeof array_join;
  "bytes_get_bit": typeof bytes_get_bit;
  "datetime_current": typeof datetime_current;
  "datetime_of_transaction": typeof datetime_of_transaction;
  "datetime_of_statement": typeof datetime_of_statement;
  "datetime_get": typeof datetime_get;
  "datetime_truncate": typeof datetime_truncate;
  "duration_get": typeof duration_get;
  "duration_truncate": typeof duration_truncate;
  "duration_to_seconds": typeof duration_to_seconds;
  "json_typeof": typeof json_typeof;
  "json_array_unpack": typeof json_array_unpack;
  "json_object_unpack": typeof json_object_unpack;
  "json_get": typeof json_get;
  "re_match": typeof re_match;
  "re_match_all": typeof re_match_all;
  "re_test": typeof re_test;
  "re_replace": typeof re_replace;
  "str_repeat": typeof str_repeat;
  "str_lower": typeof str_lower;
  "str_upper": typeof str_upper;
  "str_title": typeof str_title;
  "str_pad_start": typeof str_pad_start;
  "str_lpad": typeof str_lpad;
  "str_pad_end": typeof str_pad_end;
  "str_rpad": typeof str_rpad;
  "str_trim_start": typeof str_trim_start;
  "str_ltrim": typeof str_ltrim;
  "str_trim_end": typeof str_trim_end;
  "str_rtrim": typeof str_rtrim;
  "str_trim": typeof str_trim;
  "str_split": typeof str_split;
  "str_replace": typeof str_replace;
  "str_reverse": typeof str_reverse;
  "uuid_generate_v1mc": typeof uuid_generate_v1mc;
  "uuid_generate_v4": typeof uuid_generate_v4;
  "range": typeof range;
  "range_is_empty": typeof range_is_empty;
  "range_unpack": typeof range_unpack;
  "range_get_upper": typeof range_get_upper;
  "range_get_lower": typeof range_get_lower;
  "range_is_inclusive_upper": typeof range_is_inclusive_upper;
  "range_is_inclusive_lower": typeof range_is_inclusive_lower;
  "overlaps": typeof overlaps;
  "to_str": typeof to_str;
  "to_json": typeof to_json;
  "to_datetime": typeof to_datetime;
  "to_duration": typeof to_duration;
  "to_bigint": typeof to_bigint;
  "to_decimal": typeof to_decimal;
  "to_int64": typeof to_int64;
  "to_int32": typeof to_int32;
  "to_int16": typeof to_int16;
  "to_float64": typeof to_float64;
  "to_float32": typeof to_float32;
  "sequence_reset": typeof sequence_reset;
  "sequence_next": typeof sequence_next;
  "_gen_series": typeof gen_series_12f7ad2206d111ed86898335ed0ecc70;
  "_datetime_range_buckets": typeof datetime_range_buckets_1306f4e406d111edad3ddb0f210389a2
};
const __defaultExports: __defaultExports = {
  "int64": int64,
  "str": str,
  "bigint": bigint,
  "bool": bool,
  "bytes": bytes,
  "datetime": datetime,
  "decimal": decimal,
  "duration": duration,
  "float32": float32,
  "float64": float64,
  "int16": int16,
  "int32": int32,
  "json": json,
  "uuid": uuid,
  "BaseObject": BaseObject,
  "Object": Object_0a07d6d806d111ed94d94589f54dfbc0,
  "FreeObject": FreeObject,
  "assert_single": assert_single,
  "assert_exists": assert_exists,
  "assert_distinct": assert_distinct,
  "len": len,
  "sum": sum,
  "count": count,
  "random": random,
  "min": min,
  "max": max,
  "all": all,
  "any": any,
  "enumerate": enumerate,
  "round": round,
  "contains": contains,
  "array_replace": array_replace,
  "find": find,
  "bit_and": bit_and,
  "bit_or": bit_or,
  "bit_xor": bit_xor,
  "bit_not": bit_not,
  "bit_rshift": bit_rshift,
  "bit_lshift": bit_lshift,
  "array_agg": array_agg,
  "array_unpack": array_unpack,
  "array_fill": array_fill,
  "array_get": array_get,
  "array_join": array_join,
  "bytes_get_bit": bytes_get_bit,
  "datetime_current": datetime_current,
  "datetime_of_transaction": datetime_of_transaction,
  "datetime_of_statement": datetime_of_statement,
  "datetime_get": datetime_get,
  "datetime_truncate": datetime_truncate,
  "duration_get": duration_get,
  "duration_truncate": duration_truncate,
  "duration_to_seconds": duration_to_seconds,
  "json_typeof": json_typeof,
  "json_array_unpack": json_array_unpack,
  "json_object_unpack": json_object_unpack,
  "json_get": json_get,
  "re_match": re_match,
  "re_match_all": re_match_all,
  "re_test": re_test,
  "re_replace": re_replace,
  "str_repeat": str_repeat,
  "str_lower": str_lower,
  "str_upper": str_upper,
  "str_title": str_title,
  "str_pad_start": str_pad_start,
  "str_lpad": str_lpad,
  "str_pad_end": str_pad_end,
  "str_rpad": str_rpad,
  "str_trim_start": str_trim_start,
  "str_ltrim": str_ltrim,
  "str_trim_end": str_trim_end,
  "str_rtrim": str_rtrim,
  "str_trim": str_trim,
  "str_split": str_split,
  "str_replace": str_replace,
  "str_reverse": str_reverse,
  "uuid_generate_v1mc": uuid_generate_v1mc,
  "uuid_generate_v4": uuid_generate_v4,
  "range": range,
  "range_is_empty": range_is_empty,
  "range_unpack": range_unpack,
  "range_get_upper": range_get_upper,
  "range_get_lower": range_get_lower,
  "range_is_inclusive_upper": range_is_inclusive_upper,
  "range_is_inclusive_lower": range_is_inclusive_lower,
  "overlaps": overlaps,
  "to_str": to_str,
  "to_json": to_json,
  "to_datetime": to_datetime,
  "to_duration": to_duration,
  "to_bigint": to_bigint,
  "to_decimal": to_decimal,
  "to_int64": to_int64,
  "to_int32": to_int32,
  "to_int16": to_int16,
  "to_float64": to_float64,
  "to_float32": to_float32,
  "sequence_reset": sequence_reset,
  "sequence_next": sequence_next,
  "_gen_series": gen_series_12f7ad2206d111ed86898335ed0ecc70,
  "_datetime_range_buckets": datetime_range_buckets_1306f4e406d111edad3ddb0f210389a2
};
export default __defaultExports;
