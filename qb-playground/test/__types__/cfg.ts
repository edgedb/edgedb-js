import {reflection as $} from "edgedb";
import type * as stdTypes from "./std";

export interface ConfigObject extends stdTypes.BaseObject {
}

export interface AbstractConfig extends ConfigObject {
  listen_port: $.PropertyDesc<number, $.Cardinality.One>;
  listen_addresses: $.PropertyDesc<string, $.Cardinality.Many>;
  auth: $.LinkDesc<Auth, $.Cardinality.Many>;
  allow_dml_in_functions: $.PropertyDesc<boolean, $.Cardinality.AtMostOne>;
  shared_buffers: $.PropertyDesc<string, $.Cardinality.AtMostOne>;
  query_work_mem: $.PropertyDesc<string, $.Cardinality.AtMostOne>;
  effective_cache_size: $.PropertyDesc<string, $.Cardinality.AtMostOne>;
  effective_io_concurrency: $.PropertyDesc<string, $.Cardinality.AtMostOne>;
  default_statistics_target: $.PropertyDesc<string, $.Cardinality.AtMostOne>;
}

export interface Auth extends ConfigObject {
  priority: $.PropertyDesc<number, $.Cardinality.One>;
  user: $.PropertyDesc<string, $.Cardinality.Many>;
  method: $.LinkDesc<AuthMethod, $.Cardinality.AtMostOne>;
  comment: $.PropertyDesc<string, $.Cardinality.AtMostOne>;
}

export interface AuthMethod extends ConfigObject {
}

export interface Config extends AbstractConfig {
}

export interface DatabaseConfig extends AbstractConfig {
}

export interface SCRAM extends AuthMethod {
}

export interface SystemConfig extends AbstractConfig {
}

export interface Trust extends AuthMethod {
}
