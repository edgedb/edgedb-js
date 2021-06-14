import {reflection as $} from "edgedb";
import {spec as __spec__} from "../__spec__";
import type * as __types__ from "../__types__/cfg";

export const ConfigObject = $.objectType<__types__.ConfigObject>(
  __spec__,
  "cfg::ConfigObject",
);

export const AbstractConfig = $.objectType<__types__.AbstractConfig>(
  __spec__,
  "cfg::AbstractConfig",
);

export const Auth = $.objectType<__types__.Auth>(
  __spec__,
  "cfg::Auth",
);

export const AuthMethod = $.objectType<__types__.AuthMethod>(
  __spec__,
  "cfg::AuthMethod",
);

export const Config = $.objectType<__types__.Config>(
  __spec__,
  "cfg::Config",
);

export const DatabaseConfig = $.objectType<__types__.DatabaseConfig>(
  __spec__,
  "cfg::DatabaseConfig",
);

export const SCRAM = $.objectType<__types__.SCRAM>(
  __spec__,
  "cfg::SCRAM",
);

export const SystemConfig = $.objectType<__types__.SystemConfig>(
  __spec__,
  "cfg::SystemConfig",
);

export const Trust = $.objectType<__types__.Trust>(
  __spec__,
  "cfg::Trust",
);
