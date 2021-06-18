import type * as stdTypes from "./std";
import type * as scalarBase from "../scalarBase";
import {reflection as $} from "edgedb";
import type * as schemaTypes from "./schema";
import type * as sysTypes from "../modules/sys";
import {spec as __spec__} from "../__spec__";

export enum TransactionIsolationEnum {
  RepeatableRead = "RepeatableRead",
  Serializable = "Serializable",
}
export type TransactionIsolation = typeof TransactionIsolationEnum & stdTypes.Anyenum<TransactionIsolationEnum, "sys::TransactionIsolation", ["RepeatableRead", "Serializable"]>;
export const TransactionIsolation: TransactionIsolation = {...TransactionIsolationEnum, __values: ["RepeatableRead", "Serializable"]} as any;

export enum VersionStageEnum {
  dev = "dev",
  alpha = "alpha",
  beta = "beta",
  rc = "rc",
  final = "final",
}
export type VersionStage = typeof VersionStageEnum & stdTypes.Anyenum<VersionStageEnum, "sys::VersionStage", ["dev", "alpha", "beta", "rc", "final"]>;
export const VersionStage: VersionStage = {...VersionStageEnum, __values: ["dev", "alpha", "beta", "rc", "final"]} as any;

export interface SystemObject extends schemaTypes.AnnotationSubject {
}

export interface Database extends SystemObject, schemaTypes.AnnotationSubject {
  name: $.PropertyDesc<string, $.Cardinality.One>;
}

export interface ExtensionPackage extends SystemObject, schemaTypes.AnnotationSubject {
  script: $.PropertyDesc<string, $.Cardinality.One>;
  version: $.PropertyDesc<{major: number,minor: number,stage: sysTypes.VersionStage,stage_no: number,local: string[]}, $.Cardinality.One>;
}

export interface Role extends SystemObject, schemaTypes.InheritingObject, schemaTypes.AnnotationSubject {
  name: $.PropertyDesc<string, $.Cardinality.One>;
  superuser: $.PropertyDesc<boolean, $.Cardinality.One>;
  is_superuser: $.PropertyDesc<boolean, $.Cardinality.One>;
  password: $.PropertyDesc<string, $.Cardinality.AtMostOne>;
  member_of: $.LinkDesc<Role, $.Cardinality.Many>;
}

export const SystemObject = $.objectType<SystemObject>(
  __spec__,
  "sys::SystemObject",
);

export const Database = $.objectType<Database>(
  __spec__,
  "sys::Database",
);

export const ExtensionPackage = $.objectType<ExtensionPackage>(
  __spec__,
  "sys::ExtensionPackage",
);

export const Role = $.objectType<Role>(
  __spec__,
  "sys::Role",
);
