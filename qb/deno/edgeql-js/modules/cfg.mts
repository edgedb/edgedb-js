import { $ } from "edgedb";
import * as _ from "../imports.mjs";
import type * as _std from "./std.mjs";
enum $AllowBareDDLλEnum {
  AlwaysAllow = "AlwaysAllow",
  NeverAllow = "NeverAllow",
}
export type $AllowBareDDL = {
  AlwaysAllow: $.$expr_Literal<$AllowBareDDL>;
  NeverAllow: $.$expr_Literal<$AllowBareDDL>;
} & $.EnumType<"cfg::AllowBareDDL", `${$AllowBareDDLλEnum}`>;
const AllowBareDDL: $AllowBareDDL = $.makeType<$AllowBareDDL>(_.spec, "0fc269a8-06d1-11ed-9aa6-dbac7fda037f", _.syntax.literal);

enum $ConnectionTransportλEnum {
  TCP = "TCP",
  HTTP = "HTTP",
}
export type $ConnectionTransport = {
  TCP: $.$expr_Literal<$ConnectionTransport>;
  HTTP: $.$expr_Literal<$ConnectionTransport>;
} & $.EnumType<"cfg::ConnectionTransport", `${$ConnectionTransportλEnum}`>;
const ConnectionTransport: $ConnectionTransport = $.makeType<$ConnectionTransport>(_.spec, "0fc2ef7c-06d1-11ed-a11b-1d3e3b409314", _.syntax.literal);

enum $TestEnumλEnum {
  One = "One",
  Two = "Two",
  Three = "Three",
}
export type $TestEnum = {
  One: $.$expr_Literal<$TestEnum>;
  Two: $.$expr_Literal<$TestEnum>;
  Three: $.$expr_Literal<$TestEnum>;
} & $.EnumType<"cfg::TestEnum", `${$TestEnumλEnum}`>;
const TestEnum: $TestEnum = $.makeType<$TestEnum>(_.spec, "1254bad6-06d1-11ed-bf9c-6b1e87372d5e", _.syntax.literal);

export type $memory = $.ScalarType<"cfg::memory", _.edgedb.ConfigMemory>;
const memory: $.scalarTypeWithConstructor<$memory, never> = $.makeType<$.scalarTypeWithConstructor<$memory, never>>(_.spec, "00000000-0000-0000-0000-000000000130", _.syntax.literal);

export type $ConfigObjectλShape = $.typeutil.flatten<_std.$BaseObjectλShape & {
}>;
type $ConfigObject = $.ObjectType<"cfg::ConfigObject", $ConfigObjectλShape, null>;
const $ConfigObject = $.makeType<$ConfigObject>(_.spec, "0fc379b0-06d1-11ed-8e8c-d1d107e77880", _.syntax.literal);

const ConfigObject: $.$expr_PathNode<$.TypeSet<$ConfigObject, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($ConfigObject, $.Cardinality.Many), null, true);

export type $AbstractConfigλShape = $.typeutil.flatten<$ConfigObjectλShape & {
  "session_idle_timeout": $.PropertyDesc<_std.$duration, $.Cardinality.One, false, false, false, true>;
  "session_idle_transaction_timeout": $.PropertyDesc<_std.$duration, $.Cardinality.One, false, false, false, true>;
  "query_execution_timeout": $.PropertyDesc<_std.$duration, $.Cardinality.One, false, false, false, false>;
  "listen_port": $.PropertyDesc<_std.$int16, $.Cardinality.One, false, false, false, true>;
  "listen_addresses": $.PropertyDesc<_std.$str, $.Cardinality.Many, false, false, false, false>;
  "auth": $.LinkDesc<$Auth, $.Cardinality.Many, {}, false, false,  false, false>;
  "allow_dml_in_functions": $.PropertyDesc<_std.$bool, $.Cardinality.AtMostOne, false, false, false, true>;
  "allow_bare_ddl": $.PropertyDesc<$AllowBareDDL, $.Cardinality.AtMostOne, false, false, false, true>;
  "apply_access_policies": $.PropertyDesc<_std.$bool, $.Cardinality.AtMostOne, false, false, false, true>;
  "shared_buffers": $.PropertyDesc<$memory, $.Cardinality.AtMostOne, false, false, false, false>;
  "query_work_mem": $.PropertyDesc<$memory, $.Cardinality.AtMostOne, false, false, false, false>;
  "effective_cache_size": $.PropertyDesc<$memory, $.Cardinality.AtMostOne, false, false, false, false>;
  "effective_io_concurrency": $.PropertyDesc<_std.$int64, $.Cardinality.AtMostOne, false, false, false, false>;
  "default_statistics_target": $.PropertyDesc<_std.$int64, $.Cardinality.AtMostOne, false, false, false, false>;
  "sessobj": $.LinkDesc<$TestSessionConfig, $.Cardinality.Many, {}, false, false,  false, false>;
  "sysobj": $.LinkDesc<$TestInstanceConfig, $.Cardinality.Many, {}, false, false,  false, false>;
  "__internal_testvalue": $.PropertyDesc<_std.$int64, $.Cardinality.AtMostOne, false, false, false, true>;
  "__internal_sess_testvalue": $.PropertyDesc<_std.$int64, $.Cardinality.AtMostOne, false, false, false, true>;
  "__internal_no_const_folding": $.PropertyDesc<_std.$bool, $.Cardinality.AtMostOne, false, false, false, true>;
  "__internal_testmode": $.PropertyDesc<_std.$bool, $.Cardinality.AtMostOne, false, false, false, true>;
  "__internal_restart": $.PropertyDesc<_std.$bool, $.Cardinality.AtMostOne, false, false, false, true>;
  "multiprop": $.PropertyDesc<_std.$str, $.Cardinality.Many, false, false, false, false>;
  "singleprop": $.PropertyDesc<_std.$str, $.Cardinality.AtMostOne, false, false, false, true>;
  "memprop": $.PropertyDesc<$memory, $.Cardinality.AtMostOne, false, false, false, true>;
  "durprop": $.PropertyDesc<_std.$duration, $.Cardinality.AtMostOne, false, false, false, true>;
  "enumprop": $.PropertyDesc<$TestEnum, $.Cardinality.AtMostOne, false, false, false, true>;
  "__pg_max_connections": $.PropertyDesc<_std.$int64, $.Cardinality.AtMostOne, false, false, false, false>;
}>;
type $AbstractConfig = $.ObjectType<"cfg::AbstractConfig", $AbstractConfigλShape, null>;
const $AbstractConfig = $.makeType<$AbstractConfig>(_.spec, "10086a02-06d1-11ed-9570-afe3e24d5e71", _.syntax.literal);

const AbstractConfig: $.$expr_PathNode<$.TypeSet<$AbstractConfig, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($AbstractConfig, $.Cardinality.Many), null, true);

export type $AuthλShape = $.typeutil.flatten<$ConfigObjectλShape & {
  "priority": $.PropertyDesc<_std.$int64, $.Cardinality.One, true, false, true, false>;
  "user": $.PropertyDesc<_std.$str, $.Cardinality.Many, false, false, true, true>;
  "method": $.LinkDesc<$AuthMethod, $.Cardinality.AtMostOne, {}, true, false,  true, false>;
  "comment": $.PropertyDesc<_std.$str, $.Cardinality.AtMostOne, false, false, true, false>;
  "<auth[is cfg::AbstractConfig]": $.LinkDesc<$AbstractConfig, $.Cardinality.Many, {}, false, false,  false, false>;
  "<auth[is cfg::Config]": $.LinkDesc<$Config, $.Cardinality.Many, {}, false, false,  false, false>;
  "<auth[is cfg::InstanceConfig]": $.LinkDesc<$InstanceConfig, $.Cardinality.Many, {}, false, false,  false, false>;
  "<auth[is cfg::DatabaseConfig]": $.LinkDesc<$DatabaseConfig, $.Cardinality.Many, {}, false, false,  false, false>;
  "<auth": $.LinkDesc<$.ObjectType, $.Cardinality.Many, {}, false, false,  false, false>;
}>;
type $Auth = $.ObjectType<"cfg::Auth", $AuthλShape, null>;
const $Auth = $.makeType<$Auth>(_.spec, "0ff478bc-06d1-11ed-8601-457536b2d1a6", _.syntax.literal);

const Auth: $.$expr_PathNode<$.TypeSet<$Auth, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($Auth, $.Cardinality.Many), null, true);

export type $AuthMethodλShape = $.typeutil.flatten<$ConfigObjectλShape & {
  "transports": $.PropertyDesc<$ConnectionTransport, $.Cardinality.Many, false, false, true, false>;
  "<method[is cfg::Auth]": $.LinkDesc<$Auth, $.Cardinality.AtMostOne, {}, true, false,  false, false>;
  "<method": $.LinkDesc<$.ObjectType, $.Cardinality.Many, {}, false, false,  false, false>;
}>;
type $AuthMethod = $.ObjectType<"cfg::AuthMethod", $AuthMethodλShape, null>;
const $AuthMethod = $.makeType<$AuthMethod>(_.spec, "0fcc37bc-06d1-11ed-b8f2-6db3cc7cad33", _.syntax.literal);

const AuthMethod: $.$expr_PathNode<$.TypeSet<$AuthMethod, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($AuthMethod, $.Cardinality.Many), null, true);

export type $BaseλShape = $.typeutil.flatten<_std.$Object_0a07d6d806d111ed94d94589f54dfbc0λShape & {
  "name": $.PropertyDesc<_std.$str, $.Cardinality.One, false, false, false, false>;
  "<obj[is cfg::TestInstanceConfig]": $.LinkDesc<$TestInstanceConfig, $.Cardinality.Many, {}, false, false,  false, false>;
  "<obj": $.LinkDesc<$.ObjectType, $.Cardinality.Many, {}, false, false,  false, false>;
}>;
type $Base = $.ObjectType<"cfg::Base", $BaseλShape, null>;
const $Base = $.makeType<$Base>(_.spec, "12191ef4-06d1-11ed-ac90-750e1da87cd0", _.syntax.literal);

const Base: $.$expr_PathNode<$.TypeSet<$Base, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($Base, $.Cardinality.Many), null, true);

export type $ConfigλShape = $.typeutil.flatten<$AbstractConfigλShape & {
}>;
type $Config = $.ObjectType<"cfg::Config", $ConfigλShape, null>;
const $Config = $.makeType<$Config>(_.spec, "102a6648-06d1-11ed-97d2-9b1fe15729b3", _.syntax.literal);

const Config: $.$expr_PathNode<$.TypeSet<$Config, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($Config, $.Cardinality.Many), null, true);

export type $DatabaseConfigλShape = $.typeutil.flatten<$AbstractConfigλShape & {
}>;
type $DatabaseConfig = $.ObjectType<"cfg::DatabaseConfig", $DatabaseConfigλShape, null>;
const $DatabaseConfig = $.makeType<$DatabaseConfig>(_.spec, "10728dba-06d1-11ed-b182-f7938286301d", _.syntax.literal);

const DatabaseConfig: $.$expr_PathNode<$.TypeSet<$DatabaseConfig, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($DatabaseConfig, $.Cardinality.Many), null, true);

export type $InstanceConfigλShape = $.typeutil.flatten<$AbstractConfigλShape & {
}>;
type $InstanceConfig = $.ObjectType<"cfg::InstanceConfig", $InstanceConfigλShape, null>;
const $InstanceConfig = $.makeType<$InstanceConfig>(_.spec, "104e44be-06d1-11ed-a3da-2b612b5319c5", _.syntax.literal);

const InstanceConfig: $.$expr_PathNode<$.TypeSet<$InstanceConfig, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($InstanceConfig, $.Cardinality.Many), null, true);

export type $JWTλShape = $.typeutil.flatten<Omit<$AuthMethodλShape, "transports"> & {
  "transports": $.PropertyDesc<$ConnectionTransport, $.Cardinality.Many, false, false, true, true>;
}>;
type $JWT = $.ObjectType<"cfg::JWT", $JWTλShape, null>;
const $JWT = $.makeType<$JWT>(_.spec, "0fe9a20c-06d1-11ed-b60f-7b06a3f0fe97", _.syntax.literal);

const JWT: $.$expr_PathNode<$.TypeSet<$JWT, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($JWT, $.Cardinality.Many), null, true);

export type $SCRAMλShape = $.typeutil.flatten<Omit<$AuthMethodλShape, "transports"> & {
  "transports": $.PropertyDesc<$ConnectionTransport, $.Cardinality.Many, false, false, true, true>;
}>;
type $SCRAM = $.ObjectType<"cfg::SCRAM", $SCRAMλShape, null>;
const $SCRAM = $.makeType<$SCRAM>(_.spec, "0fdef974-06d1-11ed-a5b7-a155286e2103", _.syntax.literal);

const SCRAM: $.$expr_PathNode<$.TypeSet<$SCRAM, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($SCRAM, $.Cardinality.Many), null, true);

export type $Subclass1λShape = $.typeutil.flatten<$BaseλShape & {
  "sub1": $.PropertyDesc<_std.$str, $.Cardinality.One, false, false, false, false>;
}>;
type $Subclass1 = $.ObjectType<"cfg::Subclass1", $Subclass1λShape, null>;
const $Subclass1 = $.makeType<$Subclass1>(_.spec, "12246e76-06d1-11ed-9d4b-8df604d57412", _.syntax.literal);

const Subclass1: $.$expr_PathNode<$.TypeSet<$Subclass1, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($Subclass1, $.Cardinality.Many), null, true);

export type $Subclass2λShape = $.typeutil.flatten<$BaseλShape & {
  "sub2": $.PropertyDesc<_std.$str, $.Cardinality.One, false, false, false, false>;
}>;
type $Subclass2 = $.ObjectType<"cfg::Subclass2", $Subclass2λShape, null>;
const $Subclass2 = $.makeType<$Subclass2>(_.spec, "1231f9ec-06d1-11ed-8d6f-698734dc55c1", _.syntax.literal);

const Subclass2: $.$expr_PathNode<$.TypeSet<$Subclass2, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($Subclass2, $.Cardinality.Many), null, true);

export type $TestInstanceConfigλShape = $.typeutil.flatten<_std.$Object_0a07d6d806d111ed94d94589f54dfbc0λShape & {
  "name": $.PropertyDesc<_std.$str, $.Cardinality.One, true, false, false, false>;
  "obj": $.LinkDesc<$Base, $.Cardinality.AtMostOne, {}, false, false,  false, false>;
  "<sysobj[is cfg::AbstractConfig]": $.LinkDesc<$AbstractConfig, $.Cardinality.Many, {}, false, false,  false, false>;
  "<sysobj[is cfg::Config]": $.LinkDesc<$Config, $.Cardinality.Many, {}, false, false,  false, false>;
  "<sysobj[is cfg::InstanceConfig]": $.LinkDesc<$InstanceConfig, $.Cardinality.Many, {}, false, false,  false, false>;
  "<sysobj[is cfg::DatabaseConfig]": $.LinkDesc<$DatabaseConfig, $.Cardinality.Many, {}, false, false,  false, false>;
  "<sysobj": $.LinkDesc<$.ObjectType, $.Cardinality.Many, {}, false, false,  false, false>;
}>;
type $TestInstanceConfig = $.ObjectType<"cfg::TestInstanceConfig", $TestInstanceConfigλShape, null>;
const $TestInstanceConfig = $.makeType<$TestInstanceConfig>(_.spec, "1242f486-06d1-11ed-8166-979b67b29280", _.syntax.literal);

const TestInstanceConfig: $.$expr_PathNode<$.TypeSet<$TestInstanceConfig, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($TestInstanceConfig, $.Cardinality.Many), null, true);

export type $TestSessionConfigλShape = $.typeutil.flatten<_std.$Object_0a07d6d806d111ed94d94589f54dfbc0λShape & {
  "name": $.PropertyDesc<_std.$str, $.Cardinality.One, true, false, false, false>;
  "<sessobj[is cfg::AbstractConfig]": $.LinkDesc<$AbstractConfig, $.Cardinality.Many, {}, false, false,  false, false>;
  "<sessobj[is cfg::Config]": $.LinkDesc<$Config, $.Cardinality.Many, {}, false, false,  false, false>;
  "<sessobj[is cfg::InstanceConfig]": $.LinkDesc<$InstanceConfig, $.Cardinality.Many, {}, false, false,  false, false>;
  "<sessobj[is cfg::DatabaseConfig]": $.LinkDesc<$DatabaseConfig, $.Cardinality.Many, {}, false, false,  false, false>;
  "<sessobj": $.LinkDesc<$.ObjectType, $.Cardinality.Many, {}, false, false,  false, false>;
}>;
type $TestSessionConfig = $.ObjectType<"cfg::TestSessionConfig", $TestSessionConfigλShape, null>;
const $TestSessionConfig = $.makeType<$TestSessionConfig>(_.spec, "120c7d70-06d1-11ed-961b-e3766cd9a1e7", _.syntax.literal);

const TestSessionConfig: $.$expr_PathNode<$.TypeSet<$TestSessionConfig, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($TestSessionConfig, $.Cardinality.Many), null, true);

export type $TrustλShape = $.typeutil.flatten<$AuthMethodλShape & {
}>;
type $Trust = $.ObjectType<"cfg::Trust", $TrustλShape, null>;
const $Trust = $.makeType<$Trust>(_.spec, "0fd59cda-06d1-11ed-b291-e927062e9600", _.syntax.literal);

const Trust: $.$expr_PathNode<$.TypeSet<$Trust, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($Trust, $.Cardinality.Many), null, true);

type get_config_jsonλFuncExpr<
  NamedArgs extends {
    "sources"?: $.TypeSet<$.ArrayType<_std.$str>>,
    "max_source"?: _.castMaps.orScalarLiteral<$.TypeSet<_std.$str>>,
  },
> = $.$expr_Function<
  "cfg::get_config_json",
  [],
  _.castMaps.mapLiteralToTypeSet<NamedArgs>,
  $.TypeSet<_std.$json, $.cardinalityUtil.multiplyCardinalities<$.cardinalityUtil.optionalParamCardinality<NamedArgs["sources"]>, $.cardinalityUtil.optionalParamCardinality<NamedArgs["max_source"]>>>
>;
function get_config_json<
  NamedArgs extends {
    "sources"?: $.TypeSet<$.ArrayType<_std.$str>>,
    "max_source"?: _.castMaps.orScalarLiteral<$.TypeSet<_std.$str>>,
  },
>(
  namedArgs: NamedArgs,
): get_config_jsonλFuncExpr<NamedArgs>;
function get_config_json(...args: any[]) {
  const {returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('cfg::get_config_json', args, _.spec, [
    {args: [], namedArgs: {"sources": {typeId: "05f91774-15ea-9001-038e-092c1cad80af", optional: true, setoftype: false, variadic: false}, "max_source": {typeId: "00000000-0000-0000-0000-000000000101", optional: true, setoftype: false, variadic: false}}, returnTypeId: "00000000-0000-0000-0000-00000000010f"},
  ]);
  return _.syntax.$expressionify({
    __kind__: $.ExpressionKind.Function,
    __element__: returnType,
    __cardinality__: cardinality,
    __name__: "cfg::get_config_json",
    __args__: positionalArgs,
    __namedargs__: namedArgs,
  }) as any;
};



export { $AllowBareDDLλEnum, AllowBareDDL, $ConnectionTransportλEnum, ConnectionTransport, $TestEnumλEnum, TestEnum, memory, $ConfigObject, ConfigObject, $AbstractConfig, AbstractConfig, $Auth, Auth, $AuthMethod, AuthMethod, $Base, Base, $Config, Config, $DatabaseConfig, DatabaseConfig, $InstanceConfig, InstanceConfig, $JWT, JWT, $SCRAM, SCRAM, $Subclass1, Subclass1, $Subclass2, Subclass2, $TestInstanceConfig, TestInstanceConfig, $TestSessionConfig, TestSessionConfig, $Trust, Trust };

type __defaultExports = {
  "AllowBareDDL": typeof AllowBareDDL;
  "ConnectionTransport": typeof ConnectionTransport;
  "TestEnum": typeof TestEnum;
  "memory": typeof memory;
  "ConfigObject": typeof ConfigObject;
  "AbstractConfig": typeof AbstractConfig;
  "Auth": typeof Auth;
  "AuthMethod": typeof AuthMethod;
  "Base": typeof Base;
  "Config": typeof Config;
  "DatabaseConfig": typeof DatabaseConfig;
  "InstanceConfig": typeof InstanceConfig;
  "JWT": typeof JWT;
  "SCRAM": typeof SCRAM;
  "Subclass1": typeof Subclass1;
  "Subclass2": typeof Subclass2;
  "TestInstanceConfig": typeof TestInstanceConfig;
  "TestSessionConfig": typeof TestSessionConfig;
  "Trust": typeof Trust;
  "get_config_json": typeof get_config_json
};
const __defaultExports: __defaultExports = {
  "AllowBareDDL": AllowBareDDL,
  "ConnectionTransport": ConnectionTransport,
  "TestEnum": TestEnum,
  "memory": memory,
  "ConfigObject": ConfigObject,
  "AbstractConfig": AbstractConfig,
  "Auth": Auth,
  "AuthMethod": AuthMethod,
  "Base": Base,
  "Config": Config,
  "DatabaseConfig": DatabaseConfig,
  "InstanceConfig": InstanceConfig,
  "JWT": JWT,
  "SCRAM": SCRAM,
  "Subclass1": Subclass1,
  "Subclass2": Subclass2,
  "TestInstanceConfig": TestInstanceConfig,
  "TestSessionConfig": TestSessionConfig,
  "Trust": Trust,
  "get_config_json": get_config_json
};
export default __defaultExports;
