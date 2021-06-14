import {reflection as $} from "edgedb";
import type * as schemaTypes from "./schema";

export interface BaseObject {
  id: $.PropertyDesc<string, $.Cardinality.One>;
  __type__: $.LinkDesc<schemaTypes.Type, $.Cardinality.One>;
}

export interface Object extends BaseObject {
}
