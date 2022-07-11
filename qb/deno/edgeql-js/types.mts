import type * as edgedb from "edgedb";
export namespace std {
  export interface BaseObject {
    "id": string;
    "__type__": schema.ObjectType;
  }
  export interface $Object extends BaseObject {}
  export interface FreeObject extends BaseObject {}
}
export namespace schema {
  export enum AccessKind {
    Select = "Select",
    UpdateRead = "UpdateRead",
    UpdateWrite = "UpdateWrite",
    Delete = "Delete",
    Insert = "Insert",
  }
  export interface $Object extends std.BaseObject {
    "name": string;
    "internal": boolean;
    "builtin": boolean;
    "computed_fields"?: string[] | null;
  }
  export interface SubclassableObject extends $Object {
    "abstract"?: boolean | null;
    "is_abstract"?: boolean | null;
    "final": boolean;
    "is_final": boolean;
  }
  export interface InheritingObject extends SubclassableObject {
    "bases": InheritingObject[];
    "ancestors": InheritingObject[];
    "inherited_fields"?: string[] | null;
  }
  export interface AnnotationSubject extends $Object {
    "annotations": Annotation[];
  }
  export interface AccessPolicy extends InheritingObject, AnnotationSubject {
    "subject": ObjectType;
    "access_kinds": AccessKind[];
    "condition"?: string | null;
    "action": AccessPolicyAction;
    "expr"?: string | null;
  }
  export enum AccessPolicyAction {
    Allow = "Allow",
    Deny = "Deny",
  }
  export interface Alias extends AnnotationSubject {
    "expr": string;
    "type": Type;
  }
  export interface Annotation extends InheritingObject, AnnotationSubject {
    "inheritable"?: boolean | null;
  }
  export interface Type extends SubclassableObject, AnnotationSubject {
    "expr"?: string | null;
    "from_alias"?: boolean | null;
    "is_from_alias"?: boolean | null;
  }
  export interface PrimitiveType extends Type {}
  export interface CollectionType extends PrimitiveType {}
  export interface Array extends CollectionType {
    "element_type": Type;
    "dimensions"?: number[] | null;
  }
  export interface CallableObject extends AnnotationSubject {
    "params": Parameter[];
    "return_type"?: Type | null;
    "return_typemod"?: TypeModifier | null;
  }
  export enum Cardinality {
    One = "One",
    Many = "Many",
  }
  export interface VolatilitySubject extends $Object {
    "volatility"?: Volatility | null;
  }
  export interface Cast extends AnnotationSubject, VolatilitySubject {
    "from_type"?: Type | null;
    "to_type"?: Type | null;
    "allow_implicit"?: boolean | null;
    "allow_assignment"?: boolean | null;
  }
  export interface ConsistencySubject extends $Object, InheritingObject, AnnotationSubject {
    "constraints": Constraint[];
  }
  export interface Constraint extends CallableObject, InheritingObject {
    "params": Parameter[];
    "expr"?: string | null;
    "subjectexpr"?: string | null;
    "finalexpr"?: string | null;
    "errmessage"?: string | null;
    "delegated"?: boolean | null;
    "except_expr"?: string | null;
    "subject"?: ConsistencySubject | null;
  }
  export interface Delta extends $Object {
    "parents": Delta[];
  }
  export interface Extension extends AnnotationSubject, $Object {
    "package": sys.ExtensionPackage;
  }
  export interface Function extends CallableObject, VolatilitySubject {
    "preserves_optionality"?: boolean | null;
    "body"?: string | null;
    "language": string;
    "used_globals": Global[];
  }
  export interface Global extends AnnotationSubject {
    "target": Type;
    "required"?: boolean | null;
    "cardinality"?: Cardinality | null;
    "expr"?: string | null;
    "default"?: string | null;
  }
  export interface Index extends InheritingObject, AnnotationSubject {
    "expr"?: string | null;
    "except_expr"?: string | null;
  }
  export interface Pointer extends InheritingObject, ConsistencySubject, AnnotationSubject {
    "cardinality"?: Cardinality | null;
    "required"?: boolean | null;
    "readonly"?: boolean | null;
    "default"?: string | null;
    "expr"?: string | null;
    "source"?: Source | null;
    "target"?: Type | null;
  }
  export interface Source extends $Object {
    "indexes": Index[];
    "pointers": Pointer[];
  }
  export interface Link extends Pointer, Source {
    "target"?: ObjectType | null;
    "properties": Property[];
    "on_target_delete"?: TargetDeleteAction | null;
    "on_source_delete"?: SourceDeleteAction | null;
  }
  export interface Migration extends AnnotationSubject, $Object {
    "parents": Migration[];
    "script": string;
    "message"?: string | null;
  }
  export interface Module extends $Object, AnnotationSubject {}
  export interface ObjectType extends InheritingObject, ConsistencySubject, AnnotationSubject, Type, Source {
    "union_of": ObjectType[];
    "intersection_of": ObjectType[];
    "access_policies": AccessPolicy[];
    "compound_type": boolean;
    "is_compound_type": boolean;
    "links": Link[];
    "properties": Property[];
  }
  export interface Operator extends CallableObject, VolatilitySubject {
    "operator_kind"?: OperatorKind | null;
    "abstract"?: boolean | null;
    "is_abstract"?: boolean | null;
  }
  export enum OperatorKind {
    Infix = "Infix",
    Postfix = "Postfix",
    Prefix = "Prefix",
    Ternary = "Ternary",
  }
  export interface Parameter extends $Object {
    "type": Type;
    "typemod": TypeModifier;
    "kind": ParameterKind;
    "num": number;
    "default"?: string | null;
  }
  export enum ParameterKind {
    VariadicParam = "VariadicParam",
    NamedOnlyParam = "NamedOnlyParam",
    PositionalParam = "PositionalParam",
  }
  export interface Property extends Pointer {}
  export interface PseudoType extends InheritingObject, Type {}
  export interface Range extends CollectionType {
    "element_type": Type;
  }
  export interface ScalarType extends InheritingObject, ConsistencySubject, AnnotationSubject, PrimitiveType {
    "default"?: string | null;
    "enum_values"?: string[] | null;
  }
  export enum SourceDeleteAction {
    DeleteTarget = "DeleteTarget",
    Allow = "Allow",
    DeleteTargetIfOrphan = "DeleteTargetIfOrphan",
  }
  export enum TargetDeleteAction {
    Restrict = "Restrict",
    DeleteSource = "DeleteSource",
    Allow = "Allow",
    DeferredRestrict = "DeferredRestrict",
  }
  export interface Tuple extends CollectionType {
    "named": boolean;
    "element_types": TupleElement[];
  }
  export interface TupleElement extends std.BaseObject {
    "type": Type;
    "name"?: string | null;
  }
  export enum TypeModifier {
    SetOfType = "SetOfType",
    OptionalType = "OptionalType",
    SingletonType = "SingletonType",
  }
  export enum Volatility {
    Immutable = "Immutable",
    Stable = "Stable",
    Volatile = "Volatile",
  }
}
export namespace cfg {
  export interface ConfigObject extends std.BaseObject {}
  export interface AbstractConfig extends ConfigObject {
    "session_idle_timeout": edgedb.Duration;
    "session_idle_transaction_timeout": edgedb.Duration;
    "query_execution_timeout": edgedb.Duration;
    "listen_port": number;
    "listen_addresses": string[];
    "auth": Auth[];
    "allow_dml_in_functions"?: boolean | null;
    "allow_bare_ddl"?: AllowBareDDL | null;
    "apply_access_policies"?: boolean | null;
    "shared_buffers"?: edgedb.ConfigMemory | null;
    "query_work_mem"?: edgedb.ConfigMemory | null;
    "effective_cache_size"?: edgedb.ConfigMemory | null;
    "effective_io_concurrency"?: number | null;
    "default_statistics_target"?: number | null;
    "sessobj": TestSessionConfig[];
    "sysobj": TestInstanceConfig[];
    "__internal_testvalue"?: number | null;
    "__internal_sess_testvalue"?: number | null;
    "__internal_no_const_folding"?: boolean | null;
    "__internal_testmode"?: boolean | null;
    "__internal_restart"?: boolean | null;
    "multiprop": string[];
    "singleprop"?: string | null;
    "memprop"?: edgedb.ConfigMemory | null;
    "durprop"?: edgedb.Duration | null;
    "enumprop"?: TestEnum | null;
    "__pg_max_connections"?: number | null;
  }
  export enum AllowBareDDL {
    AlwaysAllow = "AlwaysAllow",
    NeverAllow = "NeverAllow",
  }
  export interface Auth extends ConfigObject {
    "priority": number;
    "user": string[];
    "method"?: AuthMethod | null;
    "comment"?: string | null;
  }
  export interface AuthMethod extends ConfigObject {
    "transports": ConnectionTransport[];
  }
  export interface Base extends std.$Object {
    "name": string;
  }
  export interface Config extends AbstractConfig {}
  export enum ConnectionTransport {
    TCP = "TCP",
    HTTP = "HTTP",
  }
  export interface DatabaseConfig extends AbstractConfig {}
  export interface InstanceConfig extends AbstractConfig {}
  export interface JWT extends AuthMethod {
    "transports": ConnectionTransport[];
  }
  export interface SCRAM extends AuthMethod {
    "transports": ConnectionTransport[];
  }
  export interface Subclass1 extends Base {
    "sub1": string;
  }
  export interface Subclass2 extends Base {
    "sub2": string;
  }
  export enum TestEnum {
    One = "One",
    Two = "Two",
    Three = "Three",
  }
  export interface TestInstanceConfig extends std.$Object {
    "name": string;
    "obj"?: Base | null;
  }
  export interface TestSessionConfig extends std.$Object {
    "name": string;
  }
  export interface Trust extends AuthMethod {}
}
export interface A extends std.$Object {
  "s p A m 🤞": $S0x20p0x20a0x20M;
}
export interface User extends std.$Object {
  "username": string;
  "favourite_movies": Movie[];
}
export interface AdminUser extends User {
  "username": string;
}
export interface HasName extends std.$Object {
  "name"?: string | null;
}
export interface HasAge extends std.$Object {
  "age"?: number | null;
}
export interface Bag extends HasName, HasAge {
  "enumArr"?: Genre[] | null;
  "bigintField"?: bigint | null;
  "boolField"?: boolean | null;
  "datetimeField"?: Date | null;
  "decimalField"?: unknown | null;
  "durationField"?: edgedb.Duration | null;
  "float32Field"?: number | null;
  "float64Field"?: number | null;
  "genre"?: Genre | null;
  "int16Field"?: number | null;
  "int32Field"?: number | null;
  "int64Field"?: number | null;
  "localDateField"?: edgedb.LocalDate | null;
  "localDateTimeField"?: edgedb.LocalDateTime | null;
  "localTimeField"?: edgedb.LocalTime | null;
  "namedTuple"?: {x: string, y: number} | null;
  "secret_identity"?: string | null;
  "stringMultiArr": string[][];
  "stringsArr"?: string[] | null;
  "stringsMulti": string[];
  "unnamedTuple"?: [string, number] | null;
  "seqField"?: number | null;
  "jsonField"?: string | null;
  "rangeField"?: edgedb.Range<number> | null;
}
export enum Genre {
  Horror = "Horror",
  Action = "Action",
  RomCom = "RomCom",
}
export interface Person extends std.$Object {
  "name": string;
}
export interface Hero extends Person {
  "number_of_movies"?: number | null;
  "secret_identity"?: string | null;
  "villains": Villain[];
}
export interface Movie extends std.$Object {
  "characters": Person[];
  "profile"?: Profile | null;
  "genre"?: Genre | null;
  "rating"?: number | null;
  "release_year": number;
  "title": string;
}
export interface MovieShape extends std.$Object {}
export interface Profile extends std.$Object {
  "plot_summary"?: string | null;
  "slug"?: string | null;
}
export interface $S0x20p0x20a0x20M extends std.$Object {
  "🚀": number;
  "c100": number;
}
export interface Simple extends HasName, HasAge {}
export interface Villain extends Person {
  "nemesis"?: Hero | null;
}
export interface $0x141ukasz extends std.$Object {
  "Ł💯"?: A | null;
  "Ł🤞": string;
}
export namespace sys {
  export interface SystemObject extends schema.AnnotationSubject {}
  export interface Database extends SystemObject, schema.AnnotationSubject {
    "name": string;
  }
  export interface ExtensionPackage extends SystemObject, schema.AnnotationSubject {
    "script": string;
    "version": {major: number, minor: number, stage: VersionStage, stage_no: number, local: string[]};
  }
  export interface Role extends SystemObject, schema.InheritingObject, schema.AnnotationSubject {
    "name": string;
    "superuser": boolean;
    "is_superuser": boolean;
    "password"?: string | null;
    "member_of": Role[];
  }
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
}
export interface types {
  "std": {
    "BaseObject": std.BaseObject;
    "Object": std.$Object;
    "FreeObject": std.FreeObject;
  };
  "schema": {
    "AccessKind": schema.AccessKind;
    "Object": schema.$Object;
    "SubclassableObject": schema.SubclassableObject;
    "InheritingObject": schema.InheritingObject;
    "AnnotationSubject": schema.AnnotationSubject;
    "AccessPolicy": schema.AccessPolicy;
    "AccessPolicyAction": schema.AccessPolicyAction;
    "Alias": schema.Alias;
    "Annotation": schema.Annotation;
    "Type": schema.Type;
    "PrimitiveType": schema.PrimitiveType;
    "CollectionType": schema.CollectionType;
    "Array": schema.Array;
    "CallableObject": schema.CallableObject;
    "Cardinality": schema.Cardinality;
    "VolatilitySubject": schema.VolatilitySubject;
    "Cast": schema.Cast;
    "ConsistencySubject": schema.ConsistencySubject;
    "Constraint": schema.Constraint;
    "Delta": schema.Delta;
    "Extension": schema.Extension;
    "Function": schema.Function;
    "Global": schema.Global;
    "Index": schema.Index;
    "Pointer": schema.Pointer;
    "Source": schema.Source;
    "Link": schema.Link;
    "Migration": schema.Migration;
    "Module": schema.Module;
    "ObjectType": schema.ObjectType;
    "Operator": schema.Operator;
    "OperatorKind": schema.OperatorKind;
    "Parameter": schema.Parameter;
    "ParameterKind": schema.ParameterKind;
    "Property": schema.Property;
    "PseudoType": schema.PseudoType;
    "Range": schema.Range;
    "ScalarType": schema.ScalarType;
    "SourceDeleteAction": schema.SourceDeleteAction;
    "TargetDeleteAction": schema.TargetDeleteAction;
    "Tuple": schema.Tuple;
    "TupleElement": schema.TupleElement;
    "TypeModifier": schema.TypeModifier;
    "Volatility": schema.Volatility;
  };
  "cfg": {
    "ConfigObject": cfg.ConfigObject;
    "AbstractConfig": cfg.AbstractConfig;
    "AllowBareDDL": cfg.AllowBareDDL;
    "Auth": cfg.Auth;
    "AuthMethod": cfg.AuthMethod;
    "Base": cfg.Base;
    "Config": cfg.Config;
    "ConnectionTransport": cfg.ConnectionTransport;
    "DatabaseConfig": cfg.DatabaseConfig;
    "InstanceConfig": cfg.InstanceConfig;
    "JWT": cfg.JWT;
    "SCRAM": cfg.SCRAM;
    "Subclass1": cfg.Subclass1;
    "Subclass2": cfg.Subclass2;
    "TestEnum": cfg.TestEnum;
    "TestInstanceConfig": cfg.TestInstanceConfig;
    "TestSessionConfig": cfg.TestSessionConfig;
    "Trust": cfg.Trust;
  };
  "default": {
    "A": A;
    "User": User;
    "AdminUser": AdminUser;
    "HasName": HasName;
    "HasAge": HasAge;
    "Bag": Bag;
    "Genre": Genre;
    "Person": Person;
    "Hero": Hero;
    "Movie": Movie;
    "MovieShape": MovieShape;
    "Profile": Profile;
    "S p a M": $S0x20p0x20a0x20M;
    "Simple": Simple;
    "Villain": Villain;
    "Łukasz": $0x141ukasz;
  };
  "sys": {
    "SystemObject": sys.SystemObject;
    "Database": sys.Database;
    "ExtensionPackage": sys.ExtensionPackage;
    "Role": sys.Role;
    "TransactionIsolation": sys.TransactionIsolation;
    "VersionStage": sys.VersionStage;
  };
}
