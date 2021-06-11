import {reflection as $} from "edgedb";
import {spec as __spec__} from "../__spec__";
import type * as __types__ from "../__types__/schema";

export enum Cardinality {
  One = "One",
  Many = "Many",
}

export enum OperatorKind {
  Infix = "Infix",
  Postfix = "Postfix",
  Prefix = "Prefix",
  Ternary = "Ternary",
}

export enum ParameterKind {
  VariadicParam = "VariadicParam",
  NamedOnlyParam = "NamedOnlyParam",
  PositionalParam = "PositionalParam",
}

export enum TargetDeleteAction {
  Restrict = "Restrict",
  DeleteSource = "DeleteSource",
  Allow = "Allow",
  DeferredRestrict = "DeferredRestrict",
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

export const Object = $.objectType<__types__.Object>(
  __spec__,
  "schema::Object",
);

export const AnnotationSubject = $.objectType<__types__.AnnotationSubject>(
  __spec__,
  "schema::AnnotationSubject",
);

export const Alias = $.objectType<__types__.Alias>(
  __spec__,
  "schema::Alias",
);

export const SubclassableObject = $.objectType<__types__.SubclassableObject>(
  __spec__,
  "schema::SubclassableObject",
);

export const InheritingObject = $.objectType<__types__.InheritingObject>(
  __spec__,
  "schema::InheritingObject",
);

export const Annotation = $.objectType<__types__.Annotation>(
  __spec__,
  "schema::Annotation",
);

export const Type = $.objectType<__types__.Type>(
  __spec__,
  "schema::Type",
);

export const CollectionType = $.objectType<__types__.CollectionType>(
  __spec__,
  "schema::CollectionType",
);

export const Array = $.objectType<__types__.Array>(
  __spec__,
  "schema::Array",
);

export const CallableObject = $.objectType<__types__.CallableObject>(
  __spec__,
  "schema::CallableObject",
);

export const VolatilitySubject = $.objectType<__types__.VolatilitySubject>(
  __spec__,
  "schema::VolatilitySubject",
);

export const Cast = $.objectType<__types__.Cast>(
  __spec__,
  "schema::Cast",
);

export const ConsistencySubject = $.objectType<__types__.ConsistencySubject>(
  __spec__,
  "schema::ConsistencySubject",
);

export const Constraint = $.objectType<__types__.Constraint>(
  __spec__,
  "schema::Constraint",
);

export const Delta = $.objectType<__types__.Delta>(
  __spec__,
  "schema::Delta",
);

export const Extension = $.objectType<__types__.Extension>(
  __spec__,
  "schema::Extension",
);

export const Function = $.objectType<__types__.Function>(
  __spec__,
  "schema::Function",
);

export const Index = $.objectType<__types__.Index>(
  __spec__,
  "schema::Index",
);

export const Pointer = $.objectType<__types__.Pointer>(
  __spec__,
  "schema::Pointer",
);

export const Source = $.objectType<__types__.Source>(
  __spec__,
  "schema::Source",
);

export const Link = $.objectType<__types__.Link>(
  __spec__,
  "schema::Link",
);

export const Migration = $.objectType<__types__.Migration>(
  __spec__,
  "schema::Migration",
);

export const Module = $.objectType<__types__.Module>(
  __spec__,
  "schema::Module",
);

export const ObjectType = $.objectType<__types__.ObjectType>(
  __spec__,
  "schema::ObjectType",
);

export const Operator = $.objectType<__types__.Operator>(
  __spec__,
  "schema::Operator",
);

export const Parameter = $.objectType<__types__.Parameter>(
  __spec__,
  "schema::Parameter",
);

export const Property = $.objectType<__types__.Property>(
  __spec__,
  "schema::Property",
);

export const PseudoType = $.objectType<__types__.PseudoType>(
  __spec__,
  "schema::PseudoType",
);

export const ScalarType = $.objectType<__types__.ScalarType>(
  __spec__,
  "schema::ScalarType",
);

export const Tuple = $.objectType<__types__.Tuple>(
  __spec__,
  "schema::Tuple",
);

export const TupleElement = $.objectType<__types__.TupleElement>(
  __spec__,
  "schema::TupleElement",
);
