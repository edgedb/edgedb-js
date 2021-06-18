import type * as stdTypes from "./std";
import type * as scalarBase from "../scalarBase";
import {reflection as $} from "edgedb";
import type * as schemaTypes from "../modules/schema";
import type * as sysTypes from "./sys";
import {spec as __spec__} from "../__spec__";

export enum CardinalityEnum {
  One = "One",
  Many = "Many",
}
export type Cardinality = typeof CardinalityEnum & stdTypes.Anyenum<CardinalityEnum, "schema::Cardinality", ["One", "Many"]>;
export const Cardinality: Cardinality = {...CardinalityEnum, __values: ["One", "Many"]} as any;

export enum OperatorKindEnum {
  Infix = "Infix",
  Postfix = "Postfix",
  Prefix = "Prefix",
  Ternary = "Ternary",
}
export type OperatorKind = typeof OperatorKindEnum & stdTypes.Anyenum<OperatorKindEnum, "schema::OperatorKind", ["Infix", "Postfix", "Prefix", "Ternary"]>;
export const OperatorKind: OperatorKind = {...OperatorKindEnum, __values: ["Infix", "Postfix", "Prefix", "Ternary"]} as any;

export enum ParameterKindEnum {
  VariadicParam = "VariadicParam",
  NamedOnlyParam = "NamedOnlyParam",
  PositionalParam = "PositionalParam",
}
export type ParameterKind = typeof ParameterKindEnum & stdTypes.Anyenum<ParameterKindEnum, "schema::ParameterKind", ["VariadicParam", "NamedOnlyParam", "PositionalParam"]>;
export const ParameterKind: ParameterKind = {...ParameterKindEnum, __values: ["VariadicParam", "NamedOnlyParam", "PositionalParam"]} as any;

export enum TargetDeleteActionEnum {
  Restrict = "Restrict",
  DeleteSource = "DeleteSource",
  Allow = "Allow",
  DeferredRestrict = "DeferredRestrict",
}
export type TargetDeleteAction = typeof TargetDeleteActionEnum & stdTypes.Anyenum<TargetDeleteActionEnum, "schema::TargetDeleteAction", ["Restrict", "DeleteSource", "Allow", "DeferredRestrict"]>;
export const TargetDeleteAction: TargetDeleteAction = {...TargetDeleteActionEnum, __values: ["Restrict", "DeleteSource", "Allow", "DeferredRestrict"]} as any;

export enum TypeModifierEnum {
  SetOfType = "SetOfType",
  OptionalType = "OptionalType",
  SingletonType = "SingletonType",
}
export type TypeModifier = typeof TypeModifierEnum & stdTypes.Anyenum<TypeModifierEnum, "schema::TypeModifier", ["SetOfType", "OptionalType", "SingletonType"]>;
export const TypeModifier: TypeModifier = {...TypeModifierEnum, __values: ["SetOfType", "OptionalType", "SingletonType"]} as any;

export enum VolatilityEnum {
  Immutable = "Immutable",
  Stable = "Stable",
  Volatile = "Volatile",
}
export type Volatility = typeof VolatilityEnum & stdTypes.Anyenum<VolatilityEnum, "schema::Volatility", ["Immutable", "Stable", "Volatile"]>;
export const Volatility: Volatility = {...VolatilityEnum, __values: ["Immutable", "Stable", "Volatile"]} as any;

export interface Object extends stdTypes.BaseObject {
  name: $.PropertyDesc<string, $.Cardinality.One>;
  internal: $.PropertyDesc<boolean, $.Cardinality.One>;
  builtin: $.PropertyDesc<boolean, $.Cardinality.One>;
  computed_fields: $.PropertyDesc<string[], $.Cardinality.AtMostOne>;
}

export interface AnnotationSubject extends Object {
  annotations: $.LinkDesc<Annotation, $.Cardinality.Many>;
}

export interface Alias extends AnnotationSubject {
  expr: $.PropertyDesc<string, $.Cardinality.One>;
  type: $.LinkDesc<Type, $.Cardinality.One>;
}

export interface SubclassableObject extends Object {
  abstract: $.PropertyDesc<boolean, $.Cardinality.AtMostOne>;
  is_abstract: $.PropertyDesc<boolean, $.Cardinality.AtMostOne>;
  final: $.PropertyDesc<boolean, $.Cardinality.AtMostOne>;
  is_final: $.PropertyDesc<boolean, $.Cardinality.AtMostOne>;
}

export interface InheritingObject extends SubclassableObject {
  bases: $.LinkDesc<InheritingObject, $.Cardinality.Many>;
  ancestors: $.LinkDesc<InheritingObject, $.Cardinality.Many>;
  inherited_fields: $.PropertyDesc<string[], $.Cardinality.AtMostOne>;
}

export interface Annotation extends Object, InheritingObject {
  inheritable: $.PropertyDesc<boolean, $.Cardinality.AtMostOne>;
}

export interface Type extends SubclassableObject, AnnotationSubject {
  expr: $.PropertyDesc<string, $.Cardinality.AtMostOne>;
  from_alias: $.PropertyDesc<boolean, $.Cardinality.One>;
  is_from_alias: $.PropertyDesc<boolean, $.Cardinality.One>;
}

export interface CollectionType extends Type {
}

export interface Array extends CollectionType {
  element_type: $.LinkDesc<Type, $.Cardinality.One>;
  dimensions: $.PropertyDesc<number[], $.Cardinality.AtMostOne>;
}

export interface CallableObject extends AnnotationSubject {
  params: $.LinkDesc<Parameter, $.Cardinality.Many>;
  return_type: $.LinkDesc<Type, $.Cardinality.AtMostOne>;
  return_typemod: $.PropertyDesc<schemaTypes.TypeModifier, $.Cardinality.AtMostOne>;
}

export interface VolatilitySubject extends Object {
  volatility: $.PropertyDesc<schemaTypes.Volatility, $.Cardinality.AtMostOne>;
}

export interface Cast extends AnnotationSubject, VolatilitySubject {
  from_type: $.LinkDesc<Type, $.Cardinality.AtMostOne>;
  to_type: $.LinkDesc<Type, $.Cardinality.AtMostOne>;
  allow_implicit: $.PropertyDesc<boolean, $.Cardinality.AtMostOne>;
  allow_assignment: $.PropertyDesc<boolean, $.Cardinality.AtMostOne>;
}

export interface ConsistencySubject extends Object, InheritingObject, AnnotationSubject {
  constraints: $.LinkDesc<Constraint, $.Cardinality.Many>;
}

export interface Constraint extends CallableObject, InheritingObject {
  params: $.LinkDesc<Parameter, $.Cardinality.Many>;
  expr: $.PropertyDesc<string, $.Cardinality.AtMostOne>;
  subjectexpr: $.PropertyDesc<string, $.Cardinality.AtMostOne>;
  finalexpr: $.PropertyDesc<string, $.Cardinality.AtMostOne>;
  errmessage: $.PropertyDesc<string, $.Cardinality.AtMostOne>;
  delegated: $.PropertyDesc<boolean, $.Cardinality.AtMostOne>;
  subject: $.LinkDesc<ConsistencySubject, $.Cardinality.AtMostOne>;
}

export interface Delta extends Object {
  parents: $.LinkDesc<Delta, $.Cardinality.Many>;
}

export interface Extension extends AnnotationSubject, Object {
  package: $.LinkDesc<sysTypes.ExtensionPackage, $.Cardinality.One>;
}

export interface Function extends CallableObject, VolatilitySubject {
  fallback: $.PropertyDesc<boolean, $.Cardinality.AtMostOne>;
}

export interface Index extends AnnotationSubject {
  expr: $.PropertyDesc<string, $.Cardinality.AtMostOne>;
}

export interface Pointer extends InheritingObject, ConsistencySubject, AnnotationSubject {
  cardinality: $.PropertyDesc<schemaTypes.Cardinality, $.Cardinality.AtMostOne>;
  required: $.PropertyDesc<boolean, $.Cardinality.AtMostOne>;
  readonly: $.PropertyDesc<boolean, $.Cardinality.AtMostOne>;
  default: $.PropertyDesc<string, $.Cardinality.AtMostOne>;
  expr: $.PropertyDesc<string, $.Cardinality.AtMostOne>;
  source: $.LinkDesc<Source, $.Cardinality.AtMostOne>;
  target: $.LinkDesc<Type, $.Cardinality.AtMostOne>;
}

export interface Source extends Object {
  indexes: $.LinkDesc<Index, $.Cardinality.Many>;
  pointers: $.LinkDesc<Pointer, $.Cardinality.Many>;
}

export interface Link extends Pointer, Source {
  properties: $.LinkDesc<Pointer, $.Cardinality.Many>;
  on_target_delete: $.PropertyDesc<schemaTypes.TargetDeleteAction, $.Cardinality.AtMostOne>;
}

export interface Migration extends AnnotationSubject, Object {
  parents: $.LinkDesc<Migration, $.Cardinality.Many>;
  script: $.PropertyDesc<string, $.Cardinality.One>;
  message: $.PropertyDesc<string, $.Cardinality.AtMostOne>;
}

export interface Module extends Object, AnnotationSubject {
}

export interface ObjectType extends InheritingObject, ConsistencySubject, AnnotationSubject, Type, Source {
  union_of: $.LinkDesc<ObjectType, $.Cardinality.Many>;
  intersection_of: $.LinkDesc<ObjectType, $.Cardinality.Many>;
  compound_type: $.PropertyDesc<boolean, $.Cardinality.One>;
  is_compound_type: $.PropertyDesc<boolean, $.Cardinality.One>;
  links: $.LinkDesc<Link, $.Cardinality.Many>;
  properties: $.LinkDesc<Property, $.Cardinality.Many>;
}

export interface Operator extends CallableObject, VolatilitySubject {
  operator_kind: $.PropertyDesc<schemaTypes.OperatorKind, $.Cardinality.AtMostOne>;
  abstract: $.PropertyDesc<boolean, $.Cardinality.AtMostOne>;
  is_abstract: $.PropertyDesc<boolean, $.Cardinality.AtMostOne>;
}

export interface Parameter extends Object {
  type: $.LinkDesc<Type, $.Cardinality.One>;
  typemod: $.PropertyDesc<schemaTypes.TypeModifier, $.Cardinality.One>;
  kind: $.PropertyDesc<schemaTypes.ParameterKind, $.Cardinality.One>;
  num: $.PropertyDesc<number, $.Cardinality.One>;
  default: $.PropertyDesc<string, $.Cardinality.AtMostOne>;
}

export interface Property extends Pointer {
}

export interface PseudoType extends InheritingObject, Type {
}

export interface ScalarType extends InheritingObject, ConsistencySubject, AnnotationSubject, Type {
  default: $.PropertyDesc<string, $.Cardinality.AtMostOne>;
  enum_values: $.PropertyDesc<string[], $.Cardinality.AtMostOne>;
}

export interface Tuple extends CollectionType {
  element_types: $.LinkDesc<TupleElement, $.Cardinality.Many>;
}

export interface TupleElement extends stdTypes.BaseObject {
  type: $.LinkDesc<Type, $.Cardinality.One>;
  name: $.PropertyDesc<string, $.Cardinality.AtMostOne>;
}

export const Object = $.objectType<Object>(
  __spec__,
  "schema::Object",
);

export const AnnotationSubject = $.objectType<AnnotationSubject>(
  __spec__,
  "schema::AnnotationSubject",
);

export const Alias = $.objectType<Alias>(
  __spec__,
  "schema::Alias",
);

export const SubclassableObject = $.objectType<SubclassableObject>(
  __spec__,
  "schema::SubclassableObject",
);

export const InheritingObject = $.objectType<InheritingObject>(
  __spec__,
  "schema::InheritingObject",
);

export const Annotation = $.objectType<Annotation>(
  __spec__,
  "schema::Annotation",
);

export const Type = $.objectType<Type>(
  __spec__,
  "schema::Type",
);

export const CollectionType = $.objectType<CollectionType>(
  __spec__,
  "schema::CollectionType",
);

export const Array = $.objectType<Array>(
  __spec__,
  "schema::Array",
);

export const CallableObject = $.objectType<CallableObject>(
  __spec__,
  "schema::CallableObject",
);

export const VolatilitySubject = $.objectType<VolatilitySubject>(
  __spec__,
  "schema::VolatilitySubject",
);

export const Cast = $.objectType<Cast>(
  __spec__,
  "schema::Cast",
);

export const ConsistencySubject = $.objectType<ConsistencySubject>(
  __spec__,
  "schema::ConsistencySubject",
);

export const Constraint = $.objectType<Constraint>(
  __spec__,
  "schema::Constraint",
);

export const Delta = $.objectType<Delta>(
  __spec__,
  "schema::Delta",
);

export const Extension = $.objectType<Extension>(
  __spec__,
  "schema::Extension",
);

export const Function = $.objectType<Function>(
  __spec__,
  "schema::Function",
);

export const Index = $.objectType<Index>(
  __spec__,
  "schema::Index",
);

export const Pointer = $.objectType<Pointer>(
  __spec__,
  "schema::Pointer",
);

export const Source = $.objectType<Source>(
  __spec__,
  "schema::Source",
);

export const Link = $.objectType<Link>(
  __spec__,
  "schema::Link",
);

export const Migration = $.objectType<Migration>(
  __spec__,
  "schema::Migration",
);

export const Module = $.objectType<Module>(
  __spec__,
  "schema::Module",
);

export const ObjectType = $.objectType<ObjectType>(
  __spec__,
  "schema::ObjectType",
);

export const Operator = $.objectType<Operator>(
  __spec__,
  "schema::Operator",
);

export const Parameter = $.objectType<Parameter>(
  __spec__,
  "schema::Parameter",
);

export const Property = $.objectType<Property>(
  __spec__,
  "schema::Property",
);

export const PseudoType = $.objectType<PseudoType>(
  __spec__,
  "schema::PseudoType",
);

export const ScalarType = $.objectType<ScalarType>(
  __spec__,
  "schema::ScalarType",
);

export const Tuple = $.objectType<Tuple>(
  __spec__,
  "schema::Tuple",
);

export const TupleElement = $.objectType<TupleElement>(
  __spec__,
  "schema::TupleElement",
);
