import {reflection as $} from "edgedb";
import type * as stdTypes from "./std";
import {spec as __spec__} from "../__spec__";

export interface Mutation extends stdTypes.BaseObject {
  __typename: $.PropertyDesc<string, $.Cardinality.One>;
}

export interface Query extends stdTypes.BaseObject {
  __typename: $.PropertyDesc<string, $.Cardinality.One>;
}

export const Mutation = $.objectType<Mutation>(
  __spec__,
  "stdgraphql::Mutation",
);

export const Query = $.objectType<Query>(
  __spec__,
  "stdgraphql::Query",
);
