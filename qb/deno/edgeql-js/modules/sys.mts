import { $ } from "edgedb";
import * as _ from "../imports.mjs";
import type * as _schema from "./schema.mjs";
import type * as _std from "./std.mjs";
enum $TransactionIsolationλEnum {
  RepeatableRead = "RepeatableRead",
  Serializable = "Serializable",
}
export type $TransactionIsolation = {
  RepeatableRead: $.$expr_Literal<$TransactionIsolation>;
  Serializable: $.$expr_Literal<$TransactionIsolation>;
} & $.EnumType<"sys::TransactionIsolation", `${$TransactionIsolationλEnum}`>;
const TransactionIsolation: $TransactionIsolation = $.makeType<$TransactionIsolation>(_.spec, "0f2f0410-06d1-11ed-82cd-47300cae2d4e", _.syntax.literal);

enum $VersionStageλEnum {
  dev = "dev",
  alpha = "alpha",
  beta = "beta",
  rc = "rc",
  final = "final",
}
export type $VersionStage = {
  dev: $.$expr_Literal<$VersionStage>;
  alpha: $.$expr_Literal<$VersionStage>;
  beta: $.$expr_Literal<$VersionStage>;
  rc: $.$expr_Literal<$VersionStage>;
  final: $.$expr_Literal<$VersionStage>;
} & $.EnumType<"sys::VersionStage", `${$VersionStageλEnum}`>;
const VersionStage: $VersionStage = $.makeType<$VersionStage>(_.spec, "0f2f902e-06d1-11ed-8089-170b1dda3a08", _.syntax.literal);

export type $SystemObjectλShape = $.typeutil.flatten<_schema.$AnnotationSubjectλShape & {
}>;
type $SystemObject = $.ObjectType<"sys::SystemObject", $SystemObjectλShape, null>;
const $SystemObject = $.makeType<$SystemObject>(_.spec, "0f301b7a-06d1-11ed-b294-292032e0da81", _.syntax.literal);

const SystemObject: $.$expr_PathNode<$.TypeSet<$SystemObject, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($SystemObject, $.Cardinality.Many), null, true);

export type $DatabaseλShape = $.typeutil.flatten<$SystemObjectλShape & _schema.$AnnotationSubjectλShape & {
  "name": $.PropertyDesc<_std.$str, $.Cardinality.One, true, false, false, false>;
}>;
type $Database = $.ObjectType<"sys::Database", $DatabaseλShape, null>;
const $Database = $.makeType<$Database>(_.spec, "0f478ea4-06d1-11ed-8740-3374b6a0d6aa", _.syntax.literal);

const Database: $.$expr_PathNode<$.TypeSet<$Database, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($Database, $.Cardinality.Many), null, true);

export type $ExtensionPackageλShape = $.typeutil.flatten<$SystemObjectλShape & _schema.$AnnotationSubjectλShape & {
  "script": $.PropertyDesc<_std.$str, $.Cardinality.One, false, false, false, false>;
  "version": $.PropertyDesc<$.NamedTupleType<{major: _std.$int64, minor: _std.$int64, stage: $VersionStage, stage_no: _std.$int64, local: $.ArrayType<_std.$str>}>, $.Cardinality.One, false, false, false, false>;
  "<package[is schema::Extension]": $.LinkDesc<_schema.$Extension, $.Cardinality.AtMostOne, {}, true, false,  false, false>;
  "<package": $.LinkDesc<$.ObjectType, $.Cardinality.Many, {}, false, false,  false, false>;
}>;
type $ExtensionPackage = $.ObjectType<"sys::ExtensionPackage", $ExtensionPackageλShape, null>;
const $ExtensionPackage = $.makeType<$ExtensionPackage>(_.spec, "0f61f550-06d1-11ed-bbb6-cb2a2919e97e", _.syntax.literal);

const ExtensionPackage: $.$expr_PathNode<$.TypeSet<$ExtensionPackage, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($ExtensionPackage, $.Cardinality.Many), null, true);

export type $RoleλShape = $.typeutil.flatten<$SystemObjectλShape & _schema.$InheritingObjectλShape & _schema.$AnnotationSubjectλShape & {
  "name": $.PropertyDesc<_std.$str, $.Cardinality.One, true, false, false, false>;
  "superuser": $.PropertyDesc<_std.$bool, $.Cardinality.One, false, false, false, false>;
  "is_superuser": $.PropertyDesc<_std.$bool, $.Cardinality.One, false, true, false, false>;
  "password": $.PropertyDesc<_std.$str, $.Cardinality.AtMostOne, false, false, false, false>;
  "member_of": $.LinkDesc<$Role, $.Cardinality.Many, {}, false, false,  false, false>;
  "<member_of[is sys::Role]": $.LinkDesc<$Role, $.Cardinality.Many, {}, false, false,  false, false>;
  "<member_of": $.LinkDesc<$.ObjectType, $.Cardinality.Many, {}, false, false,  false, false>;
}>;
type $Role = $.ObjectType<"sys::Role", $RoleλShape, null>;
const $Role = $.makeType<$Role>(_.spec, "0f808b82-06d1-11ed-8a96-f1dced8239e1", _.syntax.literal);

const Role: $.$expr_PathNode<$.TypeSet<$Role, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($Role, $.Cardinality.Many), null, true);

type get_versionλFuncExpr = $.$expr_Function<
  "sys::get_version",
  [],
  {},
  $.TypeSet<$.NamedTupleType<{major: _std.$int64, minor: _std.$int64, stage: $VersionStage, stage_no: _std.$int64, local: $.ArrayType<_std.$str>}>, $.Cardinality.One>
>;
/**
 * Return the server version as a tuple.
 */
function get_version(): get_versionλFuncExpr;
function get_version(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('sys::get_version', args, _.spec, [
    {args: [], returnTypeId: "8619700d-3700-ca1c-2da7-7f7e74aa0e40"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "sys::get_version",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type get_version_as_strλFuncExpr = $.$expr_Function<
  "sys::get_version_as_str",
  [],
  {},
  $.TypeSet<_std.$str, $.Cardinality.One>
>;
/**
 * Return the server version as a string.
 */
function get_version_as_str(): get_version_as_strλFuncExpr;
function get_version_as_str(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('sys::get_version_as_str', args, _.spec, [
    {args: [], returnTypeId: "00000000-0000-0000-0000-000000000101"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "sys::get_version_as_str",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type get_instance_nameλFuncExpr = $.$expr_Function<
  "sys::get_instance_name",
  [],
  {},
  $.TypeSet<_std.$str, $.Cardinality.One>
>;
/**
 * Return the server instance name.
 */
function get_instance_name(): get_instance_nameλFuncExpr;
function get_instance_name(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('sys::get_instance_name', args, _.spec, [
    {args: [], returnTypeId: "00000000-0000-0000-0000-000000000101"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "sys::get_instance_name",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type get_transaction_isolationλFuncExpr = $.$expr_Function<
  "sys::get_transaction_isolation",
  [],
  {},
  $.TypeSet<$TransactionIsolation, $.Cardinality.One>
>;
/**
 * Return the isolation level of the current transaction.
 */
function get_transaction_isolation(): get_transaction_isolationλFuncExpr;
function get_transaction_isolation(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('sys::get_transaction_isolation', args, _.spec, [
    {args: [], returnTypeId: "0f2f0410-06d1-11ed-82cd-47300cae2d4e"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "sys::get_transaction_isolation",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type get_current_databaseλFuncExpr = $.$expr_Function<
  "sys::get_current_database",
  [],
  {},
  $.TypeSet<_std.$str, $.Cardinality.One>
>;
/**
 * Return the name of the current database as a string.
 */
function get_current_database(): get_current_databaseλFuncExpr;
function get_current_database(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('sys::get_current_database', args, _.spec, [
    {args: [], returnTypeId: "00000000-0000-0000-0000-000000000101"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "sys::get_current_database",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type sleep_12fdb67c06d111ed835ea98c168dd1efλFuncExpr<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<_std.$number>>,
> = $.$expr_Function<
  "sys::_sleep",
  _.castMaps.mapLiteralToTypeSet<[P1]>,
  {},
  $.TypeSet<_std.$bool, $.cardinalityUtil.paramCardinality<P1>>
>;
type sleep_12fdb67c06d111ed835ea98c168dd1efλFuncExpr2<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<_std.$duration>>,
> = $.$expr_Function<
  "sys::_sleep",
  _.castMaps.mapLiteralToTypeSet<[P1]>,
  {},
  $.TypeSet<_std.$bool, $.cardinalityUtil.paramCardinality<P1>>
>;
/**
 * Make the current session sleep for *duration* seconds.
 */
function sleep_12fdb67c06d111ed835ea98c168dd1ef<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<_std.$number>>,
>(
  duration: P1,
): sleep_12fdb67c06d111ed835ea98c168dd1efλFuncExpr<P1>;
/**
 * Make the current session sleep for *duration* time.
 */
function sleep_12fdb67c06d111ed835ea98c168dd1ef<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<_std.$duration>>,
>(
  duration: P1,
): sleep_12fdb67c06d111ed835ea98c168dd1efλFuncExpr2<P1>;
function sleep_12fdb67c06d111ed835ea98c168dd1ef(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('sys::_sleep', args, _.spec, [
    {args: [{typeId: "00000000-0000-0000-0000-0000000001ff", optional: false, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-000000000109"},
    {args: [{typeId: "00000000-0000-0000-0000-00000000010e", optional: false, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-000000000109"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "sys::_sleep",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type advisory_lock_130169e806d111eda0ef972ad5327607λFuncExpr<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<_std.$number>>,
> = $.$expr_Function<
  "sys::_advisory_lock",
  _.castMaps.mapLiteralToTypeSet<[P1]>,
  {},
  $.TypeSet<_std.$bool, $.cardinalityUtil.paramCardinality<P1>>
>;
/**
 * Obtain an exclusive session-level advisory lock.
 */
function advisory_lock_130169e806d111eda0ef972ad5327607<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<_std.$number>>,
>(
  key: P1,
): advisory_lock_130169e806d111eda0ef972ad5327607λFuncExpr<P1>;
function advisory_lock_130169e806d111eda0ef972ad5327607(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('sys::_advisory_lock', args, _.spec, [
    {args: [{typeId: "00000000-0000-0000-0000-0000000001ff", optional: false, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-000000000109"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "sys::_advisory_lock",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type advisory_unlock_13034c6806d111ed92ff875374b0703dλFuncExpr<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<_std.$number>>,
> = $.$expr_Function<
  "sys::_advisory_unlock",
  _.castMaps.mapLiteralToTypeSet<[P1]>,
  {},
  $.TypeSet<_std.$bool, $.cardinalityUtil.paramCardinality<P1>>
>;
/**
 * Release an exclusive session-level advisory lock.
 */
function advisory_unlock_13034c6806d111ed92ff875374b0703d<
  P1 extends _.castMaps.orScalarLiteral<$.TypeSet<_std.$number>>,
>(
  key: P1,
): advisory_unlock_13034c6806d111ed92ff875374b0703dλFuncExpr<P1>;
function advisory_unlock_13034c6806d111ed92ff875374b0703d(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('sys::_advisory_unlock', args, _.spec, [
    {args: [{typeId: "00000000-0000-0000-0000-0000000001ff", optional: false, setoftype: false, variadic: false}], returnTypeId: "00000000-0000-0000-0000-000000000109"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "sys::_advisory_unlock",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};

type advisory_unlock_all_1305146206d111ed9e3c05538cbd5cd1λFuncExpr = $.$expr_Function<
  "sys::_advisory_unlock_all",
  [],
  {},
  $.TypeSet<_std.$bool, $.Cardinality.One>
>;
/**
 * Release all session-level advisory locks held by the current session.
 */
function advisory_unlock_all_1305146206d111ed9e3c05538cbd5cd1(): advisory_unlock_all_1305146206d111ed9e3c05538cbd5cd1λFuncExpr;
function advisory_unlock_all_1305146206d111ed9e3c05538cbd5cd1(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('sys::_advisory_unlock_all', args, _.spec, [
    {args: [], returnTypeId: "00000000-0000-0000-0000-000000000109"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "sys::_advisory_unlock_all",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};



export { $TransactionIsolationλEnum, TransactionIsolation, $VersionStageλEnum, VersionStage, $SystemObject, SystemObject, $Database, Database, $ExtensionPackage, ExtensionPackage, $Role, Role };

type __defaultExports = {
  "TransactionIsolation": typeof TransactionIsolation;
  "VersionStage": typeof VersionStage;
  "SystemObject": typeof SystemObject;
  "Database": typeof Database;
  "ExtensionPackage": typeof ExtensionPackage;
  "Role": typeof Role;
  "get_version": typeof get_version;
  "get_version_as_str": typeof get_version_as_str;
  "get_instance_name": typeof get_instance_name;
  "get_transaction_isolation": typeof get_transaction_isolation;
  "get_current_database": typeof get_current_database;
  "_sleep": typeof sleep_12fdb67c06d111ed835ea98c168dd1ef;
  "_advisory_lock": typeof advisory_lock_130169e806d111eda0ef972ad5327607;
  "_advisory_unlock": typeof advisory_unlock_13034c6806d111ed92ff875374b0703d;
  "_advisory_unlock_all": typeof advisory_unlock_all_1305146206d111ed9e3c05538cbd5cd1
};
const __defaultExports: __defaultExports = {
  "TransactionIsolation": TransactionIsolation,
  "VersionStage": VersionStage,
  "SystemObject": SystemObject,
  "Database": Database,
  "ExtensionPackage": ExtensionPackage,
  "Role": Role,
  "get_version": get_version,
  "get_version_as_str": get_version_as_str,
  "get_instance_name": get_instance_name,
  "get_transaction_isolation": get_transaction_isolation,
  "get_current_database": get_current_database,
  "_sleep": sleep_12fdb67c06d111ed835ea98c168dd1ef,
  "_advisory_lock": advisory_lock_130169e806d111eda0ef972ad5327607,
  "_advisory_unlock": advisory_unlock_13034c6806d111ed92ff875374b0703d,
  "_advisory_unlock_all": advisory_unlock_all_1305146206d111ed9e3c05538cbd5cd1
};
export default __defaultExports;
