import {reflection as $} from "edgedb";
import type * as stdTypes from "./std";

export interface Mutation extends stdTypes.BaseObject {
  __typename: $.PropertyDesc<string, $.Cardinality.One>;
}

export interface Query extends stdTypes.BaseObject {
  __typename: $.PropertyDesc<string, $.Cardinality.One>;
}
