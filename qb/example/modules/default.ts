import type * as stdTypes from "./std";
import type * as scalarBase from "../scalarBase";
import {reflection as $} from "edgedb";
import * as edgedb from "edgedb";
import type * as defaultTypes from "../modules/default";
import {spec as __spec__} from "../__spec__";

export enum GenreEnum {
  Horror = "Horror",
  Action = "Action",
  RomCom = "RomCom",
}
export type Genre = typeof GenreEnum & stdTypes.Anyenum<GenreEnum, "default::Genre", ["Horror", "Action", "RomCom"]>;
export const Genre: Genre = {...GenreEnum, __values: ["Horror", "Action", "RomCom"]} as any;

export interface Bag extends stdTypes.Object {
  bigintField: $.PropertyDesc<BigInt, $.Cardinality.AtMostOne>;
  boolField: $.PropertyDesc<boolean, $.Cardinality.AtMostOne>;
  datetimeField: $.PropertyDesc<Date, $.Cardinality.AtMostOne>;
  decimalField: $.PropertyDesc<unknown, $.Cardinality.AtMostOne>;
  durationField: $.PropertyDesc<edgedb.Duration, $.Cardinality.AtMostOne>;
  float32Field: $.PropertyDesc<number, $.Cardinality.AtMostOne>;
  float64Field: $.PropertyDesc<number, $.Cardinality.AtMostOne>;
  genre: $.PropertyDesc<defaultTypes.Genre, $.Cardinality.AtMostOne>;
  int16Field: $.PropertyDesc<number, $.Cardinality.AtMostOne>;
  int32Field: $.PropertyDesc<number, $.Cardinality.AtMostOne>;
  int64Field: $.PropertyDesc<number, $.Cardinality.AtMostOne>;
  localDateField: $.PropertyDesc<edgedb.LocalDate, $.Cardinality.AtMostOne>;
  localDateTimeField: $.PropertyDesc<edgedb.LocalDateTime, $.Cardinality.AtMostOne>;
  localTimeField: $.PropertyDesc<edgedb.LocalTime, $.Cardinality.AtMostOne>;
  namedTuple: $.PropertyDesc<{x: string,y: number}, $.Cardinality.AtMostOne>;
  secret_identity: $.PropertyDesc<string, $.Cardinality.AtMostOne>;
  stringMultiArr: $.PropertyDesc<string[], $.Cardinality.Many>;
  stringsArr: $.PropertyDesc<string[], $.Cardinality.AtMostOne>;
  stringsMulti: $.PropertyDesc<string, $.Cardinality.AtLeastOne>;
  unnamedTuple: $.PropertyDesc<[string,number], $.Cardinality.AtMostOne>;
  enumArr: $.PropertyDesc<defaultTypes.Genre[], $.Cardinality.AtMostOne>;
}

export interface Person extends stdTypes.Object {
  name: $.PropertyDesc<string, $.Cardinality.One>;
}

export interface Hero extends Person {
  number_of_movies: $.PropertyDesc<number, $.Cardinality.AtMostOne>;
  secret_identity: $.PropertyDesc<string, $.Cardinality.AtMostOne>;
  villains: $.LinkDesc<Villain, $.Cardinality.Many>;
}

export interface Movie extends stdTypes.Object {
  characters: $.LinkDesc<Person, $.Cardinality.Many>;
  title: $.PropertyDesc<string, $.Cardinality.One>;
  rating: $.PropertyDesc<number, $.Cardinality.AtMostOne>;
}

export interface Villain extends Person {
  nemesis: $.LinkDesc<Hero, $.Cardinality.AtMostOne>;
}

export const Bag = $.objectType<Bag>(
  __spec__,
  "default::Bag",
);

export const Person = $.objectType<Person>(
  __spec__,
  "default::Person",
);

export const Hero = $.objectType<Hero>(
  __spec__,
  "default::Hero",
);

export const Movie = $.objectType<Movie>(
  __spec__,
  "default::Movie",
);

export const Villain = $.objectType<Villain>(
  __spec__,
  "default::Villain",
);
