import {reflection as $} from "edgedb";
import type * as stdTypes from "./std";
import {spec as __spec__} from "../__spec__";

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

export const ConfigObject = $.objectType<ConfigObject>(
  __spec__,
  "cfg::ConfigObject",
);

export const AbstractConfig = $.objectType<AbstractConfig>(
  __spec__,
  "cfg::AbstractConfig",
);

export const Auth = $.objectType<Auth>(
  __spec__,
  "cfg::Auth",
);

export const AuthMethod = $.objectType<AuthMethod>(
  __spec__,
  "cfg::AuthMethod",
);

export const Config = $.objectType<Config>(
  __spec__,
  "cfg::Config",
);

export const DatabaseConfig = $.objectType<DatabaseConfig>(
  __spec__,
  "cfg::DatabaseConfig",
);

export const SCRAM = $.objectType<SCRAM>(
  __spec__,
  "cfg::SCRAM",
);

export const SystemConfig = $.objectType<SystemConfig>(
  __spec__,
  "cfg::SystemConfig",
);

export const Trust = $.objectType<Trust>(
  __spec__,
  "cfg::Trust",
);
