import { $ } from "edgedb";
import * as _ from "../imports.mjs";
import type * as _std from "./std.mjs";
import type * as _cal from "./cal.mjs";
enum $GenreλEnum {
  Horror = "Horror",
  Action = "Action",
  RomCom = "RomCom",
}
export type $Genre = {
  Horror: $.$expr_Literal<$Genre>;
  Action: $.$expr_Literal<$Genre>;
  RomCom: $.$expr_Literal<$Genre>;
} & $.EnumType<"default::Genre", `${$GenreλEnum}`>;
const Genre: $Genre = $.makeType<$Genre>(_.spec, "b4ec4232-06ef-11ed-a3e5-5fe1e84a2984", _.syntax.literal);

export type $bag_seq = $.ScalarType<"std::number", number>;
const bag_seq: $.scalarTypeWithConstructor<_std.$number, string> = $.makeType<$.scalarTypeWithConstructor<_std.$number, string>>(_.spec, "bbb3c8a6-06ef-11ed-834d-5b4022da6147", _.syntax.literal);

export type $global_seq = $.ScalarType<"std::number", number>;
const global_seq: $.scalarTypeWithConstructor<_std.$number, string> = $.makeType<$.scalarTypeWithConstructor<_std.$number, string>>(_.spec, "bd04a112-06ef-11ed-be20-49e9173e7784", _.syntax.literal);

export type $str_multi = $.ScalarType<"default::str_multi", string>;
const str_multi: $.scalarTypeWithConstructor<$str_multi, never> = $.makeType<$.scalarTypeWithConstructor<$str_multi, never>>(_.spec, "bc7c2daa-06ef-11ed-95bb-9327042ccb32", _.syntax.literal);

export type $str_required_multi = $.ScalarType<"default::str_required_multi", string>;
const str_required_multi: $.scalarTypeWithConstructor<$str_required_multi, never> = $.makeType<$.scalarTypeWithConstructor<$str_required_multi, never>>(_.spec, "bc7cb6e4-06ef-11ed-9e83-bd0c1722b787", _.syntax.literal);

export type $_b4ff8afe06ef11ed8f6f31e9ef5bff4c = $.ScalarType<"default::你好", string>;
const _b4ff8afe06ef11ed8f6f31e9ef5bff4c: $.scalarTypeWithConstructor<$_b4ff8afe06ef11ed8f6f31e9ef5bff4c, never> = $.makeType<$.scalarTypeWithConstructor<$_b4ff8afe06ef11ed8f6f31e9ef5bff4c, never>>(_.spec, "b4ff8afe-06ef-11ed-8f6f-31e9ef5bff4c", _.syntax.literal);

export type $_b4ff9ba206ef11eda116455b6f373ff5 = $.ScalarType<"default::مرحبا", string>;
const _b4ff9ba206ef11eda116455b6f373ff5: $.scalarTypeWithConstructor<$_b4ff9ba206ef11eda116455b6f373ff5, never> = $.makeType<$.scalarTypeWithConstructor<$_b4ff9ba206ef11eda116455b6f373ff5, never>>(_.spec, "b4ff9ba2-06ef-11ed-a116-455b6f373ff5", _.syntax.literal);

export type $_b5016c1606ef11edb2bb3bd5ba8089d5 = $.ScalarType<"default::🚀🚀🚀", string>;
const _b5016c1606ef11edb2bb3bd5ba8089d5: $.scalarTypeWithConstructor<$_b5016c1606ef11edb2bb3bd5ba8089d5, never> = $.makeType<$.scalarTypeWithConstructor<$_b5016c1606ef11edb2bb3bd5ba8089d5, never>>(_.spec, "b5016c16-06ef-11ed-b2bb-3bd5ba8089d5", _.syntax.literal);

export type $AλShape = $.typeutil.flatten<_std.$Object_0a07d6d806d111ed94d94589f54dfbc0λShape & {
  "s p A m 🤞": $.LinkDesc<$SpaM_b507a19e06ef11eda5728f8ce2372763, $.Cardinality.One, {}, false, false,  false, false>;
  "<Ł💯[is Łukasz]": $.LinkDesc<$ukasz_b502ed8e06ef11ed8d1ddf3cf3e9f851, $.Cardinality.Many, {}, false, false,  false, false>;
  "<Ł💯": $.LinkDesc<$.ObjectType, $.Cardinality.Many, {}, false, false,  false, false>;
}>;
type $A = $.ObjectType<"default::A", $AλShape, null>;
const $A = $.makeType<$A>(_.spec, "b4fe1d90-06ef-11ed-88e7-d78050b3ce13", _.syntax.literal);

const A: $.$expr_PathNode<$.TypeSet<$A, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($A, $.Cardinality.Many), null, true);

export type $UserλShape = $.typeutil.flatten<_std.$Object_0a07d6d806d111ed94d94589f54dfbc0λShape & {
  "username": $.PropertyDesc<_std.$str, $.Cardinality.One, false, false, false, false>;
  "favourite_movies": $.LinkDesc<$Movie, $.Cardinality.AtLeastOne, {}, false, false,  false, false>;
}>;
type $User = $.ObjectType<"default::User", $UserλShape, null>;
const $User = $.makeType<$User>(_.spec, "bbcd1dc4-06ef-11ed-961c-19345764aca6", _.syntax.literal);

const User: $.$expr_PathNode<$.TypeSet<$User, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($User, $.Cardinality.Many), null, true);

export type $AdminUserλShape = $.typeutil.flatten<Omit<$UserλShape, "username"> & {
  "username": $.PropertyDesc<_std.$str, $.Cardinality.One, true, false, false, false>;
}>;
type $AdminUser = $.ObjectType<"default::AdminUser", $AdminUserλShape, null>;
const $AdminUser = $.makeType<$AdminUser>(_.spec, "bd2f3e9a-06ef-11ed-a681-2731f5f95601", _.syntax.literal);

const AdminUser: $.$expr_PathNode<$.TypeSet<$AdminUser, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($AdminUser, $.Cardinality.Many), null, true);

export type $HasNameλShape = $.typeutil.flatten<_std.$Object_0a07d6d806d111ed94d94589f54dfbc0λShape & {
  "name": $.PropertyDesc<_std.$str, $.Cardinality.AtMostOne, false, false, false, false>;
}>;
type $HasName = $.ObjectType<"default::HasName", $HasNameλShape, null>;
const $HasName = $.makeType<$HasName>(_.spec, "b4edd8d6-06ef-11ed-9bd1-19895ab60694", _.syntax.literal);

const HasName: $.$expr_PathNode<$.TypeSet<$HasName, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($HasName, $.Cardinality.Many), null, true);

export type $HasAgeλShape = $.typeutil.flatten<_std.$Object_0a07d6d806d111ed94d94589f54dfbc0λShape & {
  "age": $.PropertyDesc<_std.$int64, $.Cardinality.AtMostOne, false, false, false, false>;
}>;
type $HasAge = $.ObjectType<"default::HasAge", $HasAgeλShape, null>;
const $HasAge = $.makeType<$HasAge>(_.spec, "b4ec5394-06ef-11ed-b9a8-d7fbc22978f3", _.syntax.literal);

const HasAge: $.$expr_PathNode<$.TypeSet<$HasAge, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($HasAge, $.Cardinality.Many), null, true);

export type $BagλShape = $.typeutil.flatten<$HasNameλShape & $HasAgeλShape & {
  "enumArr": $.PropertyDesc<$.ArrayType<$Genre>, $.Cardinality.AtMostOne, false, false, false, false>;
  "bigintField": $.PropertyDesc<_std.$bigint, $.Cardinality.AtMostOne, false, false, false, false>;
  "boolField": $.PropertyDesc<_std.$bool, $.Cardinality.AtMostOne, false, false, false, false>;
  "datetimeField": $.PropertyDesc<_std.$datetime, $.Cardinality.AtMostOne, false, false, false, false>;
  "decimalField": $.PropertyDesc<_std.$decimal, $.Cardinality.AtMostOne, false, false, false, false>;
  "durationField": $.PropertyDesc<_std.$duration, $.Cardinality.AtMostOne, false, false, false, false>;
  "float32Field": $.PropertyDesc<_std.$float32, $.Cardinality.AtMostOne, false, false, false, false>;
  "float64Field": $.PropertyDesc<_std.$float64, $.Cardinality.AtMostOne, false, false, false, false>;
  "genre": $.PropertyDesc<$Genre, $.Cardinality.AtMostOne, false, false, false, false>;
  "int16Field": $.PropertyDesc<_std.$int16, $.Cardinality.AtMostOne, false, false, false, false>;
  "int32Field": $.PropertyDesc<_std.$int32, $.Cardinality.AtMostOne, false, false, false, false>;
  "int64Field": $.PropertyDesc<_std.$int64, $.Cardinality.AtMostOne, false, false, false, false>;
  "localDateField": $.PropertyDesc<_cal.$local_date, $.Cardinality.AtMostOne, false, false, false, false>;
  "localDateTimeField": $.PropertyDesc<_cal.$local_datetime, $.Cardinality.AtMostOne, false, false, false, false>;
  "localTimeField": $.PropertyDesc<_cal.$local_time, $.Cardinality.AtMostOne, false, false, false, false>;
  "namedTuple": $.PropertyDesc<$.NamedTupleType<{x: _std.$str, y: _std.$int64}>, $.Cardinality.AtMostOne, false, false, false, false>;
  "secret_identity": $.PropertyDesc<_std.$str, $.Cardinality.AtMostOne, false, false, false, false>;
  "stringMultiArr": $.PropertyDesc<$.ArrayType<_std.$str>, $.Cardinality.Many, false, false, false, false>;
  "stringsArr": $.PropertyDesc<$.ArrayType<_std.$str>, $.Cardinality.AtMostOne, false, false, false, false>;
  "stringsMulti": $.PropertyDesc<_std.$str, $.Cardinality.AtLeastOne, false, false, false, false>;
  "unnamedTuple": $.PropertyDesc<$.TupleType<[_std.$str, _std.$int64]>, $.Cardinality.AtMostOne, false, false, false, false>;
  "seqField": $.PropertyDesc<$bag_seq, $.Cardinality.AtMostOne, false, false, false, true>;
  "jsonField": $.PropertyDesc<_std.$json, $.Cardinality.AtMostOne, false, false, false, false>;
  "rangeField": $.PropertyDesc<$.RangeType<_std.$int64>, $.Cardinality.AtMostOne, false, false, false, false>;
}>;
type $Bag = $.ObjectType<"default::Bag", $BagλShape, null>;
const $Bag = $.makeType<$Bag>(_.spec, "b4f8c160-06ef-11ed-9d70-11a5723c26a8", _.syntax.literal);

const Bag: $.$expr_PathNode<$.TypeSet<$Bag, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($Bag, $.Cardinality.Many), null, true);

export type $PersonλShape = $.typeutil.flatten<_std.$Object_0a07d6d806d111ed94d94589f54dfbc0λShape & {
  "name": $.PropertyDesc<_std.$str, $.Cardinality.One, true, false, false, false>;
  "<characters[is Movie]": $.LinkDesc<$Movie, $.Cardinality.Many, {}, false, false,  false, false>;
  "<characters": $.LinkDesc<$.ObjectType, $.Cardinality.Many, {}, false, false,  false, false>;
}>;
type $Person = $.ObjectType<"default::Person", $PersonλShape, null>;
const $Person = $.makeType<$Person>(_.spec, "b50a6a1e-06ef-11ed-a8fa-05fd2961d723", _.syntax.literal);

const Person: $.$expr_PathNode<$.TypeSet<$Person, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($Person, $.Cardinality.Many), null, true);

export type $HeroλShape = $.typeutil.flatten<$PersonλShape & {
  "number_of_movies": $.PropertyDesc<_std.$int64, $.Cardinality.AtMostOne, false, false, false, false>;
  "secret_identity": $.PropertyDesc<_std.$str, $.Cardinality.AtMostOne, false, false, false, false>;
  "villains": $.LinkDesc<$Villain, $.Cardinality.Many, {}, false, true,  false, false>;
  "<nemesis[is Villain]": $.LinkDesc<$Villain, $.Cardinality.Many, {}, false, false,  false, false>;
  "<nemesis": $.LinkDesc<$.ObjectType, $.Cardinality.Many, {}, false, false,  false, false>;
}>;
type $Hero = $.ObjectType<"default::Hero", $HeroλShape, null>;
const $Hero = $.makeType<$Hero>(_.spec, "b5129e50-06ef-11ed-bc9d-39fa7f7e3b8b", _.syntax.literal);

const Hero: $.$expr_PathNode<$.TypeSet<$Hero, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($Hero, $.Cardinality.Many), null, true);

export type $MovieλShape = $.typeutil.flatten<_std.$Object_0a07d6d806d111ed94d94589f54dfbc0λShape & {
  "characters": $.LinkDesc<$Person, $.Cardinality.Many, {
    "@character_name": $.PropertyDesc<_std.$str, $.Cardinality.AtMostOne>;
  }, false, false, false, false>;
  "profile": $.LinkDesc<$Profile, $.Cardinality.AtMostOne, {}, true, false,  false, false>;
  "genre": $.PropertyDesc<$Genre, $.Cardinality.AtMostOne, false, false, false, false>;
  "rating": $.PropertyDesc<_std.$float64, $.Cardinality.AtMostOne, false, false, false, false>;
  "release_year": $.PropertyDesc<_std.$int16, $.Cardinality.One, false, false, false, true>;
  "title": $.PropertyDesc<_std.$str, $.Cardinality.One, true, false, false, false>;
  "<favourite_movies[is User]": $.LinkDesc<$User, $.Cardinality.Many, {}, false, false,  false, false>;
  "<favourite_movies[is AdminUser]": $.LinkDesc<$AdminUser, $.Cardinality.Many, {}, false, false,  false, false>;
  "<favourite_movies": $.LinkDesc<$.ObjectType, $.Cardinality.Many, {}, false, false,  false, false>;
}>;
type $Movie = $.ObjectType<"default::Movie", $MovieλShape, null>;
const $Movie = $.makeType<$Movie>(_.spec, "b50dc876-06ef-11ed-b7b4-4b196d24b3da", _.syntax.literal);

const Movie: $.$expr_PathNode<$.TypeSet<$Movie, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($Movie, $.Cardinality.Many), null, true);

export type $MovieShapeλShape = $.typeutil.flatten<_std.$Object_0a07d6d806d111ed94d94589f54dfbc0λShape & {
}>;
type $MovieShape = $.ObjectType<"default::MovieShape", $MovieShapeλShape, null>;
const $MovieShape = $.makeType<$MovieShape>(_.spec, "b518b506-06ef-11ed-980f-7b25cbb9e2f3", _.syntax.literal);

const MovieShape: $.$expr_PathNode<$.TypeSet<$MovieShape, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($MovieShape, $.Cardinality.Many), null, true);

export type $ProfileλShape = $.typeutil.flatten<_std.$Object_0a07d6d806d111ed94d94589f54dfbc0λShape & {
  "plot_summary": $.PropertyDesc<_std.$str, $.Cardinality.AtMostOne, false, false, false, false>;
  "slug": $.PropertyDesc<_std.$str, $.Cardinality.AtMostOne, false, false, true, false>;
  "<profile[is Movie]": $.LinkDesc<$Movie, $.Cardinality.AtMostOne, {}, true, false,  false, false>;
  "<profile": $.LinkDesc<$.ObjectType, $.Cardinality.Many, {}, false, false,  false, false>;
}>;
type $Profile = $.ObjectType<"default::Profile", $ProfileλShape, null>;
const $Profile = $.makeType<$Profile>(_.spec, "b50c4c26-06ef-11ed-9851-bbd4c72fc96a", _.syntax.literal);

const Profile: $.$expr_PathNode<$.TypeSet<$Profile, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($Profile, $.Cardinality.Many), null, true);

export type $SpaM_b507a19e06ef11eda5728f8ce2372763λShape = $.typeutil.flatten<_std.$Object_0a07d6d806d111ed94d94589f54dfbc0λShape & {
  "🚀": $.PropertyDesc<_std.$int32, $.Cardinality.One, false, false, false, false>;
  "c100": $.PropertyDesc<_std.$int64, $.Cardinality.One, false, true, false, false>;
  "<s p A m 🤞[is A]": $.LinkDesc<$A, $.Cardinality.Many, {}, false, false,  false, false>;
  "<s p A m 🤞": $.LinkDesc<$.ObjectType, $.Cardinality.Many, {}, false, false,  false, false>;
}>;
type $SpaM_b507a19e06ef11eda5728f8ce2372763 = $.ObjectType<"default::S p a M", $SpaM_b507a19e06ef11eda5728f8ce2372763λShape, null>;
const $SpaM_b507a19e06ef11eda5728f8ce2372763 = $.makeType<$SpaM_b507a19e06ef11eda5728f8ce2372763>(_.spec, "b507a19e-06ef-11ed-a572-8f8ce2372763", _.syntax.literal);

const SpaM_b507a19e06ef11eda5728f8ce2372763: $.$expr_PathNode<$.TypeSet<$SpaM_b507a19e06ef11eda5728f8ce2372763, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($SpaM_b507a19e06ef11eda5728f8ce2372763, $.Cardinality.Many), null, true);

export type $SimpleλShape = $.typeutil.flatten<$HasNameλShape & $HasAgeλShape & {
}>;
type $Simple = $.ObjectType<"default::Simple", $SimpleλShape, null>;
const $Simple = $.makeType<$Simple>(_.spec, "b510d732-06ef-11ed-924f-ad1af7cba651", _.syntax.literal);

const Simple: $.$expr_PathNode<$.TypeSet<$Simple, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($Simple, $.Cardinality.Many), null, true);

export type $VillainλShape = $.typeutil.flatten<$PersonλShape & {
  "nemesis": $.LinkDesc<$Hero, $.Cardinality.AtMostOne, {}, false, false,  false, false>;
  "<villains[is Hero]": $.LinkDesc<$Hero, $.Cardinality.Many, {}, false, false,  false, false>;
  "<villains": $.LinkDesc<$.ObjectType, $.Cardinality.Many, {}, false, false,  false, false>;
}>;
type $Villain = $.ObjectType<"default::Villain", $VillainλShape, null>;
const $Villain = $.makeType<$Villain>(_.spec, "b514ba78-06ef-11ed-8781-a76794e53b72", _.syntax.literal);

const Villain: $.$expr_PathNode<$.TypeSet<$Villain, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($Villain, $.Cardinality.Many), null, true);

export type $ukasz_b502ed8e06ef11ed8d1ddf3cf3e9f851λShape = $.typeutil.flatten<_std.$Object_0a07d6d806d111ed94d94589f54dfbc0λShape & {
  "Ł💯": $.LinkDesc<$A, $.Cardinality.AtMostOne, {
    "@🙀مرحبا🙀": $.PropertyDesc<$_b4ff9ba206ef11eda116455b6f373ff5, $.Cardinality.AtMostOne>;
    "@🙀🚀🚀🚀🙀": $.PropertyDesc<$_b5016c1606ef11edb2bb3bd5ba8089d5, $.Cardinality.AtMostOne>;
  }, false, false, false, false>;
  "Ł🤞": $.PropertyDesc<$_b5016c1606ef11edb2bb3bd5ba8089d5, $.Cardinality.One, false, false, false, true>;
}>;
type $ukasz_b502ed8e06ef11ed8d1ddf3cf3e9f851 = $.ObjectType<"default::Łukasz", $ukasz_b502ed8e06ef11ed8d1ddf3cf3e9f851λShape, null>;
const $ukasz_b502ed8e06ef11ed8d1ddf3cf3e9f851 = $.makeType<$ukasz_b502ed8e06ef11ed8d1ddf3cf3e9f851>(_.spec, "b502ed8e-06ef-11ed-8d1d-df3cf3e9f851", _.syntax.literal);

const ukasz_b502ed8e06ef11ed8d1ddf3cf3e9f851: $.$expr_PathNode<$.TypeSet<$ukasz_b502ed8e06ef11ed8d1ddf3cf3e9f851, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($ukasz_b502ed8e06ef11ed8d1ddf3cf3e9f851, $.Cardinality.Many), null, true);

type _b4ec250406ef11eda293498a511a67c3λFuncExpr<
  NamedArgs extends {
    "🙀": _.castMaps.orScalarLiteral<$.TypeSet<_std.$number>>,
  },
> = $.$expr_Function<
  "default::💯",
  [],
  _.castMaps.mapLiteralToTypeSet<NamedArgs>,
  $.TypeSet<_std.$number, $.cardinalityUtil.paramCardinality<NamedArgs["🙀"]>>
>;
function _b4ec250406ef11eda293498a511a67c3<
  NamedArgs extends {
    "🙀": _.castMaps.orScalarLiteral<$.TypeSet<_std.$number>>,
  },
>(
  namedArgs: NamedArgs,
): _b4ec250406ef11eda293498a511a67c3λFuncExpr<NamedArgs>;
function _b4ec250406ef11eda293498a511a67c3(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('default::💯', args, _.spec, [
    {args: [], namedArgs: {"🙀": {typeId: "00000000-0000-0000-0000-0000000001ff", optional: false, setoftype: false, variadic: false}}, returnTypeId: "00000000-0000-0000-0000-0000000001ff"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "default::💯",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

const $default__globals: {  arr_global: _.syntax.$expr_Global<
              "default::arr_global",
              $.ArrayType<_std.$str>,
              $.Cardinality.AtMostOne
              >,  named_tuple_global: _.syntax.$expr_Global<
              "default::named_tuple_global",
              $.NamedTupleType<{name: _std.$str, age: _std.$int64}>,
              $.Cardinality.AtMostOne
              >,  num_global: _.syntax.$expr_Global<
              "default::num_global",
              _std.$int64,
              $.Cardinality.AtMostOne
              >,  seq_global: _.syntax.$expr_Global<
              "default::seq_global",
              $global_seq,
              $.Cardinality.AtMostOne
              >,  str_global: _.syntax.$expr_Global<
              "default::str_global",
              _std.$str,
              $.Cardinality.AtMostOne
              >,  str_global_with_default: _.syntax.$expr_Global<
              "default::str_global_with_default",
              _std.$str,
              $.Cardinality.One
              >,  str_multi: _.syntax.$expr_Global<
              "default::str_multi",
              $str_multi,
              $.Cardinality.AtLeastOne
              >,  str_required: _.syntax.$expr_Global<
              "default::str_required",
              _std.$str,
              $.Cardinality.One
              >,  str_required_multi: _.syntax.$expr_Global<
              "default::str_required_multi",
              $str_required_multi,
              $.Cardinality.AtLeastOne
              >,  tuple_global: _.syntax.$expr_Global<
              "default::tuple_global",
              $.TupleType<[_std.$str, _std.$int64]>,
              $.Cardinality.AtMostOne
              >,  uuid_global: _.syntax.$expr_Global<
              "default::uuid_global",
              _std.$uuid,
              $.Cardinality.AtMostOne
              >} = {  arr_global: _.syntax.makeGlobal(
              "default::arr_global",
              $.makeType(_.spec, "05f91774-15ea-9001-038e-092c1cad80af", _.syntax.literal),
              $.Cardinality.AtMostOne) as any,  named_tuple_global: _.syntax.makeGlobal(
              "default::named_tuple_global",
              $.makeType(_.spec, "b8b48d9a-1aea-2079-e100-45c7e484c35d", _.syntax.literal),
              $.Cardinality.AtMostOne) as any,  num_global: _.syntax.makeGlobal(
              "default::num_global",
              $.makeType(_.spec, "00000000-0000-0000-0000-000000000105", _.syntax.literal),
              $.Cardinality.AtMostOne) as any,  seq_global: _.syntax.makeGlobal(
              "default::seq_global",
              $.makeType(_.spec, "bd04a112-06ef-11ed-be20-49e9173e7784", _.syntax.literal),
              $.Cardinality.AtMostOne) as any,  str_global: _.syntax.makeGlobal(
              "default::str_global",
              $.makeType(_.spec, "00000000-0000-0000-0000-000000000101", _.syntax.literal),
              $.Cardinality.AtMostOne) as any,  str_global_with_default: _.syntax.makeGlobal(
              "default::str_global_with_default",
              $.makeType(_.spec, "00000000-0000-0000-0000-000000000101", _.syntax.literal),
              $.Cardinality.One) as any,  str_multi: _.syntax.makeGlobal(
              "default::str_multi",
              $.makeType(_.spec, "bc7c2daa-06ef-11ed-95bb-9327042ccb32", _.syntax.literal),
              $.Cardinality.AtLeastOne) as any,  str_required: _.syntax.makeGlobal(
              "default::str_required",
              $.makeType(_.spec, "00000000-0000-0000-0000-000000000101", _.syntax.literal),
              $.Cardinality.One) as any,  str_required_multi: _.syntax.makeGlobal(
              "default::str_required_multi",
              $.makeType(_.spec, "bc7cb6e4-06ef-11ed-9e83-bd0c1722b787", _.syntax.literal),
              $.Cardinality.AtLeastOne) as any,  tuple_global: _.syntax.makeGlobal(
              "default::tuple_global",
              $.makeType(_.spec, "338fc9bb-51be-b55d-b2f7-abe53ff0567f", _.syntax.literal),
              $.Cardinality.AtMostOne) as any,  uuid_global: _.syntax.makeGlobal(
              "default::uuid_global",
              $.makeType(_.spec, "00000000-0000-0000-0000-000000000100", _.syntax.literal),
              $.Cardinality.AtMostOne) as any};



export { $GenreλEnum, Genre, bag_seq, global_seq, str_multi, str_required_multi, _b4ff8afe06ef11ed8f6f31e9ef5bff4c, _b4ff9ba206ef11eda116455b6f373ff5, _b5016c1606ef11edb2bb3bd5ba8089d5, $A, A, $User, User, $AdminUser, AdminUser, $HasName, HasName, $HasAge, HasAge, $Bag, Bag, $Person, Person, $Hero, Hero, $Movie, Movie, $MovieShape, MovieShape, $Profile, Profile, $SpaM_b507a19e06ef11eda5728f8ce2372763, SpaM_b507a19e06ef11eda5728f8ce2372763, $Simple, Simple, $Villain, Villain, $ukasz_b502ed8e06ef11ed8d1ddf3cf3e9f851, ukasz_b502ed8e06ef11ed8d1ddf3cf3e9f851 };

type __defaultExports = {
  "Genre": typeof Genre;
  "bag_seq": typeof bag_seq;
  "global_seq": typeof global_seq;
  "str_multi": typeof str_multi;
  "str_required_multi": typeof str_required_multi;
  "你好": typeof _b4ff8afe06ef11ed8f6f31e9ef5bff4c;
  "مرحبا": typeof _b4ff9ba206ef11eda116455b6f373ff5;
  "🚀🚀🚀": typeof _b5016c1606ef11edb2bb3bd5ba8089d5;
  "A": typeof A;
  "User": typeof User;
  "AdminUser": typeof AdminUser;
  "HasName": typeof HasName;
  "HasAge": typeof HasAge;
  "Bag": typeof Bag;
  "Person": typeof Person;
  "Hero": typeof Hero;
  "Movie": typeof Movie;
  "MovieShape": typeof MovieShape;
  "Profile": typeof Profile;
  "S p a M": typeof SpaM_b507a19e06ef11eda5728f8ce2372763;
  "Simple": typeof Simple;
  "Villain": typeof Villain;
  "Łukasz": typeof ukasz_b502ed8e06ef11ed8d1ddf3cf3e9f851;
  "💯": typeof _b4ec250406ef11eda293498a511a67c3;
  "global": typeof $default__globals
};
const __defaultExports: __defaultExports = {
  "Genre": Genre,
  "bag_seq": bag_seq,
  "global_seq": global_seq,
  "str_multi": str_multi,
  "str_required_multi": str_required_multi,
  "你好": _b4ff8afe06ef11ed8f6f31e9ef5bff4c,
  "مرحبا": _b4ff9ba206ef11eda116455b6f373ff5,
  "🚀🚀🚀": _b5016c1606ef11edb2bb3bd5ba8089d5,
  "A": A,
  "User": User,
  "AdminUser": AdminUser,
  "HasName": HasName,
  "HasAge": HasAge,
  "Bag": Bag,
  "Person": Person,
  "Hero": Hero,
  "Movie": Movie,
  "MovieShape": MovieShape,
  "Profile": Profile,
  "S p a M": SpaM_b507a19e06ef11eda5728f8ce2372763,
  "Simple": Simple,
  "Villain": Villain,
  "Łukasz": ukasz_b502ed8e06ef11ed8d1ddf3cf3e9f851,
  "💯": _b4ec250406ef11eda293498a511a67c3,
  "global": $default__globals
};
export default __defaultExports;
