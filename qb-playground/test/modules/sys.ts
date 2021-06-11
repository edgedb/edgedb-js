import {reflection as $} from "edgedb";
import {spec as __spec__} from "../__spec__";
import type * as __types__ from "../__types__/sys";

export enum TransactionIsolation {
  RepeatableRead = "RepeatableRead",
  Serializable = "Serializable",
}

export enum VersionStage {
  dev = "dev",
  alpha = "alpha",
  beta = "beta",
  rc = "rc",
  final = "final",
}

export const SystemObject = $.objectType<__types__.SystemObject>(
  __spec__,
  "sys::SystemObject",
);

export const Database = $.objectType<__types__.Database>(
  __spec__,
  "sys::Database",
);

export const ExtensionPackage = $.objectType<__types__.ExtensionPackage>(
  __spec__,
  "sys::ExtensionPackage",
);

export const Role = $.objectType<__types__.Role>(
  __spec__,
  "sys::Role",
);
