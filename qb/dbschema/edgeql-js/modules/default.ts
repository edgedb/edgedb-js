import { $ } from "edgedb";
import * as _ from "../imports";
import * as _std from "./std";
import * as _cal from "./cal";
enum $GenreλEnum {
  Horror = "Horror",
  Action = "Action",
  RomCom = "RomCom",
}
export type $Genre = typeof $GenreλEnum & $.EnumType<"default::Genre", $GenreλEnum, `${$GenreλEnum}`>;
const Genre: $Genre = $.makeType<$Genre>(_.spec, "615b6350-5222-11ec-b957-d34fe8655f0e", _.syntax.literal);

export type $_6167fbd8522211ecb676ffcb3cdf24e0 = $.ScalarType<"default::你好", string, true>;
const _6167fbd8522211ecb676ffcb3cdf24e0: $.scalarTypeWithConstructor<$_6167fbd8522211ecb676ffcb3cdf24e0, never> = $.makeType<$.scalarTypeWithConstructor<$_6167fbd8522211ecb676ffcb3cdf24e0, never>>(_.spec, "6167fbd8-5222-11ec-b676-ffcb3cdf24e0", _.syntax.literal);

export type $_61681488522211ecbf9a1dea2d8e6375 = $.ScalarType<"default::مرحبا", string, true>;
const _61681488522211ecbf9a1dea2d8e6375: $.scalarTypeWithConstructor<$_61681488522211ecbf9a1dea2d8e6375, never> = $.makeType<$.scalarTypeWithConstructor<$_61681488522211ecbf9a1dea2d8e6375, never>>(_.spec, "61681488-5222-11ec-bf9a-1dea2d8e6375", _.syntax.literal);

export type $_616dff56522211ec8244db8a94893b78 = $.ScalarType<"default::🚀🚀🚀", string, true>;
const _616dff56522211ec8244db8a94893b78: $.scalarTypeWithConstructor<$_616dff56522211ec8244db8a94893b78, never> = $.makeType<$.scalarTypeWithConstructor<$_616dff56522211ec8244db8a94893b78, never>>(_.spec, "616dff56-5222-11ec-8244-db8a94893b78", _.syntax.literal);

export type $AλShape = $.typeutil.flatten<_std.$Object_7b057b6477f811ec8deb1f5fc25e7818λShape & {
  "s p A m 🤞": $.LinkDesc<$SpaM_6175fb8e522211eca4592d0a8657e1b8, $.Cardinality.One, {}, false, true, false>;
  "<Ł💯[is Łukasz]": $.LinkDesc<$ukasz_61706188522211ec8089a1208956222f, $.Cardinality.Many, {}, false, false, false>;
  "<Ł💯": $.LinkDesc<$.ObjectType, $.Cardinality.Many, {}, false, false, false>;
}>;
type $A = $.ObjectType<"default::A", $AλShape, null>;
const $A = $.makeType<$A>(_.spec, "6165e924-5222-11ec-a61b-717fdd8f6589", _.syntax.literal);

const A: $.$expr_PathNode<$.TypeSet<$A, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($A, $.Cardinality.Many), null, true);

export type $HasNameλShape = $.typeutil.flatten<_std.$Object_7b057b6477f811ec8deb1f5fc25e7818λShape & {
  "name": $.PropertyDesc<_std.$str, $.Cardinality.AtMostOne, false, true, false>;
}>;
type $HasName = $.ObjectType<"default::HasName", $HasNameλShape, null>;
const $HasName = $.makeType<$HasName>(_.spec, "615ccd9e-5222-11ec-9b0d-41e1bdaa68e8", _.syntax.literal);

const HasName: $.$expr_PathNode<$.TypeSet<$HasName, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($HasName, $.Cardinality.Many), null, true);

export type $HasAgeλShape = $.typeutil.flatten<_std.$Object_7b057b6477f811ec8deb1f5fc25e7818λShape & {
  "age": $.PropertyDesc<_std.$int64, $.Cardinality.AtMostOne, false, true, false>;
}>;
type $HasAge = $.ObjectType<"default::HasAge", $HasAgeλShape, null>;
const $HasAge = $.makeType<$HasAge>(_.spec, "615b748a-5222-11ec-bbaf-d3e5e609d9a3", _.syntax.literal);

const HasAge: $.$expr_PathNode<$.TypeSet<$HasAge, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($HasAge, $.Cardinality.Many), null, true);

export type $BagλShape = $.typeutil.flatten<$HasNameλShape & $HasAgeλShape & {
  "enumArr": $.PropertyDesc<$.ArrayType<$Genre>, $.Cardinality.AtMostOne, false, true, false>;
  "bigintField": $.PropertyDesc<_std.$bigint, $.Cardinality.AtMostOne, false, true, false>;
  "boolField": $.PropertyDesc<_std.$bool, $.Cardinality.AtMostOne, false, true, false>;
  "datetimeField": $.PropertyDesc<_std.$datetime, $.Cardinality.AtMostOne, false, true, false>;
  "decimalField": $.PropertyDesc<_std.$decimal, $.Cardinality.AtMostOne, false, true, false>;
  "durationField": $.PropertyDesc<_std.$duration, $.Cardinality.AtMostOne, false, true, false>;
  "float32Field": $.PropertyDesc<_std.$float32, $.Cardinality.AtMostOne, false, true, false>;
  "float64Field": $.PropertyDesc<_std.$float64, $.Cardinality.AtMostOne, false, true, false>;
  "genre": $.PropertyDesc<$Genre, $.Cardinality.AtMostOne, false, true, false>;
  "int16Field": $.PropertyDesc<_std.$int16, $.Cardinality.AtMostOne, false, true, false>;
  "int32Field": $.PropertyDesc<_std.$int32, $.Cardinality.AtMostOne, false, true, false>;
  "int64Field": $.PropertyDesc<_std.$int64, $.Cardinality.AtMostOne, false, true, false>;
  "localDateField": $.PropertyDesc<_cal.$local_date, $.Cardinality.AtMostOne, false, true, false>;
  "localDateTimeField": $.PropertyDesc<_cal.$local_datetime, $.Cardinality.AtMostOne, false, true, false>;
  "localTimeField": $.PropertyDesc<_cal.$local_time, $.Cardinality.AtMostOne, false, true, false>;
  "namedTuple": $.PropertyDesc<$.NamedTupleType<{x: _std.$str, y: _std.$int64}>, $.Cardinality.AtMostOne, false, true, false>;
  "secret_identity": $.PropertyDesc<_std.$str, $.Cardinality.AtMostOne, false, true, false>;
  "stringMultiArr": $.PropertyDesc<$.ArrayType<_std.$str>, $.Cardinality.Many, false, true, false>;
  "stringsArr": $.PropertyDesc<$.ArrayType<_std.$str>, $.Cardinality.AtMostOne, false, true, false>;
  "stringsMulti": $.PropertyDesc<_std.$str, $.Cardinality.AtLeastOne, false, true, false>;
  "unnamedTuple": $.PropertyDesc<$.TupleType<[_std.$str, _std.$int64]>, $.Cardinality.AtMostOne, false, true, false>;
}>;
type $Bag = $.ObjectType<"default::Bag", $BagλShape, null>;
const $Bag = $.makeType<$Bag>(_.spec, "615e3e86-5222-11ec-85e1-c536e21415ce", _.syntax.literal);

const Bag: $.$expr_PathNode<$.TypeSet<$Bag, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($Bag, $.Cardinality.Many), null, true);

export type $PersonλShape = $.typeutil.flatten<_std.$Object_7b057b6477f811ec8deb1f5fc25e7818λShape & {
  "name": $.PropertyDesc<_std.$str, $.Cardinality.One, true, true, false>;
  "<characters[is Movie]": $.LinkDesc<$Movie, $.Cardinality.Many, {}, false, false, false>;
  "<characters": $.LinkDesc<$.ObjectType, $.Cardinality.Many, {}, false, false, false>;
}>;
type $Person = $.ObjectType<"default::Person", $PersonλShape, null>;
const $Person = $.makeType<$Person>(_.spec, "61797b60-5222-11ec-b72f-83e2a66aca2c", _.syntax.literal);

const Person: $.$expr_PathNode<$.TypeSet<$Person, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($Person, $.Cardinality.Many), null, true);

export type $HeroλShape = $.typeutil.flatten<$PersonλShape & {
  "villains": $.LinkDesc<$Villain, $.Cardinality.Many, {}, false, false, false>;
  "number_of_movies": $.PropertyDesc<_std.$int64, $.Cardinality.AtMostOne, false, true, false>;
  "secret_identity": $.PropertyDesc<_std.$str, $.Cardinality.AtMostOne, false, true, false>;
  "<nemesis[is Villain]": $.LinkDesc<$Villain, $.Cardinality.Many, {}, false, false, false>;
  "<nemesis": $.LinkDesc<$.ObjectType, $.Cardinality.Many, {}, false, false, false>;
}>;
type $Hero = $.ObjectType<"default::Hero", $HeroλShape, null>;
const $Hero = $.makeType<$Hero>(_.spec, "6182b464-5222-11ec-a001-ad2669f69225", _.syntax.literal);

const Hero: $.$expr_PathNode<$.TypeSet<$Hero, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($Hero, $.Cardinality.Many), null, true);

export type $MovieλShape = $.typeutil.flatten<_std.$Object_7b057b6477f811ec8deb1f5fc25e7818λShape & {
  "characters": $.LinkDesc<$Person, $.Cardinality.Many, {
    "@character_name": $.PropertyDesc<_std.$str, $.Cardinality.AtMostOne>;
  }, false, true, false>;
  "profile": $.LinkDesc<$Profile, $.Cardinality.AtMostOne, {}, true, true, false>;
  "genre": $.PropertyDesc<$Genre, $.Cardinality.AtMostOne, false, true, false>;
  "rating": $.PropertyDesc<_std.$float64, $.Cardinality.AtMostOne, false, true, false>;
  "title": $.PropertyDesc<_std.$str, $.Cardinality.One, false, true, false>;
  "release_year": $.PropertyDesc<_std.$int16, $.Cardinality.One, false, true, true>;
}>;
type $Movie = $.ObjectType<"default::Movie", $MovieλShape, null>;
const $Movie = $.makeType<$Movie>(_.spec, "617cee44-5222-11ec-9d8f-79a472544ad6", _.syntax.literal);

const Movie: $.$expr_PathNode<$.TypeSet<$Movie, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($Movie, $.Cardinality.Many), null, true);

export type $MovieShapeλShape = $.typeutil.flatten<_std.$Object_7b057b6477f811ec8deb1f5fc25e7818λShape & {
}>;
type $MovieShape = $.ObjectType<"default::MovieShape", $MovieShapeλShape, null>;
const $MovieShape = $.makeType<$MovieShape>(_.spec, "618a1f1a-5222-11ec-b4de-97d6e10e4aa8", _.syntax.literal);

const MovieShape: $.$expr_PathNode<$.TypeSet<$MovieShape, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($MovieShape, $.Cardinality.Many), null, true);

export type $ProfileλShape = $.typeutil.flatten<_std.$Object_7b057b6477f811ec8deb1f5fc25e7818λShape & {
  "plot_summary": $.PropertyDesc<_std.$str, $.Cardinality.AtMostOne, false, true, false>;
  "<profile[is Movie]": $.LinkDesc<$Movie, $.Cardinality.AtMostOne, {}, true, false, false>;
  "<profile": $.LinkDesc<$.ObjectType, $.Cardinality.Many, {}, false, false, false>;
}>;
type $Profile = $.ObjectType<"default::Profile", $ProfileλShape, null>;
const $Profile = $.makeType<$Profile>(_.spec, "617b95b2-5222-11ec-82c5-7d669cab4fa5", _.syntax.literal);

const Profile: $.$expr_PathNode<$.TypeSet<$Profile, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($Profile, $.Cardinality.Many), null, true);

export type $SpaM_6175fb8e522211eca4592d0a8657e1b8λShape = $.typeutil.flatten<_std.$Object_7b057b6477f811ec8deb1f5fc25e7818λShape & {
  "🚀": $.PropertyDesc<_std.$int32, $.Cardinality.One, false, true, false>;
  "c100": $.PropertyDesc<_std.$int64, $.Cardinality.One, false, false, false>;
  "<s p A m 🤞[is A]": $.LinkDesc<$A, $.Cardinality.Many, {}, false, false, false>;
  "<s p A m 🤞": $.LinkDesc<$.ObjectType, $.Cardinality.Many, {}, false, false, false>;
}>;
type $SpaM_6175fb8e522211eca4592d0a8657e1b8 = $.ObjectType<"default::S p a M", $SpaM_6175fb8e522211eca4592d0a8657e1b8λShape, null>;
const $SpaM_6175fb8e522211eca4592d0a8657e1b8 = $.makeType<$SpaM_6175fb8e522211eca4592d0a8657e1b8>(_.spec, "6175fb8e-5222-11ec-a459-2d0a8657e1b8", _.syntax.literal);

const SpaM_6175fb8e522211eca4592d0a8657e1b8: $.$expr_PathNode<$.TypeSet<$SpaM_6175fb8e522211eca4592d0a8657e1b8, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($SpaM_6175fb8e522211eca4592d0a8657e1b8, $.Cardinality.Many), null, true);

export type $SimpleλShape = $.typeutil.flatten<$HasNameλShape & $HasAgeλShape & {
}>;
type $Simple = $.ObjectType<"default::Simple", $SimpleλShape, null>;
const $Simple = $.makeType<$Simple>(_.spec, "61804788-5222-11ec-a3ea-9da16efe9179", _.syntax.literal);

const Simple: $.$expr_PathNode<$.TypeSet<$Simple, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($Simple, $.Cardinality.Many), null, true);

export type $VillainλShape = $.typeutil.flatten<$PersonλShape & {
  "nemesis": $.LinkDesc<$Hero, $.Cardinality.AtMostOne, {}, false, true, false>;
  "<villains[is Hero]": $.LinkDesc<$Hero, $.Cardinality.Many, {}, false, false, false>;
  "<villains": $.LinkDesc<$.ObjectType, $.Cardinality.Many, {}, false, false, false>;
}>;
type $Villain = $.ObjectType<"default::Villain", $VillainλShape, null>;
const $Villain = $.makeType<$Villain>(_.spec, "6184ecde-5222-11ec-871e-0d407b48fbc9", _.syntax.literal);

const Villain: $.$expr_PathNode<$.TypeSet<$Villain, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($Villain, $.Cardinality.Many), null, true);

export type $ukasz_61706188522211ec8089a1208956222fλShape = $.typeutil.flatten<_std.$Object_7b057b6477f811ec8deb1f5fc25e7818λShape & {
  "Ł💯": $.LinkDesc<$A, $.Cardinality.AtMostOne, {
    "@🙀مرحبا🙀": $.PropertyDesc<$_61681488522211ecbf9a1dea2d8e6375, $.Cardinality.AtMostOne>;
    "@🙀🚀🚀🚀🙀": $.PropertyDesc<$_616dff56522211ec8244db8a94893b78, $.Cardinality.AtMostOne>;
  }, false, true, false>;
  "Ł🤞": $.PropertyDesc<$_616dff56522211ec8244db8a94893b78, $.Cardinality.One, false, true, true>;
}>;
type $ukasz_61706188522211ec8089a1208956222f = $.ObjectType<"default::Łukasz", $ukasz_61706188522211ec8089a1208956222fλShape, null>;
const $ukasz_61706188522211ec8089a1208956222f = $.makeType<$ukasz_61706188522211ec8089a1208956222f>(_.spec, "61706188-5222-11ec-8089-a1208956222f", _.syntax.literal);

const ukasz_61706188522211ec8089a1208956222f: $.$expr_PathNode<$.TypeSet<$ukasz_61706188522211ec8089a1208956222f, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($ukasz_61706188522211ec8089a1208956222f, $.Cardinality.Many), null, true);

type _615b3d30522211ecb80125f264b11669λFuncExpr<
  NamedArgs extends {
    "🙀": _.castMaps.orScalarLiteral<$.TypeSet<_std.$number>>,
  },
> = $.$expr_Function<
  "default::💯",
  [],
  _.castMaps.mapLiteralToTypeSet<NamedArgs>,
  $.TypeSet<_std.$number, _.castMaps.literalToTypeSet<NamedArgs["🙀"]>["__cardinality__"]>
>;
function _615b3d30522211ecb80125f264b11669<
  NamedArgs extends {
    "🙀": _.castMaps.orScalarLiteral<$.TypeSet<_std.$number>>,
  },
>(
  namedArgs: NamedArgs,
): _615b3d30522211ecb80125f264b11669λFuncExpr<NamedArgs>;
function _615b3d30522211ecb80125f264b11669(...args: any[]) {
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



export { $GenreλEnum, Genre, _6167fbd8522211ecb676ffcb3cdf24e0, _61681488522211ecbf9a1dea2d8e6375, _616dff56522211ec8244db8a94893b78, $A, A, $HasName, HasName, $HasAge, HasAge, $Bag, Bag, $Person, Person, $Hero, Hero, $Movie, Movie, $MovieShape, MovieShape, $Profile, Profile, $SpaM_6175fb8e522211eca4592d0a8657e1b8, SpaM_6175fb8e522211eca4592d0a8657e1b8, $Simple, Simple, $Villain, Villain, $ukasz_61706188522211ec8089a1208956222f, ukasz_61706188522211ec8089a1208956222f };

type __defaultExports = {
  "Genre": typeof Genre;
  "你好": typeof _6167fbd8522211ecb676ffcb3cdf24e0;
  "مرحبا": typeof _61681488522211ecbf9a1dea2d8e6375;
  "🚀🚀🚀": typeof _616dff56522211ec8244db8a94893b78;
  "A": typeof A;
  "HasName": typeof HasName;
  "HasAge": typeof HasAge;
  "Bag": typeof Bag;
  "Person": typeof Person;
  "Hero": typeof Hero;
  "Movie": typeof Movie;
  "MovieShape": typeof MovieShape;
  "Profile": typeof Profile;
  "S p a M": typeof SpaM_6175fb8e522211eca4592d0a8657e1b8;
  "Simple": typeof Simple;
  "Villain": typeof Villain;
  "Łukasz": typeof ukasz_61706188522211ec8089a1208956222f;
  "💯": typeof _615b3d30522211ecb80125f264b11669
};
const __defaultExports: __defaultExports = {
  "Genre": Genre,
  "你好": _6167fbd8522211ecb676ffcb3cdf24e0,
  "مرحبا": _61681488522211ecbf9a1dea2d8e6375,
  "🚀🚀🚀": _616dff56522211ec8244db8a94893b78,
  "A": A,
  "HasName": HasName,
  "HasAge": HasAge,
  "Bag": Bag,
  "Person": Person,
  "Hero": Hero,
  "Movie": Movie,
  "MovieShape": MovieShape,
  "Profile": Profile,
  "S p a M": SpaM_6175fb8e522211eca4592d0a8657e1b8,
  "Simple": Simple,
  "Villain": Villain,
  "Łukasz": ukasz_61706188522211ec8089a1208956222f,
  "💯": _615b3d30522211ecb80125f264b11669
};
export default __defaultExports;
