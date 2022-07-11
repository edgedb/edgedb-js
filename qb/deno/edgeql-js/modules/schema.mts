import { $ } from "edgedb";
import * as _ from "../imports.mjs";
import type * as _std from "./std.mjs";
import type * as _sys from "./sys.mjs";
import type * as _cfg from "./cfg.mjs";
import type * as _default from "./default.mjs";
enum $AccessKindλEnum {
  Select = "Select",
  UpdateRead = "UpdateRead",
  UpdateWrite = "UpdateWrite",
  Delete = "Delete",
  Insert = "Insert",
}
export type $AccessKind = {
  Select: $.$expr_Literal<$AccessKind>;
  UpdateRead: $.$expr_Literal<$AccessKind>;
  UpdateWrite: $.$expr_Literal<$AccessKind>;
  Delete: $.$expr_Literal<$AccessKind>;
  Insert: $.$expr_Literal<$AccessKind>;
} & $.EnumType<"schema::AccessKind", `${$AccessKindλEnum}`>;
const AccessKind: $AccessKind = $.makeType<$AccessKind>(_.spec, "0a697794-06d1-11ed-a93a-45433e2f122d", _.syntax.literal);

enum $AccessPolicyActionλEnum {
  Allow = "Allow",
  Deny = "Deny",
}
export type $AccessPolicyAction = {
  Allow: $.$expr_Literal<$AccessPolicyAction>;
  Deny: $.$expr_Literal<$AccessPolicyAction>;
} & $.EnumType<"schema::AccessPolicyAction", `${$AccessPolicyActionλEnum}`>;
const AccessPolicyAction: $AccessPolicyAction = $.makeType<$AccessPolicyAction>(_.spec, "0a68eb12-06d1-11ed-bb98-f3c373378e7c", _.syntax.literal);

enum $CardinalityλEnum {
  One = "One",
  Many = "Many",
}
export type $Cardinality = {
  One: $.$expr_Literal<$Cardinality>;
  Many: $.$expr_Literal<$Cardinality>;
} & $.EnumType<"schema::Cardinality", `${$CardinalityλEnum}`>;
const Cardinality: $Cardinality = $.makeType<$Cardinality>(_.spec, "0a64f5d4-06d1-11ed-9945-275edfa8138e", _.syntax.literal);

enum $OperatorKindλEnum {
  Infix = "Infix",
  Postfix = "Postfix",
  Prefix = "Prefix",
  Ternary = "Ternary",
}
export type $OperatorKind = {
  Infix: $.$expr_Literal<$OperatorKind>;
  Postfix: $.$expr_Literal<$OperatorKind>;
  Prefix: $.$expr_Literal<$OperatorKind>;
  Ternary: $.$expr_Literal<$OperatorKind>;
} & $.EnumType<"schema::OperatorKind", `${$OperatorKindλEnum}`>;
const OperatorKind: $OperatorKind = $.makeType<$OperatorKind>(_.spec, "0a669fce-06d1-11ed-99b0-cfb093a7d259", _.syntax.literal);

enum $ParameterKindλEnum {
  VariadicParam = "VariadicParam",
  NamedOnlyParam = "NamedOnlyParam",
  PositionalParam = "PositionalParam",
}
export type $ParameterKind = {
  VariadicParam: $.$expr_Literal<$ParameterKind>;
  NamedOnlyParam: $.$expr_Literal<$ParameterKind>;
  PositionalParam: $.$expr_Literal<$ParameterKind>;
} & $.EnumType<"schema::ParameterKind", `${$ParameterKindλEnum}`>;
const ParameterKind: $ParameterKind = $.makeType<$ParameterKind>(_.spec, "0a67d0b0-06d1-11ed-9245-3bd2eda0acf3", _.syntax.literal);

enum $SourceDeleteActionλEnum {
  DeleteTarget = "DeleteTarget",
  Allow = "Allow",
  DeleteTargetIfOrphan = "DeleteTargetIfOrphan",
}
export type $SourceDeleteAction = {
  DeleteTarget: $.$expr_Literal<$SourceDeleteAction>;
  Allow: $.$expr_Literal<$SourceDeleteAction>;
  DeleteTargetIfOrphan: $.$expr_Literal<$SourceDeleteAction>;
} & $.EnumType<"schema::SourceDeleteAction", `${$SourceDeleteActionλEnum}`>;
const SourceDeleteAction: $SourceDeleteAction = $.makeType<$SourceDeleteAction>(_.spec, "0a66100e-06d1-11ed-b79a-a3bb01ccd903", _.syntax.literal);

enum $TargetDeleteActionλEnum {
  Restrict = "Restrict",
  DeleteSource = "DeleteSource",
  Allow = "Allow",
  DeferredRestrict = "DeferredRestrict",
}
export type $TargetDeleteAction = {
  Restrict: $.$expr_Literal<$TargetDeleteAction>;
  DeleteSource: $.$expr_Literal<$TargetDeleteAction>;
  Allow: $.$expr_Literal<$TargetDeleteAction>;
  DeferredRestrict: $.$expr_Literal<$TargetDeleteAction>;
} & $.EnumType<"schema::TargetDeleteAction", `${$TargetDeleteActionλEnum}`>;
const TargetDeleteAction: $TargetDeleteAction = $.makeType<$TargetDeleteAction>(_.spec, "0a65858a-06d1-11ed-8dfb-477316d71dc1", _.syntax.literal);

enum $TypeModifierλEnum {
  SetOfType = "SetOfType",
  OptionalType = "OptionalType",
  SingletonType = "SingletonType",
}
export type $TypeModifier = {
  SetOfType: $.$expr_Literal<$TypeModifier>;
  OptionalType: $.$expr_Literal<$TypeModifier>;
  SingletonType: $.$expr_Literal<$TypeModifier>;
} & $.EnumType<"schema::TypeModifier", `${$TypeModifierλEnum}`>;
const TypeModifier: $TypeModifier = $.makeType<$TypeModifier>(_.spec, "0a6859ea-06d1-11ed-a2e6-25f89dbf18ce", _.syntax.literal);

enum $VolatilityλEnum {
  Immutable = "Immutable",
  Stable = "Stable",
  Volatile = "Volatile",
}
export type $Volatility = {
  Immutable: $.$expr_Literal<$Volatility>;
  Stable: $.$expr_Literal<$Volatility>;
  Volatile: $.$expr_Literal<$Volatility>;
} & $.EnumType<"schema::Volatility", `${$VolatilityλEnum}`>;
const Volatility: $Volatility = $.makeType<$Volatility>(_.spec, "0a6734a2-06d1-11ed-9db4-2fedb7e4fb72", _.syntax.literal);

export type $Object_0a6a291406d111eda0df6137d5eed8c1λShape = $.typeutil.flatten<_std.$BaseObjectλShape & {
  "name": $.PropertyDesc<_std.$str, $.Cardinality.One, false, false, false, false>;
  "internal": $.PropertyDesc<_std.$bool, $.Cardinality.One, false, false, false, true>;
  "builtin": $.PropertyDesc<_std.$bool, $.Cardinality.One, false, false, false, true>;
  "computed_fields": $.PropertyDesc<$.ArrayType<_std.$str>, $.Cardinality.AtMostOne, false, false, false, false>;
}>;
type $Object_0a6a291406d111eda0df6137d5eed8c1 = $.ObjectType<"schema::Object", $Object_0a6a291406d111eda0df6137d5eed8c1λShape, null>;
const $Object_0a6a291406d111eda0df6137d5eed8c1 = $.makeType<$Object_0a6a291406d111eda0df6137d5eed8c1>(_.spec, "0a6a2914-06d1-11ed-a0df-6137d5eed8c1", _.syntax.literal);

const Object_0a6a291406d111eda0df6137d5eed8c1: $.$expr_PathNode<$.TypeSet<$Object_0a6a291406d111eda0df6137d5eed8c1, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($Object_0a6a291406d111eda0df6137d5eed8c1, $.Cardinality.Many), null, true);

export type $SubclassableObjectλShape = $.typeutil.flatten<$Object_0a6a291406d111eda0df6137d5eed8c1λShape & {
  "abstract": $.PropertyDesc<_std.$bool, $.Cardinality.AtMostOne, false, false, false, true>;
  "is_abstract": $.PropertyDesc<_std.$bool, $.Cardinality.AtMostOne, false, true, false, true>;
  "final": $.PropertyDesc<_std.$bool, $.Cardinality.One, false, true, false, false>;
  "is_final": $.PropertyDesc<_std.$bool, $.Cardinality.One, false, true, false, false>;
}>;
type $SubclassableObject = $.ObjectType<"schema::SubclassableObject", $SubclassableObjectλShape, null>;
const $SubclassableObject = $.makeType<$SubclassableObject>(_.spec, "0a72c40c-06d1-11ed-9360-1d6d5f054bf7", _.syntax.literal);

const SubclassableObject: $.$expr_PathNode<$.TypeSet<$SubclassableObject, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($SubclassableObject, $.Cardinality.Many), null, true);

export type $InheritingObjectλShape = $.typeutil.flatten<$SubclassableObjectλShape & {
  "bases": $.LinkDesc<$InheritingObject, $.Cardinality.Many, {
    "@index": $.PropertyDesc<_std.$int64, $.Cardinality.AtMostOne>;
  }, false, false, false, false>;
  "ancestors": $.LinkDesc<$InheritingObject, $.Cardinality.Many, {
    "@index": $.PropertyDesc<_std.$int64, $.Cardinality.AtMostOne>;
  }, false, false, false, false>;
  "inherited_fields": $.PropertyDesc<$.ArrayType<_std.$str>, $.Cardinality.AtMostOne, false, false, false, false>;
  "<bases[is schema::InheritingObject]": $.LinkDesc<$InheritingObject, $.Cardinality.Many, {}, false, false,  false, false>;
  "<ancestors[is schema::InheritingObject]": $.LinkDesc<$InheritingObject, $.Cardinality.Many, {}, false, false,  false, false>;
  "<ancestors[is schema::Constraint]": $.LinkDesc<$Constraint, $.Cardinality.Many, {}, false, false,  false, false>;
  "<bases[is schema::Constraint]": $.LinkDesc<$Constraint, $.Cardinality.Many, {}, false, false,  false, false>;
  "<ancestors[is schema::Index]": $.LinkDesc<$Index, $.Cardinality.Many, {}, false, false,  false, false>;
  "<bases[is schema::Index]": $.LinkDesc<$Index, $.Cardinality.Many, {}, false, false,  false, false>;
  "<ancestors[is schema::Pointer]": $.LinkDesc<$Pointer, $.Cardinality.Many, {}, false, false,  false, false>;
  "<bases[is schema::Pointer]": $.LinkDesc<$Pointer, $.Cardinality.Many, {}, false, false,  false, false>;
  "<bases[is schema::Property]": $.LinkDesc<$Property, $.Cardinality.Many, {}, false, false,  false, false>;
  "<ancestors[is schema::Property]": $.LinkDesc<$Property, $.Cardinality.Many, {}, false, false,  false, false>;
  "<bases[is schema::Link]": $.LinkDesc<$Link, $.Cardinality.Many, {}, false, false,  false, false>;
  "<ancestors[is schema::Link]": $.LinkDesc<$Link, $.Cardinality.Many, {}, false, false,  false, false>;
  "<ancestors[is schema::AccessPolicy]": $.LinkDesc<$AccessPolicy, $.Cardinality.Many, {}, false, false,  false, false>;
  "<bases[is schema::AccessPolicy]": $.LinkDesc<$AccessPolicy, $.Cardinality.Many, {}, false, false,  false, false>;
  "<ancestors[is schema::ObjectType]": $.LinkDesc<$ObjectType, $.Cardinality.Many, {}, false, false,  false, false>;
  "<bases[is schema::ObjectType]": $.LinkDesc<$ObjectType, $.Cardinality.Many, {}, false, false,  false, false>;
  "<ancestors[is schema::ScalarType]": $.LinkDesc<$ScalarType, $.Cardinality.Many, {}, false, false,  false, false>;
  "<bases[is schema::ScalarType]": $.LinkDesc<$ScalarType, $.Cardinality.Many, {}, false, false,  false, false>;
  "<ancestors": $.LinkDesc<$.ObjectType, $.Cardinality.Many, {}, false, false,  false, false>;
  "<bases": $.LinkDesc<$.ObjectType, $.Cardinality.Many, {}, false, false,  false, false>;
}>;
type $InheritingObject = $.ObjectType<"schema::InheritingObject", $InheritingObjectλShape, null>;
const $InheritingObject = $.makeType<$InheritingObject>(_.spec, "0b3d9330-06d1-11ed-b33e-79ba184070ea", _.syntax.literal);

const InheritingObject: $.$expr_PathNode<$.TypeSet<$InheritingObject, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($InheritingObject, $.Cardinality.Many), null, true);

export type $AnnotationSubjectλShape = $.typeutil.flatten<$Object_0a6a291406d111eda0df6137d5eed8c1λShape & {
  "annotations": $.LinkDesc<$Annotation, $.Cardinality.Many, {
    "@owned": $.PropertyDesc<_std.$bool, $.Cardinality.AtMostOne>;
    "@is_owned": $.PropertyDesc<_std.$bool, $.Cardinality.AtMostOne>;
    "@value": $.PropertyDesc<_std.$str, $.Cardinality.AtMostOne>;
  }, false, false, false, false>;
}>;
type $AnnotationSubject = $.ObjectType<"schema::AnnotationSubject", $AnnotationSubjectλShape, null>;
const $AnnotationSubject = $.makeType<$AnnotationSubject>(_.spec, "0b1f6e8c-06d1-11ed-b367-07e9987d3fa4", _.syntax.literal);

const AnnotationSubject: $.$expr_PathNode<$.TypeSet<$AnnotationSubject, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($AnnotationSubject, $.Cardinality.Many), null, true);

export type $AccessPolicyλShape = $.typeutil.flatten<$InheritingObjectλShape & $AnnotationSubjectλShape & {
  "subject": $.LinkDesc<$ObjectType, $.Cardinality.One, {}, false, false,  false, false>;
  "access_kinds": $.PropertyDesc<$AccessKind, $.Cardinality.Many, false, false, false, false>;
  "condition": $.PropertyDesc<_std.$str, $.Cardinality.AtMostOne, false, false, false, false>;
  "action": $.PropertyDesc<$AccessPolicyAction, $.Cardinality.One, false, false, false, false>;
  "expr": $.PropertyDesc<_std.$str, $.Cardinality.AtMostOne, false, false, false, false>;
  "<access_policies[is schema::ObjectType]": $.LinkDesc<$ObjectType, $.Cardinality.AtMostOne, {}, false, false,  false, false>;
  "<access_policies": $.LinkDesc<$.ObjectType, $.Cardinality.Many, {}, false, false,  false, false>;
}>;
type $AccessPolicy = $.ObjectType<"schema::AccessPolicy", $AccessPolicyλShape, null>;
const $AccessPolicy = $.makeType<$AccessPolicy>(_.spec, "0c42c728-06d1-11ed-888a-6bfaeb997808", _.syntax.literal);

const AccessPolicy: $.$expr_PathNode<$.TypeSet<$AccessPolicy, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($AccessPolicy, $.Cardinality.Many), null, true);

export type $AliasλShape = $.typeutil.flatten<$AnnotationSubjectλShape & {
  "expr": $.PropertyDesc<_std.$str, $.Cardinality.One, false, false, false, false>;
  "type": $.LinkDesc<$Type, $.Cardinality.One, {}, false, false,  false, false>;
}>;
type $Alias = $.ObjectType<"schema::Alias", $AliasλShape, null>;
const $Alias = $.makeType<$Alias>(_.spec, "0c76799c-06d1-11ed-b960-b749d575972e", _.syntax.literal);

const Alias: $.$expr_PathNode<$.TypeSet<$Alias, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($Alias, $.Cardinality.Many), null, true);

export type $AnnotationλShape = $.typeutil.flatten<$InheritingObjectλShape & $AnnotationSubjectλShape & {
  "inheritable": $.PropertyDesc<_std.$bool, $.Cardinality.AtMostOne, false, false, false, false>;
  "<annotations[is schema::AnnotationSubject]": $.LinkDesc<$AnnotationSubject, $.Cardinality.Many, {}, false, false,  false, false>;
  "<annotations[is sys::SystemObject]": $.LinkDesc<_sys.$SystemObject, $.Cardinality.Many, {}, false, false,  false, false>;
  "<annotations[is schema::Annotation]": $.LinkDesc<$Annotation, $.Cardinality.Many, {}, false, false,  false, false>;
  "<annotations[is schema::Alias]": $.LinkDesc<$Alias, $.Cardinality.Many, {}, false, false,  false, false>;
  "<annotations[is schema::Global]": $.LinkDesc<$Global, $.Cardinality.Many, {}, false, false,  false, false>;
  "<annotations[is schema::CallableObject]": $.LinkDesc<$CallableObject, $.Cardinality.Many, {}, false, false,  false, false>;
  "<annotations[is schema::Function]": $.LinkDesc<$Function, $.Cardinality.Many, {}, false, false,  false, false>;
  "<annotations[is schema::Operator]": $.LinkDesc<$Operator, $.Cardinality.Many, {}, false, false,  false, false>;
  "<annotations[is schema::Cast]": $.LinkDesc<$Cast, $.Cardinality.Many, {}, false, false,  false, false>;
  "<annotations[is schema::Migration]": $.LinkDesc<$Migration, $.Cardinality.Many, {}, false, false,  false, false>;
  "<annotations[is schema::Constraint]": $.LinkDesc<$Constraint, $.Cardinality.Many, {}, false, false,  false, false>;
  "<annotations[is schema::Index]": $.LinkDesc<$Index, $.Cardinality.Many, {}, false, false,  false, false>;
  "<annotations[is schema::Pointer]": $.LinkDesc<$Pointer, $.Cardinality.Many, {}, false, false,  false, false>;
  "<annotations[is schema::Property]": $.LinkDesc<$Property, $.Cardinality.Many, {}, false, false,  false, false>;
  "<annotations[is schema::Link]": $.LinkDesc<$Link, $.Cardinality.Many, {}, false, false,  false, false>;
  "<annotations[is schema::AccessPolicy]": $.LinkDesc<$AccessPolicy, $.Cardinality.Many, {}, false, false,  false, false>;
  "<annotations[is schema::ObjectType]": $.LinkDesc<$ObjectType, $.Cardinality.Many, {}, false, false,  false, false>;
  "<annotations[is schema::ScalarType]": $.LinkDesc<$ScalarType, $.Cardinality.Many, {}, false, false,  false, false>;
  "<annotations[is sys::Role]": $.LinkDesc<_sys.$Role, $.Cardinality.Many, {}, false, false,  false, false>;
  "<annotations[is sys::ExtensionPackage]": $.LinkDesc<_sys.$ExtensionPackage, $.Cardinality.Many, {}, false, false,  false, false>;
  "<annotations[is schema::Extension]": $.LinkDesc<$Extension, $.Cardinality.Many, {}, false, false,  false, false>;
  "<annotations[is sys::Database]": $.LinkDesc<_sys.$Database, $.Cardinality.Many, {}, false, false,  false, false>;
  "<annotations": $.LinkDesc<$.ObjectType, $.Cardinality.Many, {}, false, false,  false, false>;
}>;
type $Annotation = $.ObjectType<"schema::Annotation", $AnnotationλShape, null>;
const $Annotation = $.makeType<$Annotation>(_.spec, "0b28bf5a-06d1-11ed-a393-9d0094455c5a", _.syntax.literal);

const Annotation: $.$expr_PathNode<$.TypeSet<$Annotation, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($Annotation, $.Cardinality.Many), null, true);

export type $TypeλShape = $.typeutil.flatten<$SubclassableObjectλShape & $AnnotationSubjectλShape & {
  "expr": $.PropertyDesc<_std.$str, $.Cardinality.AtMostOne, false, false, false, false>;
  "from_alias": $.PropertyDesc<_std.$bool, $.Cardinality.AtMostOne, false, false, false, false>;
  "is_from_alias": $.PropertyDesc<_std.$bool, $.Cardinality.AtMostOne, false, true, false, false>;
  "<element_type[is schema::Array]": $.LinkDesc<$Array, $.Cardinality.Many, {}, false, false,  false, false>;
  "<type[is schema::TupleElement]": $.LinkDesc<$TupleElement, $.Cardinality.Many, {}, false, false,  false, false>;
  "<element_type[is schema::Range]": $.LinkDesc<$Range, $.Cardinality.Many, {}, false, false,  false, false>;
  "<type[is schema::Parameter]": $.LinkDesc<$Parameter, $.Cardinality.Many, {}, false, false,  false, false>;
  "<return_type[is schema::CallableObject]": $.LinkDesc<$CallableObject, $.Cardinality.Many, {}, false, false,  false, false>;
  "<type[is schema::Alias]": $.LinkDesc<$Alias, $.Cardinality.Many, {}, false, false,  false, false>;
  "<target[is schema::Pointer]": $.LinkDesc<$Pointer, $.Cardinality.Many, {}, false, false,  false, false>;
  "<target[is schema::Global]": $.LinkDesc<$Global, $.Cardinality.Many, {}, false, false,  false, false>;
  "<from_type[is schema::Cast]": $.LinkDesc<$Cast, $.Cardinality.Many, {}, false, false,  false, false>;
  "<to_type[is schema::Cast]": $.LinkDesc<$Cast, $.Cardinality.Many, {}, false, false,  false, false>;
  "<return_type[is schema::Function]": $.LinkDesc<$Function, $.Cardinality.Many, {}, false, false,  false, false>;
  "<return_type[is schema::Operator]": $.LinkDesc<$Operator, $.Cardinality.Many, {}, false, false,  false, false>;
  "<return_type[is schema::Constraint]": $.LinkDesc<$Constraint, $.Cardinality.Many, {}, false, false,  false, false>;
  "<target[is schema::Property]": $.LinkDesc<$Property, $.Cardinality.Many, {}, false, false,  false, false>;
  "<element_type": $.LinkDesc<$.ObjectType, $.Cardinality.Many, {}, false, false,  false, false>;
  "<from_type": $.LinkDesc<$.ObjectType, $.Cardinality.Many, {}, false, false,  false, false>;
  "<return_type": $.LinkDesc<$.ObjectType, $.Cardinality.Many, {}, false, false,  false, false>;
  "<target": $.LinkDesc<$.ObjectType, $.Cardinality.Many, {}, false, false,  false, false>;
  "<to_type": $.LinkDesc<$.ObjectType, $.Cardinality.Many, {}, false, false,  false, false>;
  "<type": $.LinkDesc<$.ObjectType, $.Cardinality.Many, {}, false, false,  false, false>;
}>;
type $Type = $.ObjectType<"schema::Type", $TypeλShape, null>;
const $Type = $.makeType<$Type>(_.spec, "0a7f7094-06d1-11ed-b67f-7fea4a1b9f52", _.syntax.literal);

const Type: $.$expr_PathNode<$.TypeSet<$Type, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($Type, $.Cardinality.Many), null, true);

export type $PrimitiveTypeλShape = $.typeutil.flatten<$TypeλShape & {
}>;
type $PrimitiveType = $.ObjectType<"schema::PrimitiveType", $PrimitiveTypeλShape, null>;
const $PrimitiveType = $.makeType<$PrimitiveType>(_.spec, "0aac1a86-06d1-11ed-9c80-8b245cf84654", _.syntax.literal);

const PrimitiveType: $.$expr_PathNode<$.TypeSet<$PrimitiveType, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($PrimitiveType, $.Cardinality.Many), null, true);

export type $CollectionTypeλShape = $.typeutil.flatten<$PrimitiveTypeλShape & {
}>;
type $CollectionType = $.ObjectType<"schema::CollectionType", $CollectionTypeλShape, null>;
const $CollectionType = $.makeType<$CollectionType>(_.spec, "0abbfc94-06d1-11ed-b9a1-352c86f937c4", _.syntax.literal);

const CollectionType: $.$expr_PathNode<$.TypeSet<$CollectionType, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($CollectionType, $.Cardinality.Many), null, true);

export type $ArrayλShape = $.typeutil.flatten<$CollectionTypeλShape & {
  "element_type": $.LinkDesc<$Type, $.Cardinality.One, {}, false, false,  false, false>;
  "dimensions": $.PropertyDesc<$.ArrayType<_std.$int16>, $.Cardinality.AtMostOne, false, false, false, false>;
}>;
type $Array = $.ObjectType<"schema::Array", $ArrayλShape, null>;
const $Array = $.makeType<$Array>(_.spec, "0acc562a-06d1-11ed-b535-c98ab183faf2", _.syntax.literal);

const Array: $.$expr_PathNode<$.TypeSet<$Array, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($Array, $.Cardinality.Many), null, true);

export type $CallableObjectλShape = $.typeutil.flatten<$AnnotationSubjectλShape & {
  "params": $.LinkDesc<$Parameter, $.Cardinality.Many, {
    "@index": $.PropertyDesc<_std.$int64, $.Cardinality.AtMostOne>;
  }, false, false, false, false>;
  "return_type": $.LinkDesc<$Type, $.Cardinality.AtMostOne, {}, false, false,  false, false>;
  "return_typemod": $.PropertyDesc<$TypeModifier, $.Cardinality.AtMostOne, false, false, false, false>;
}>;
type $CallableObject = $.ObjectType<"schema::CallableObject", $CallableObjectλShape, null>;
const $CallableObject = $.makeType<$CallableObject>(_.spec, "0b63408a-06d1-11ed-aa26-8b2f44cf15ed", _.syntax.literal);

const CallableObject: $.$expr_PathNode<$.TypeSet<$CallableObject, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($CallableObject, $.Cardinality.Many), null, true);

export type $VolatilitySubjectλShape = $.typeutil.flatten<$Object_0a6a291406d111eda0df6137d5eed8c1λShape & {
  "volatility": $.PropertyDesc<$Volatility, $.Cardinality.AtMostOne, false, false, false, true>;
}>;
type $VolatilitySubject = $.ObjectType<"schema::VolatilitySubject", $VolatilitySubjectλShape, null>;
const $VolatilitySubject = $.makeType<$VolatilitySubject>(_.spec, "0b79e0e2-06d1-11ed-9625-8dfe72e87ba5", _.syntax.literal);

const VolatilitySubject: $.$expr_PathNode<$.TypeSet<$VolatilitySubject, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($VolatilitySubject, $.Cardinality.Many), null, true);

export type $CastλShape = $.typeutil.flatten<$AnnotationSubjectλShape & $VolatilitySubjectλShape & {
  "from_type": $.LinkDesc<$Type, $.Cardinality.AtMostOne, {}, false, false,  false, false>;
  "to_type": $.LinkDesc<$Type, $.Cardinality.AtMostOne, {}, false, false,  false, false>;
  "allow_implicit": $.PropertyDesc<_std.$bool, $.Cardinality.AtMostOne, false, false, false, false>;
  "allow_assignment": $.PropertyDesc<_std.$bool, $.Cardinality.AtMostOne, false, false, false, false>;
}>;
type $Cast = $.ObjectType<"schema::Cast", $CastλShape, null>;
const $Cast = $.makeType<$Cast>(_.spec, "0e8263ae-06d1-11ed-be72-098147464bdf", _.syntax.literal);

const Cast: $.$expr_PathNode<$.TypeSet<$Cast, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($Cast, $.Cardinality.Many), null, true);

export type $ConsistencySubjectλShape = $.typeutil.flatten<$Object_0a6a291406d111eda0df6137d5eed8c1λShape & $InheritingObjectλShape & $AnnotationSubjectλShape & {
  "constraints": $.LinkDesc<$Constraint, $.Cardinality.Many, {
    "@owned": $.PropertyDesc<_std.$bool, $.Cardinality.AtMostOne>;
    "@is_owned": $.PropertyDesc<_std.$bool, $.Cardinality.AtMostOne>;
  }, true, false, false, false>;
  "<subject[is schema::Constraint]": $.LinkDesc<$Constraint, $.Cardinality.Many, {}, false, false,  false, false>;
  "<subject": $.LinkDesc<$.ObjectType, $.Cardinality.Many, {}, false, false,  false, false>;
}>;
type $ConsistencySubject = $.ObjectType<"schema::ConsistencySubject", $ConsistencySubjectλShape, null>;
const $ConsistencySubject = $.makeType<$ConsistencySubject>(_.spec, "0bb229e8-06d1-11ed-98aa-71ad59cc3687", _.syntax.literal);

const ConsistencySubject: $.$expr_PathNode<$.TypeSet<$ConsistencySubject, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($ConsistencySubject, $.Cardinality.Many), null, true);

export type $ConstraintλShape = $.typeutil.flatten<Omit<$CallableObjectλShape, "params"> & $InheritingObjectλShape & {
  "params": $.LinkDesc<$Parameter, $.Cardinality.Many, {
    "@index": $.PropertyDesc<_std.$int64, $.Cardinality.AtMostOne>;
    "@value": $.PropertyDesc<_std.$str, $.Cardinality.AtMostOne>;
  }, false, false, false, false>;
  "expr": $.PropertyDesc<_std.$str, $.Cardinality.AtMostOne, false, false, false, false>;
  "subjectexpr": $.PropertyDesc<_std.$str, $.Cardinality.AtMostOne, false, false, false, false>;
  "finalexpr": $.PropertyDesc<_std.$str, $.Cardinality.AtMostOne, false, false, false, false>;
  "errmessage": $.PropertyDesc<_std.$str, $.Cardinality.AtMostOne, false, false, false, false>;
  "delegated": $.PropertyDesc<_std.$bool, $.Cardinality.AtMostOne, false, false, false, false>;
  "except_expr": $.PropertyDesc<_std.$str, $.Cardinality.AtMostOne, false, false, false, false>;
  "subject": $.LinkDesc<$ConsistencySubject, $.Cardinality.AtMostOne, {}, false, false,  false, false>;
  "<constraints[is schema::ConsistencySubject]": $.LinkDesc<$ConsistencySubject, $.Cardinality.AtMostOne, {}, false, false,  false, false>;
  "<constraints[is schema::Pointer]": $.LinkDesc<$Pointer, $.Cardinality.AtMostOne, {}, false, false,  false, false>;
  "<constraints[is schema::Property]": $.LinkDesc<$Property, $.Cardinality.AtMostOne, {}, false, false,  false, false>;
  "<constraints[is schema::Link]": $.LinkDesc<$Link, $.Cardinality.AtMostOne, {}, false, false,  false, false>;
  "<constraints[is schema::ObjectType]": $.LinkDesc<$ObjectType, $.Cardinality.AtMostOne, {}, false, false,  false, false>;
  "<constraints[is schema::ScalarType]": $.LinkDesc<$ScalarType, $.Cardinality.AtMostOne, {}, false, false,  false, false>;
  "<constraints": $.LinkDesc<$.ObjectType, $.Cardinality.Many, {}, false, false,  false, false>;
}>;
type $Constraint = $.ObjectType<"schema::Constraint", $ConstraintλShape, null>;
const $Constraint = $.makeType<$Constraint>(_.spec, "0b85b70a-06d1-11ed-b348-3db3d0135164", _.syntax.literal);

const Constraint: $.$expr_PathNode<$.TypeSet<$Constraint, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($Constraint, $.Cardinality.Many), null, true);

export type $DeltaλShape = $.typeutil.flatten<$Object_0a6a291406d111eda0df6137d5eed8c1λShape & {
  "parents": $.LinkDesc<$Delta, $.Cardinality.Many, {}, false, false,  false, false>;
  "<parents[is schema::Delta]": $.LinkDesc<$Delta, $.Cardinality.Many, {}, false, false,  false, false>;
  "<parents": $.LinkDesc<$.ObjectType, $.Cardinality.Many, {}, false, false,  false, false>;
}>;
type $Delta = $.ObjectType<"schema::Delta", $DeltaλShape, null>;
const $Delta = $.makeType<$Delta>(_.spec, "0b139670-06d1-11ed-861d-df4baa1798a2", _.syntax.literal);

const Delta: $.$expr_PathNode<$.TypeSet<$Delta, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($Delta, $.Cardinality.Many), null, true);

export type $ExtensionλShape = $.typeutil.flatten<$AnnotationSubjectλShape & $Object_0a6a291406d111eda0df6137d5eed8c1λShape & {
  "package": $.LinkDesc<_sys.$ExtensionPackage, $.Cardinality.One, {}, true, false,  false, false>;
}>;
type $Extension = $.ObjectType<"schema::Extension", $ExtensionλShape, null>;
const $Extension = $.makeType<$Extension>(_.spec, "0ede4bec-06d1-11ed-8352-cd68e0fe4b79", _.syntax.literal);

const Extension: $.$expr_PathNode<$.TypeSet<$Extension, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($Extension, $.Cardinality.Many), null, true);

export type $FunctionλShape = $.typeutil.flatten<$CallableObjectλShape & $VolatilitySubjectλShape & {
  "preserves_optionality": $.PropertyDesc<_std.$bool, $.Cardinality.AtMostOne, false, false, false, true>;
  "body": $.PropertyDesc<_std.$str, $.Cardinality.AtMostOne, false, false, false, false>;
  "language": $.PropertyDesc<_std.$str, $.Cardinality.One, false, false, false, false>;
  "used_globals": $.LinkDesc<$Global, $.Cardinality.Many, {
    "@index": $.PropertyDesc<_std.$int64, $.Cardinality.AtMostOne>;
  }, false, false, false, false>;
}>;
type $Function = $.ObjectType<"schema::Function", $FunctionλShape, null>;
const $Function = $.makeType<$Function>(_.spec, "0e39a240-06d1-11ed-ad00-13e8fd053261", _.syntax.literal);

const Function: $.$expr_PathNode<$.TypeSet<$Function, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($Function, $.Cardinality.Many), null, true);

export type $GlobalλShape = $.typeutil.flatten<$AnnotationSubjectλShape & {
  "target": $.LinkDesc<$Type, $.Cardinality.One, {}, false, false,  false, false>;
  "required": $.PropertyDesc<_std.$bool, $.Cardinality.AtMostOne, false, false, false, false>;
  "cardinality": $.PropertyDesc<$Cardinality, $.Cardinality.AtMostOne, false, false, false, false>;
  "expr": $.PropertyDesc<_std.$str, $.Cardinality.AtMostOne, false, false, false, false>;
  "default": $.PropertyDesc<_std.$str, $.Cardinality.AtMostOne, false, false, false, false>;
  "<used_globals[is schema::Function]": $.LinkDesc<$Function, $.Cardinality.Many, {}, false, false,  false, false>;
  "<used_globals": $.LinkDesc<$.ObjectType, $.Cardinality.Many, {}, false, false,  false, false>;
}>;
type $Global = $.ObjectType<"schema::Global", $GlobalλShape, null>;
const $Global = $.makeType<$Global>(_.spec, "0e1ce1fa-06d1-11ed-9491-c3b7861574e7", _.syntax.literal);

const Global: $.$expr_PathNode<$.TypeSet<$Global, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($Global, $.Cardinality.Many), null, true);

export type $IndexλShape = $.typeutil.flatten<$InheritingObjectλShape & $AnnotationSubjectλShape & {
  "expr": $.PropertyDesc<_std.$str, $.Cardinality.AtMostOne, false, false, false, false>;
  "except_expr": $.PropertyDesc<_std.$str, $.Cardinality.AtMostOne, false, false, false, false>;
  "<indexes[is schema::Source]": $.LinkDesc<$Source, $.Cardinality.AtMostOne, {}, false, false,  false, false>;
  "<indexes[is schema::ObjectType]": $.LinkDesc<$ObjectType, $.Cardinality.AtMostOne, {}, false, false,  false, false>;
  "<indexes[is schema::Link]": $.LinkDesc<$Link, $.Cardinality.AtMostOne, {}, false, false,  false, false>;
  "<indexes": $.LinkDesc<$.ObjectType, $.Cardinality.Many, {}, false, false,  false, false>;
}>;
type $Index = $.ObjectType<"schema::Index", $IndexλShape, null>;
const $Index = $.makeType<$Index>(_.spec, "0be36b84-06d1-11ed-8c67-49a7ffdf3d7f", _.syntax.literal);

const Index: $.$expr_PathNode<$.TypeSet<$Index, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($Index, $.Cardinality.Many), null, true);

export type $PointerλShape = $.typeutil.flatten<$InheritingObjectλShape & $ConsistencySubjectλShape & $AnnotationSubjectλShape & {
  "cardinality": $.PropertyDesc<$Cardinality, $.Cardinality.AtMostOne, false, false, false, false>;
  "required": $.PropertyDesc<_std.$bool, $.Cardinality.AtMostOne, false, false, false, false>;
  "readonly": $.PropertyDesc<_std.$bool, $.Cardinality.AtMostOne, false, false, false, false>;
  "default": $.PropertyDesc<_std.$str, $.Cardinality.AtMostOne, false, false, false, false>;
  "expr": $.PropertyDesc<_std.$str, $.Cardinality.AtMostOne, false, false, false, false>;
  "source": $.LinkDesc<$Source, $.Cardinality.AtMostOne, {}, false, false,  false, false>;
  "target": $.LinkDesc<$Type, $.Cardinality.AtMostOne, {}, false, false,  false, false>;
  "<pointers[is schema::Source]": $.LinkDesc<$Source, $.Cardinality.AtMostOne, {}, false, false,  false, false>;
  "<pointers[is schema::Link]": $.LinkDesc<$Link, $.Cardinality.AtMostOne, {}, false, false,  false, false>;
  "<pointers[is schema::ObjectType]": $.LinkDesc<$ObjectType, $.Cardinality.AtMostOne, {}, false, false,  false, false>;
  "<pointers": $.LinkDesc<$.ObjectType, $.Cardinality.Many, {}, false, false,  false, false>;
}>;
type $Pointer = $.ObjectType<"schema::Pointer", $PointerλShape, null>;
const $Pointer = $.makeType<$Pointer>(_.spec, "0c16202e-06d1-11ed-9e5a-ad1681eef101", _.syntax.literal);

const Pointer: $.$expr_PathNode<$.TypeSet<$Pointer, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($Pointer, $.Cardinality.Many), null, true);

export type $SourceλShape = $.typeutil.flatten<$Object_0a6a291406d111eda0df6137d5eed8c1λShape & {
  "indexes": $.LinkDesc<$Index, $.Cardinality.Many, {
    "@owned": $.PropertyDesc<_std.$bool, $.Cardinality.AtMostOne>;
    "@is_owned": $.PropertyDesc<_std.$bool, $.Cardinality.AtMostOne>;
  }, true, false, false, false>;
  "pointers": $.LinkDesc<$Pointer, $.Cardinality.Many, {
    "@owned": $.PropertyDesc<_std.$bool, $.Cardinality.AtMostOne>;
    "@is_owned": $.PropertyDesc<_std.$bool, $.Cardinality.AtMostOne>;
  }, true, false, false, false>;
  "<source[is schema::Pointer]": $.LinkDesc<$Pointer, $.Cardinality.Many, {}, false, false,  false, false>;
  "<source[is schema::Property]": $.LinkDesc<$Property, $.Cardinality.Many, {}, false, false,  false, false>;
  "<source[is schema::Link]": $.LinkDesc<$Link, $.Cardinality.Many, {}, false, false,  false, false>;
  "<source": $.LinkDesc<$.ObjectType, $.Cardinality.Many, {}, false, false,  false, false>;
}>;
type $Source = $.ObjectType<"schema::Source", $SourceλShape, null>;
const $Source = $.makeType<$Source>(_.spec, "0c038856-06d1-11ed-ba79-0d9ab9fd5711", _.syntax.literal);

const Source: $.$expr_PathNode<$.TypeSet<$Source, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($Source, $.Cardinality.Many), null, true);

export type $LinkλShape = $.typeutil.flatten<Omit<$PointerλShape, "target"> & $SourceλShape & {
  "target": $.LinkDesc<$ObjectType, $.Cardinality.AtMostOne, {}, false, false,  false, false>;
  "properties": $.LinkDesc<$Property, $.Cardinality.Many, {
    "@owned": $.PropertyDesc<_std.$bool, $.Cardinality.AtMostOne>;
    "@is_owned": $.PropertyDesc<_std.$bool, $.Cardinality.AtMostOne>;
  }, false, true, false, false>;
  "on_target_delete": $.PropertyDesc<$TargetDeleteAction, $.Cardinality.AtMostOne, false, false, false, false>;
  "on_source_delete": $.PropertyDesc<$SourceDeleteAction, $.Cardinality.AtMostOne, false, false, false, false>;
  "<links[is schema::ObjectType]": $.LinkDesc<$ObjectType, $.Cardinality.Many, {}, false, false,  false, false>;
  "<links": $.LinkDesc<$.ObjectType, $.Cardinality.Many, {}, false, false,  false, false>;
}>;
type $Link = $.ObjectType<"schema::Link", $LinkλShape, null>;
const $Link = $.makeType<$Link>(_.spec, "0d83b570-06d1-11ed-93d6-4dfb57a21ab1", _.syntax.literal);

const Link: $.$expr_PathNode<$.TypeSet<$Link, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($Link, $.Cardinality.Many), null, true);

export type $MigrationλShape = $.typeutil.flatten<$AnnotationSubjectλShape & $Object_0a6a291406d111eda0df6137d5eed8c1λShape & {
  "parents": $.LinkDesc<$Migration, $.Cardinality.Many, {}, false, false,  false, false>;
  "script": $.PropertyDesc<_std.$str, $.Cardinality.One, false, false, false, false>;
  "message": $.PropertyDesc<_std.$str, $.Cardinality.AtMostOne, false, false, false, false>;
  "<parents[is schema::Migration]": $.LinkDesc<$Migration, $.Cardinality.Many, {}, false, false,  false, false>;
  "<parents": $.LinkDesc<$.ObjectType, $.Cardinality.Many, {}, false, false,  false, false>;
}>;
type $Migration = $.ObjectType<"schema::Migration", $MigrationλShape, null>;
const $Migration = $.makeType<$Migration>(_.spec, "0ea2723e-06d1-11ed-b10d-4d12f14e8719", _.syntax.literal);

const Migration: $.$expr_PathNode<$.TypeSet<$Migration, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($Migration, $.Cardinality.Many), null, true);

export type $ModuleλShape = $.typeutil.flatten<$Object_0a6a291406d111eda0df6137d5eed8c1λShape & $AnnotationSubjectλShape & {
}>;
type $Module = $.ObjectType<"schema::Module", $ModuleλShape, null>;
const $Module = $.makeType<$Module>(_.spec, "0aa3a216-06d1-11ed-84dd-6b110b198c59", _.syntax.literal);

const Module: $.$expr_PathNode<$.TypeSet<$Module, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($Module, $.Cardinality.Many), null, true);

export type $ObjectTypeλShape = $.typeutil.flatten<$InheritingObjectλShape & Omit<$ConsistencySubjectλShape, "<subject"> & $AnnotationSubjectλShape & Omit<$TypeλShape, "<target"> & $SourceλShape & {
  "union_of": $.LinkDesc<$ObjectType, $.Cardinality.Many, {}, false, false,  false, false>;
  "intersection_of": $.LinkDesc<$ObjectType, $.Cardinality.Many, {}, false, false,  false, false>;
  "access_policies": $.LinkDesc<$AccessPolicy, $.Cardinality.Many, {
    "@owned": $.PropertyDesc<_std.$bool, $.Cardinality.AtMostOne>;
    "@is_owned": $.PropertyDesc<_std.$bool, $.Cardinality.AtMostOne>;
  }, true, false, false, false>;
  "compound_type": $.PropertyDesc<_std.$bool, $.Cardinality.One, false, true, false, false>;
  "is_compound_type": $.PropertyDesc<_std.$bool, $.Cardinality.One, false, true, false, false>;
  "links": $.LinkDesc<$Link, $.Cardinality.Many, {
    "@owned": $.PropertyDesc<_std.$bool, $.Cardinality.AtMostOne>;
    "@is_owned": $.PropertyDesc<_std.$bool, $.Cardinality.AtMostOne>;
  }, false, true, false, false>;
  "properties": $.LinkDesc<$Property, $.Cardinality.Many, {
    "@owned": $.PropertyDesc<_std.$bool, $.Cardinality.AtMostOne>;
    "@is_owned": $.PropertyDesc<_std.$bool, $.Cardinality.AtMostOne>;
  }, false, true, false, false>;
  "<__type__[is std::BaseObject]": $.LinkDesc<$.ObjectType, $.Cardinality.Many, {}, false, false,  false, false>;
  "<__type__[is schema::Object]": $.LinkDesc<$Object_0a6a291406d111eda0df6137d5eed8c1, $.Cardinality.Many, {}, false, false,  false, false>;
  "<__type__[is schema::SubclassableObject]": $.LinkDesc<$SubclassableObject, $.Cardinality.Many, {}, false, false,  false, false>;
  "<__type__[is schema::InheritingObject]": $.LinkDesc<$InheritingObject, $.Cardinality.Many, {}, false, false,  false, false>;
  "<__type__[is schema::Delta]": $.LinkDesc<$Delta, $.Cardinality.Many, {}, false, false,  false, false>;
  "<__type__[is schema::VolatilitySubject]": $.LinkDesc<$VolatilitySubject, $.Cardinality.Many, {}, false, false,  false, false>;
  "<__type__[is schema::AnnotationSubject]": $.LinkDesc<$AnnotationSubject, $.Cardinality.Many, {}, false, false,  false, false>;
  "<__type__[is std::FreeObject]": $.LinkDesc<_std.$FreeObject, $.Cardinality.Many, {}, false, false,  false, false>;
  "<__type__[is schema::TupleElement]": $.LinkDesc<$TupleElement, $.Cardinality.Many, {}, false, false,  false, false>;
  "<__type__[is std::Object]": $.LinkDesc<_std.$Object_0a07d6d806d111ed94d94589f54dfbc0, $.Cardinality.Many, {}, false, false,  false, false>;
  "<union_of[is schema::ObjectType]": $.LinkDesc<$ObjectType, $.Cardinality.Many, {}, false, false,  false, false>;
  "<intersection_of[is schema::ObjectType]": $.LinkDesc<$ObjectType, $.Cardinality.Many, {}, false, false,  false, false>;
  "<subject[is schema::AccessPolicy]": $.LinkDesc<$AccessPolicy, $.Cardinality.Many, {}, false, false,  false, false>;
  "<__type__[is sys::SystemObject]": $.LinkDesc<_sys.$SystemObject, $.Cardinality.Many, {}, false, false,  false, false>;
  "<__type__[is cfg::ConfigObject]": $.LinkDesc<_cfg.$ConfigObject, $.Cardinality.Many, {}, false, false,  false, false>;
  "<__type__[is cfg::AuthMethod]": $.LinkDesc<_cfg.$AuthMethod, $.Cardinality.Many, {}, false, false,  false, false>;
  "<__type__[is cfg::Trust]": $.LinkDesc<_cfg.$Trust, $.Cardinality.Many, {}, false, false,  false, false>;
  "<__type__[is cfg::SCRAM]": $.LinkDesc<_cfg.$SCRAM, $.Cardinality.Many, {}, false, false,  false, false>;
  "<__type__[is cfg::JWT]": $.LinkDesc<_cfg.$JWT, $.Cardinality.Many, {}, false, false,  false, false>;
  "<__type__[is cfg::Auth]": $.LinkDesc<_cfg.$Auth, $.Cardinality.Many, {}, false, false,  false, false>;
  "<__type__[is cfg::AbstractConfig]": $.LinkDesc<_cfg.$AbstractConfig, $.Cardinality.Many, {}, false, false,  false, false>;
  "<__type__[is cfg::Config]": $.LinkDesc<_cfg.$Config, $.Cardinality.Many, {}, false, false,  false, false>;
  "<__type__[is cfg::InstanceConfig]": $.LinkDesc<_cfg.$InstanceConfig, $.Cardinality.Many, {}, false, false,  false, false>;
  "<__type__[is cfg::DatabaseConfig]": $.LinkDesc<_cfg.$DatabaseConfig, $.Cardinality.Many, {}, false, false,  false, false>;
  "<__type__[is cfg::TestSessionConfig]": $.LinkDesc<_cfg.$TestSessionConfig, $.Cardinality.Many, {}, false, false,  false, false>;
  "<__type__[is cfg::Base]": $.LinkDesc<_cfg.$Base, $.Cardinality.Many, {}, false, false,  false, false>;
  "<__type__[is cfg::Subclass1]": $.LinkDesc<_cfg.$Subclass1, $.Cardinality.Many, {}, false, false,  false, false>;
  "<__type__[is cfg::Subclass2]": $.LinkDesc<_cfg.$Subclass2, $.Cardinality.Many, {}, false, false,  false, false>;
  "<__type__[is cfg::TestInstanceConfig]": $.LinkDesc<_cfg.$TestInstanceConfig, $.Cardinality.Many, {}, false, false,  false, false>;
  "<__type__[is schema::Annotation]": $.LinkDesc<$Annotation, $.Cardinality.Many, {}, false, false,  false, false>;
  "<__type__[is schema::Type]": $.LinkDesc<$Type, $.Cardinality.Many, {}, false, false,  false, false>;
  "<__type__[is schema::PrimitiveType]": $.LinkDesc<$PrimitiveType, $.Cardinality.Many, {}, false, false,  false, false>;
  "<__type__[is schema::CollectionType]": $.LinkDesc<$CollectionType, $.Cardinality.Many, {}, false, false,  false, false>;
  "<__type__[is schema::Array]": $.LinkDesc<$Array, $.Cardinality.Many, {}, false, false,  false, false>;
  "<__type__[is schema::Tuple]": $.LinkDesc<$Tuple, $.Cardinality.Many, {}, false, false,  false, false>;
  "<__type__[is schema::Range]": $.LinkDesc<$Range, $.Cardinality.Many, {}, false, false,  false, false>;
  "<__type__[is schema::Alias]": $.LinkDesc<$Alias, $.Cardinality.Many, {}, false, false,  false, false>;
  "<__type__[is schema::Global]": $.LinkDesc<$Global, $.Cardinality.Many, {}, false, false,  false, false>;
  "<__type__[is schema::Parameter]": $.LinkDesc<$Parameter, $.Cardinality.Many, {}, false, false,  false, false>;
  "<__type__[is schema::CallableObject]": $.LinkDesc<$CallableObject, $.Cardinality.Many, {}, false, false,  false, false>;
  "<__type__[is schema::Function]": $.LinkDesc<$Function, $.Cardinality.Many, {}, false, false,  false, false>;
  "<__type__[is schema::Operator]": $.LinkDesc<$Operator, $.Cardinality.Many, {}, false, false,  false, false>;
  "<__type__[is schema::Cast]": $.LinkDesc<$Cast, $.Cardinality.Many, {}, false, false,  false, false>;
  "<__type__[is schema::Migration]": $.LinkDesc<$Migration, $.Cardinality.Many, {}, false, false,  false, false>;
  "<__type__[is schema::Module]": $.LinkDesc<$Module, $.Cardinality.Many, {}, false, false,  false, false>;
  "<__type__[is schema::PseudoType]": $.LinkDesc<$PseudoType, $.Cardinality.Many, {}, false, false,  false, false>;
  "<__type__[is schema::Constraint]": $.LinkDesc<$Constraint, $.Cardinality.Many, {}, false, false,  false, false>;
  "<__type__[is schema::ConsistencySubject]": $.LinkDesc<$ConsistencySubject, $.Cardinality.Many, {}, false, false,  false, false>;
  "<__type__[is schema::Index]": $.LinkDesc<$Index, $.Cardinality.Many, {}, false, false,  false, false>;
  "<__type__[is schema::Pointer]": $.LinkDesc<$Pointer, $.Cardinality.Many, {}, false, false,  false, false>;
  "<__type__[is schema::Property]": $.LinkDesc<$Property, $.Cardinality.Many, {}, false, false,  false, false>;
  "<__type__[is schema::Source]": $.LinkDesc<$Source, $.Cardinality.Many, {}, false, false,  false, false>;
  "<target[is schema::Link]": $.LinkDesc<$Link, $.Cardinality.Many, {}, false, false,  false, false>;
  "<__type__[is schema::Link]": $.LinkDesc<$Link, $.Cardinality.Many, {}, false, false,  false, false>;
  "<__type__[is schema::AccessPolicy]": $.LinkDesc<$AccessPolicy, $.Cardinality.Many, {}, false, false,  false, false>;
  "<__type__[is schema::ObjectType]": $.LinkDesc<$ObjectType, $.Cardinality.Many, {}, false, false,  false, false>;
  "<__type__[is schema::ScalarType]": $.LinkDesc<$ScalarType, $.Cardinality.Many, {}, false, false,  false, false>;
  "<__type__[is sys::Role]": $.LinkDesc<_sys.$Role, $.Cardinality.Many, {}, false, false,  false, false>;
  "<__type__[is sys::ExtensionPackage]": $.LinkDesc<_sys.$ExtensionPackage, $.Cardinality.Many, {}, false, false,  false, false>;
  "<__type__[is schema::Extension]": $.LinkDesc<$Extension, $.Cardinality.Many, {}, false, false,  false, false>;
  "<__type__[is sys::Database]": $.LinkDesc<_sys.$Database, $.Cardinality.Many, {}, false, false,  false, false>;
  "<__type__[is HasAge]": $.LinkDesc<_default.$HasAge, $.Cardinality.Many, {}, false, false,  false, false>;
  "<__type__[is HasName]": $.LinkDesc<_default.$HasName, $.Cardinality.Many, {}, false, false,  false, false>;
  "<__type__[is Bag]": $.LinkDesc<_default.$Bag, $.Cardinality.Many, {}, false, false,  false, false>;
  "<__type__[is A]": $.LinkDesc<_default.$A, $.Cardinality.Many, {}, false, false,  false, false>;
  "<__type__[is Łukasz]": $.LinkDesc<_default.$ukasz_b502ed8e06ef11ed8d1ddf3cf3e9f851, $.Cardinality.Many, {}, false, false,  false, false>;
  "<__type__[is S p a M]": $.LinkDesc<_default.$SpaM_b507a19e06ef11eda5728f8ce2372763, $.Cardinality.Many, {}, false, false,  false, false>;
  "<__type__[is Person]": $.LinkDesc<_default.$Person, $.Cardinality.Many, {}, false, false,  false, false>;
  "<__type__[is Profile]": $.LinkDesc<_default.$Profile, $.Cardinality.Many, {}, false, false,  false, false>;
  "<__type__[is Movie]": $.LinkDesc<_default.$Movie, $.Cardinality.Many, {}, false, false,  false, false>;
  "<__type__[is Simple]": $.LinkDesc<_default.$Simple, $.Cardinality.Many, {}, false, false,  false, false>;
  "<__type__[is Hero]": $.LinkDesc<_default.$Hero, $.Cardinality.Many, {}, false, false,  false, false>;
  "<__type__[is Villain]": $.LinkDesc<_default.$Villain, $.Cardinality.Many, {}, false, false,  false, false>;
  "<__type__[is MovieShape]": $.LinkDesc<_default.$MovieShape, $.Cardinality.Many, {}, false, false,  false, false>;
  "<__type__[is User]": $.LinkDesc<_default.$User, $.Cardinality.Many, {}, false, false,  false, false>;
  "<__type__[is AdminUser]": $.LinkDesc<_default.$AdminUser, $.Cardinality.Many, {}, false, false,  false, false>;
  "<__type__": $.LinkDesc<$.ObjectType, $.Cardinality.Many, {}, false, false,  false, false>;
  "<intersection_of": $.LinkDesc<$.ObjectType, $.Cardinality.Many, {}, false, false,  false, false>;
  "<subject": $.LinkDesc<$.ObjectType, $.Cardinality.Many, {}, false, false,  false, false>;
  "<target": $.LinkDesc<$.ObjectType, $.Cardinality.Many, {}, false, false,  false, false>;
  "<union_of": $.LinkDesc<$.ObjectType, $.Cardinality.Many, {}, false, false,  false, false>;
}>;
type $ObjectType = $.ObjectType<"schema::ObjectType", $ObjectTypeλShape, null>;
const $ObjectType = $.makeType<$ObjectType>(_.spec, "0cc8efec-06d1-11ed-a35e-e1b091ae1a49", _.syntax.literal);

const ObjectType: $.$expr_PathNode<$.TypeSet<$ObjectType, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($ObjectType, $.Cardinality.Many), null, true);

export type $OperatorλShape = $.typeutil.flatten<$CallableObjectλShape & $VolatilitySubjectλShape & {
  "operator_kind": $.PropertyDesc<$OperatorKind, $.Cardinality.AtMostOne, false, false, false, false>;
  "abstract": $.PropertyDesc<_std.$bool, $.Cardinality.AtMostOne, false, false, false, true>;
  "is_abstract": $.PropertyDesc<_std.$bool, $.Cardinality.AtMostOne, false, true, false, true>;
}>;
type $Operator = $.ObjectType<"schema::Operator", $OperatorλShape, null>;
const $Operator = $.makeType<$Operator>(_.spec, "0e5f0878-06d1-11ed-8985-59660fbca8ed", _.syntax.literal);

const Operator: $.$expr_PathNode<$.TypeSet<$Operator, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($Operator, $.Cardinality.Many), null, true);

export type $ParameterλShape = $.typeutil.flatten<$Object_0a6a291406d111eda0df6137d5eed8c1λShape & {
  "type": $.LinkDesc<$Type, $.Cardinality.One, {}, false, false,  false, false>;
  "typemod": $.PropertyDesc<$TypeModifier, $.Cardinality.One, false, false, false, false>;
  "kind": $.PropertyDesc<$ParameterKind, $.Cardinality.One, false, false, false, false>;
  "num": $.PropertyDesc<_std.$int64, $.Cardinality.One, false, false, false, false>;
  "default": $.PropertyDesc<_std.$str, $.Cardinality.AtMostOne, false, false, false, false>;
  "<params[is schema::CallableObject]": $.LinkDesc<$CallableObject, $.Cardinality.Many, {}, false, false,  false, false>;
  "<params[is schema::Function]": $.LinkDesc<$Function, $.Cardinality.Many, {}, false, false,  false, false>;
  "<params[is schema::Operator]": $.LinkDesc<$Operator, $.Cardinality.Many, {}, false, false,  false, false>;
  "<params[is schema::Constraint]": $.LinkDesc<$Constraint, $.Cardinality.Many, {}, false, false,  false, false>;
  "<params": $.LinkDesc<$.ObjectType, $.Cardinality.Many, {}, false, false,  false, false>;
}>;
type $Parameter = $.ObjectType<"schema::Parameter", $ParameterλShape, null>;
const $Parameter = $.makeType<$Parameter>(_.spec, "0b5398a6-06d1-11ed-8be0-b554c037adb0", _.syntax.literal);

const Parameter: $.$expr_PathNode<$.TypeSet<$Parameter, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($Parameter, $.Cardinality.Many), null, true);

export type $PropertyλShape = $.typeutil.flatten<$PointerλShape & {
  "<properties[is schema::Link]": $.LinkDesc<$Link, $.Cardinality.Many, {}, false, false,  false, false>;
  "<properties[is schema::ObjectType]": $.LinkDesc<$ObjectType, $.Cardinality.Many, {}, false, false,  false, false>;
  "<properties": $.LinkDesc<$.ObjectType, $.Cardinality.Many, {}, false, false,  false, false>;
}>;
type $Property = $.ObjectType<"schema::Property", $PropertyλShape, null>;
const $Property = $.makeType<$Property>(_.spec, "0dc2780a-06d1-11ed-9a3d-b71973879163", _.syntax.literal);

const Property: $.$expr_PathNode<$.TypeSet<$Property, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($Property, $.Cardinality.Many), null, true);

export type $PseudoTypeλShape = $.typeutil.flatten<$InheritingObjectλShape & $TypeλShape & {
}>;
type $PseudoType = $.ObjectType<"schema::PseudoType", $PseudoTypeλShape, null>;
const $PseudoType = $.makeType<$PseudoType>(_.spec, "0a8c34d2-06d1-11ed-9721-7becebf58f01", _.syntax.literal);

const PseudoType: $.$expr_PathNode<$.TypeSet<$PseudoType, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($PseudoType, $.Cardinality.Many), null, true);

export type $RangeλShape = $.typeutil.flatten<$CollectionTypeλShape & {
  "element_type": $.LinkDesc<$Type, $.Cardinality.One, {}, false, false,  false, false>;
}>;
type $Range = $.ObjectType<"schema::Range", $RangeλShape, null>;
const $Range = $.makeType<$Range>(_.spec, "0aff85c2-06d1-11ed-9c7f-edca100a2097", _.syntax.literal);

const Range: $.$expr_PathNode<$.TypeSet<$Range, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($Range, $.Cardinality.Many), null, true);

export type $ScalarTypeλShape = $.typeutil.flatten<$InheritingObjectλShape & $ConsistencySubjectλShape & $AnnotationSubjectλShape & $PrimitiveTypeλShape & {
  "default": $.PropertyDesc<_std.$str, $.Cardinality.AtMostOne, false, false, false, false>;
  "enum_values": $.PropertyDesc<$.ArrayType<_std.$str>, $.Cardinality.AtMostOne, false, false, false, false>;
}>;
type $ScalarType = $.ObjectType<"schema::ScalarType", $ScalarTypeλShape, null>;
const $ScalarType = $.makeType<$ScalarType>(_.spec, "0c9307a6-06d1-11ed-9279-4da418e7160e", _.syntax.literal);

const ScalarType: $.$expr_PathNode<$.TypeSet<$ScalarType, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($ScalarType, $.Cardinality.Many), null, true);

export type $TupleλShape = $.typeutil.flatten<$CollectionTypeλShape & {
  "named": $.PropertyDesc<_std.$bool, $.Cardinality.One, false, false, false, false>;
  "element_types": $.LinkDesc<$TupleElement, $.Cardinality.Many, {
    "@index": $.PropertyDesc<_std.$int64, $.Cardinality.AtMostOne>;
  }, true, false, false, false>;
}>;
type $Tuple = $.ObjectType<"schema::Tuple", $TupleλShape, null>;
const $Tuple = $.makeType<$Tuple>(_.spec, "0ae829e0-06d1-11ed-9cfc-ebfecba4605f", _.syntax.literal);

const Tuple: $.$expr_PathNode<$.TypeSet<$Tuple, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($Tuple, $.Cardinality.Many), null, true);

export type $TupleElementλShape = $.typeutil.flatten<_std.$BaseObjectλShape & {
  "type": $.LinkDesc<$Type, $.Cardinality.One, {}, false, false,  false, false>;
  "name": $.PropertyDesc<_std.$str, $.Cardinality.AtMostOne, false, false, false, false>;
  "<element_types[is schema::Tuple]": $.LinkDesc<$Tuple, $.Cardinality.AtMostOne, {}, false, false,  false, false>;
  "<element_types": $.LinkDesc<$.ObjectType, $.Cardinality.Many, {}, false, false,  false, false>;
}>;
type $TupleElement = $.ObjectType<"schema::TupleElement", $TupleElementλShape, null>;
const $TupleElement = $.makeType<$TupleElement>(_.spec, "0ae0ac7e-06d1-11ed-a9f6-e9b077c5d413", _.syntax.literal);

const TupleElement: $.$expr_PathNode<$.TypeSet<$TupleElement, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($TupleElement, $.Cardinality.Many), null, true);



export { $AccessKindλEnum, AccessKind, $AccessPolicyActionλEnum, AccessPolicyAction, $CardinalityλEnum, Cardinality, $OperatorKindλEnum, OperatorKind, $ParameterKindλEnum, ParameterKind, $SourceDeleteActionλEnum, SourceDeleteAction, $TargetDeleteActionλEnum, TargetDeleteAction, $TypeModifierλEnum, TypeModifier, $VolatilityλEnum, Volatility, $Object_0a6a291406d111eda0df6137d5eed8c1, Object_0a6a291406d111eda0df6137d5eed8c1, $SubclassableObject, SubclassableObject, $InheritingObject, InheritingObject, $AnnotationSubject, AnnotationSubject, $AccessPolicy, AccessPolicy, $Alias, Alias, $Annotation, Annotation, $Type, Type, $PrimitiveType, PrimitiveType, $CollectionType, CollectionType, $Array, Array, $CallableObject, CallableObject, $VolatilitySubject, VolatilitySubject, $Cast, Cast, $ConsistencySubject, ConsistencySubject, $Constraint, Constraint, $Delta, Delta, $Extension, Extension, $Function, Function, $Global, Global, $Index, Index, $Pointer, Pointer, $Source, Source, $Link, Link, $Migration, Migration, $Module, Module, $ObjectType, ObjectType, $Operator, Operator, $Parameter, Parameter, $Property, Property, $PseudoType, PseudoType, $Range, Range, $ScalarType, ScalarType, $Tuple, Tuple, $TupleElement, TupleElement };

type __defaultExports = {
  "AccessKind": typeof AccessKind;
  "AccessPolicyAction": typeof AccessPolicyAction;
  "Cardinality": typeof Cardinality;
  "OperatorKind": typeof OperatorKind;
  "ParameterKind": typeof ParameterKind;
  "SourceDeleteAction": typeof SourceDeleteAction;
  "TargetDeleteAction": typeof TargetDeleteAction;
  "TypeModifier": typeof TypeModifier;
  "Volatility": typeof Volatility;
  "Object": typeof Object_0a6a291406d111eda0df6137d5eed8c1;
  "SubclassableObject": typeof SubclassableObject;
  "InheritingObject": typeof InheritingObject;
  "AnnotationSubject": typeof AnnotationSubject;
  "AccessPolicy": typeof AccessPolicy;
  "Alias": typeof Alias;
  "Annotation": typeof Annotation;
  "Type": typeof Type;
  "PrimitiveType": typeof PrimitiveType;
  "CollectionType": typeof CollectionType;
  "Array": typeof Array;
  "CallableObject": typeof CallableObject;
  "VolatilitySubject": typeof VolatilitySubject;
  "Cast": typeof Cast;
  "ConsistencySubject": typeof ConsistencySubject;
  "Constraint": typeof Constraint;
  "Delta": typeof Delta;
  "Extension": typeof Extension;
  "Function": typeof Function;
  "Global": typeof Global;
  "Index": typeof Index;
  "Pointer": typeof Pointer;
  "Source": typeof Source;
  "Link": typeof Link;
  "Migration": typeof Migration;
  "Module": typeof Module;
  "ObjectType": typeof ObjectType;
  "Operator": typeof Operator;
  "Parameter": typeof Parameter;
  "Property": typeof Property;
  "PseudoType": typeof PseudoType;
  "Range": typeof Range;
  "ScalarType": typeof ScalarType;
  "Tuple": typeof Tuple;
  "TupleElement": typeof TupleElement
};
const __defaultExports: __defaultExports = {
  "AccessKind": AccessKind,
  "AccessPolicyAction": AccessPolicyAction,
  "Cardinality": Cardinality,
  "OperatorKind": OperatorKind,
  "ParameterKind": ParameterKind,
  "SourceDeleteAction": SourceDeleteAction,
  "TargetDeleteAction": TargetDeleteAction,
  "TypeModifier": TypeModifier,
  "Volatility": Volatility,
  "Object": Object_0a6a291406d111eda0df6137d5eed8c1,
  "SubclassableObject": SubclassableObject,
  "InheritingObject": InheritingObject,
  "AnnotationSubject": AnnotationSubject,
  "AccessPolicy": AccessPolicy,
  "Alias": Alias,
  "Annotation": Annotation,
  "Type": Type,
  "PrimitiveType": PrimitiveType,
  "CollectionType": CollectionType,
  "Array": Array,
  "CallableObject": CallableObject,
  "VolatilitySubject": VolatilitySubject,
  "Cast": Cast,
  "ConsistencySubject": ConsistencySubject,
  "Constraint": Constraint,
  "Delta": Delta,
  "Extension": Extension,
  "Function": Function,
  "Global": Global,
  "Index": Index,
  "Pointer": Pointer,
  "Source": Source,
  "Link": Link,
  "Migration": Migration,
  "Module": Module,
  "ObjectType": ObjectType,
  "Operator": Operator,
  "Parameter": Parameter,
  "Property": Property,
  "PseudoType": PseudoType,
  "Range": Range,
  "ScalarType": ScalarType,
  "Tuple": Tuple,
  "TupleElement": TupleElement
};
export default __defaultExports;
