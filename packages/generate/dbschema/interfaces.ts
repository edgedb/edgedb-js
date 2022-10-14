import type * as edgedb from "edgedb";
export namespace std {
  export interface BaseObject {
    "id": string;
  }
  export interface $Object extends BaseObject {}
  export interface FreeObject extends BaseObject {}
  export type JsonEmpty = "ReturnEmpty" | "ReturnTarget" | "Error" | "UseNull" | "DeleteKey";
}
export namespace cfg {
  export interface ConfigObject extends std.BaseObject {}
  export interface AbstractConfig extends ConfigObject {
    "session_idle_timeout": edgedb.Duration;
    "session_idle_transaction_timeout": edgedb.Duration;
    "query_execution_timeout": edgedb.Duration;
    "listen_port": number;
    "listen_addresses": string[];
    "allow_dml_in_functions"?: boolean | null;
    "allow_bare_ddl"?: AllowBareDDL | null;
    "apply_access_policies"?: boolean | null;
    "allow_user_specified_id"?: boolean | null;
    "shared_buffers"?: edgedb.ConfigMemory | null;
    "query_work_mem"?: edgedb.ConfigMemory | null;
    "effective_cache_size"?: edgedb.ConfigMemory | null;
    "effective_io_concurrency"?: number | null;
    "default_statistics_target"?: number | null;
    "auth": Auth[];
  }
  export type AllowBareDDL = "AlwaysAllow" | "NeverAllow";
  export interface Auth extends ConfigObject {
    "priority": number;
    "user": string[];
    "comment"?: string | null;
    "method"?: AuthMethod | null;
  }
  export interface AuthMethod extends ConfigObject {
    "transports": ConnectionTransport[];
  }
  export interface Config extends AbstractConfig {}
  export type ConnectionTransport = "TCP" | "HTTP";
  export interface DatabaseConfig extends AbstractConfig {}
  export interface InstanceConfig extends AbstractConfig {}
  export interface JWT extends AuthMethod {
    "transports": ConnectionTransport[];
  }
  export interface SCRAM extends AuthMethod {
    "transports": ConnectionTransport[];
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
  "stringMultiArr": string[][];
  "stringsArr"?: string[] | null;
  "secret_identity"?: string | null;
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
  "stringsMulti": string[];
  "unnamedTuple"?: [string, number] | null;
  "seqField"?: number | null;
  "jsonField"?: unknown | null;
  "rangeField"?: edgedb.Range<number> | null;
}
export type Genre = "Horror" | "Action" | "RomCom" | "Science Fiction";
export interface Person extends std.$Object {
  "name": string;
}
export interface Hero extends Person {
  "number_of_movies"?: number | null;
  "secret_identity"?: string | null;
  "villains": Villain[];
}
export interface Movie extends std.$Object {
  "genre"?: Genre | null;
  "rating"?: number | null;
  "title": string;
  "release_year": number;
  "characters": Person[];
  "profile"?: Profile | null;
}
export interface MovieShape extends std.$Object {}
export interface Profile extends std.$Object {
  "plot_summary"?: string | null;
  "slug"?: string | null;
  "a"?: string | null;
  "b"?: string | null;
  "c"?: string | null;
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
  "Ł🤞": string;
  "Ł💯"?: A | null;
}
export namespace schema {
  export type AccessKind = "Select" | "UpdateRead" | "UpdateWrite" | "Delete" | "Insert";
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
    "inherited_fields"?: string[] | null;
    "bases": InheritingObject[];
    "ancestors": InheritingObject[];
  }
  export interface AnnotationSubject extends $Object {
    "annotations": Annotation[];
  }
  export interface AccessPolicy extends InheritingObject, AnnotationSubject {
    "access_kinds": AccessKind[];
    "condition"?: string | null;
    "action": AccessPolicyAction;
    "expr"?: string | null;
    "subject": ObjectType;
  }
  export type AccessPolicyAction = "Allow" | "Deny";
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
    "dimensions"?: number[] | null;
    "element_type": Type;
  }
  export interface CallableObject extends AnnotationSubject {
    "return_typemod"?: TypeModifier | null;
    "params": Parameter[];
    "return_type"?: Type | null;
  }
  export type Cardinality = "One" | "Many";
  export interface VolatilitySubject extends $Object {
    "volatility"?: Volatility | null;
  }
  export interface Cast extends AnnotationSubject, VolatilitySubject {
    "allow_assignment"?: boolean | null;
    "allow_implicit"?: boolean | null;
    "from_type"?: Type | null;
    "to_type"?: Type | null;
  }
  export interface ConsistencySubject extends $Object, InheritingObject, AnnotationSubject {
    "constraints": Constraint[];
  }
  export interface Constraint extends CallableObject, InheritingObject {
    "expr"?: string | null;
    "subjectexpr"?: string | null;
    "finalexpr"?: string | null;
    "errmessage"?: string | null;
    "delegated"?: boolean | null;
    "except_expr"?: string | null;
    "subject"?: ConsistencySubject | null;
    "params": Parameter[];
  }
  export interface Delta extends $Object {
    "parents": Delta[];
  }
  export interface Extension extends AnnotationSubject, $Object {
    "package": sys.ExtensionPackage;
  }
  export interface Function extends CallableObject, VolatilitySubject {
    "body"?: string | null;
    "language": string;
    "preserves_optionality"?: boolean | null;
    "used_globals": Global[];
  }
  export interface Global extends AnnotationSubject {
    "required"?: boolean | null;
    "cardinality"?: Cardinality | null;
    "expr"?: string | null;
    "default"?: string | null;
    "target": Type;
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
    "pointers": Pointer[];
    "indexes": Index[];
  }
  export interface Link extends Pointer, Source {
    "on_target_delete"?: TargetDeleteAction | null;
    "on_source_delete"?: SourceDeleteAction | null;
    "target"?: ObjectType | null;
    "properties": Property[];
  }
  export interface Migration extends AnnotationSubject, $Object {
    "script": string;
    "message"?: string | null;
    "parents": Migration[];
  }
  export interface Module extends $Object, AnnotationSubject {}
  export interface ObjectType extends InheritingObject, ConsistencySubject, AnnotationSubject, Type, Source {
    "compound_type": boolean;
    "is_compound_type": boolean;
    "union_of": ObjectType[];
    "intersection_of": ObjectType[];
    "links": Link[];
    "properties": Property[];
    "access_policies": AccessPolicy[];
  }
  export interface Operator extends CallableObject, VolatilitySubject {
    "operator_kind"?: OperatorKind | null;
    "is_abstract"?: boolean | null;
    "abstract"?: boolean | null;
  }
  export type OperatorKind = "Infix" | "Postfix" | "Prefix" | "Ternary";
  export interface Parameter extends $Object {
    "typemod": TypeModifier;
    "kind": ParameterKind;
    "num": number;
    "default"?: string | null;
    "type": Type;
  }
  export type ParameterKind = "VariadicParam" | "NamedOnlyParam" | "PositionalParam";
  export interface Property extends Pointer {}
  export interface PseudoType extends InheritingObject, Type {}
  export interface Range extends CollectionType {
    "element_type": Type;
  }
  export interface ScalarType extends InheritingObject, ConsistencySubject, AnnotationSubject, PrimitiveType {
    "default"?: string | null;
    "enum_values"?: string[] | null;
  }
  export type SourceDeleteAction = "DeleteTarget" | "Allow" | "DeleteTargetIfOrphan";
  export type TargetDeleteAction = "Restrict" | "DeleteSource" | "Allow" | "DeferredRestrict";
  export interface Tuple extends CollectionType {
    "named": boolean;
    "element_types": TupleElement[];
  }
  export interface TupleElement extends std.BaseObject {
    "name"?: string | null;
    "type": Type;
  }
  export type TypeModifier = "SetOfType" | "OptionalType" | "SingletonType";
  export type Volatility = "Immutable" | "Stable" | "Volatile";
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
    "superuser": boolean;
    "password"?: string | null;
    "name": string;
    "is_superuser": boolean;
    "member_of": Role[];
  }
  export type TransactionIsolation = "RepeatableRead" | "Serializable";
  export type VersionStage = "dev" | "alpha" | "beta" | "rc" | "final";
}
export interface types {
  "std": {
    "BaseObject": std.BaseObject;
    "Object": std.$Object;
    "FreeObject": std.FreeObject;
    "JsonEmpty": std.JsonEmpty;
  };
  "cfg": {
    "ConfigObject": cfg.ConfigObject;
    "AbstractConfig": cfg.AbstractConfig;
    "AllowBareDDL": cfg.AllowBareDDL;
    "Auth": cfg.Auth;
    "AuthMethod": cfg.AuthMethod;
    "Config": cfg.Config;
    "ConnectionTransport": cfg.ConnectionTransport;
    "DatabaseConfig": cfg.DatabaseConfig;
    "InstanceConfig": cfg.InstanceConfig;
    "JWT": cfg.JWT;
    "SCRAM": cfg.SCRAM;
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
  "sys": {
    "SystemObject": sys.SystemObject;
    "Database": sys.Database;
    "ExtensionPackage": sys.ExtensionPackage;
    "Role": sys.Role;
    "TransactionIsolation": sys.TransactionIsolation;
    "VersionStage": sys.VersionStage;
  };
}


export namespace helper {
  export type propertyKeys<T> = {
    [k in keyof T]: NonNullable<T[k]> extends object ? never : k;
  }[keyof T];

  export type linkKeys<T> = {
    [k in keyof T]: NonNullable<T[k]> extends object ? k : never;
  }[keyof T];

  export type Props<T> = Pick<T, propertyKeys<T>>;
  export type Links<T> = Pick<T, linkKeys<T>>;
}
