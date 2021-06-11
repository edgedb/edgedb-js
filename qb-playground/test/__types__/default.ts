import {reflection as $} from "edgedb";
import type * as stdTypes from "./std";

export interface Person extends stdTypes.Object {
  name: $.PropertyDesc<string, $.Cardinality.One>;
}

export interface Hero extends Person {
  villains: $.LinkDesc<Villain, $.Cardinality.Many>;
  secret_identity: $.PropertyDesc<string, $.Cardinality.AtMostOne>;
  number_of_movies: $.PropertyDesc<number, $.Cardinality.AtMostOne>;
}

export interface Movie extends stdTypes.Object {
  characters: $.LinkDesc<Person, $.Cardinality.Many>;
  title: $.PropertyDesc<string, $.Cardinality.One>;
}

export interface Villain extends Person {
  nemesis: $.LinkDesc<Hero, $.Cardinality.AtMostOne>;
}
