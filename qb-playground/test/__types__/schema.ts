import {reflection as $} from "edgedb";
import type * as stdTypes from "./std";
import type * as schemaEnums from "../modules/schema";
import type * as sysTypes from "./sys";

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
  return_typemod: $.PropertyDesc<schemaEnums.TypeModifier, $.Cardinality.AtMostOne>;
}

export interface VolatilitySubject extends Object {
  volatility: $.PropertyDesc<schemaEnums.Volatility, $.Cardinality.AtMostOne>;
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
  cardinality: $.PropertyDesc<schemaEnums.Cardinality, $.Cardinality.AtMostOne>;
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
  on_target_delete: $.PropertyDesc<schemaEnums.TargetDeleteAction, $.Cardinality.AtMostOne>;
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
  operator_kind: $.PropertyDesc<schemaEnums.OperatorKind, $.Cardinality.AtMostOne>;
  abstract: $.PropertyDesc<boolean, $.Cardinality.AtMostOne>;
  is_abstract: $.PropertyDesc<boolean, $.Cardinality.AtMostOne>;
}

export interface Parameter extends Object {
  type: $.LinkDesc<Type, $.Cardinality.One>;
  typemod: $.PropertyDesc<schemaEnums.TypeModifier, $.Cardinality.One>;
  kind: $.PropertyDesc<schemaEnums.ParameterKind, $.Cardinality.One>;
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
