import {reflection as $} from "edgedb";

export const spec: $.TypesSpec = new $.StrictMap();

spec.set("std::BaseObject", {
  name: "std::BaseObject",
  bases: [],
  ancestors: [],
  properties: [
    {
      name: "id",
      cardinality: $.Cardinality.One,
    },
  ],
  links: [
    {
      name: "__type__",
      cardinality: $.Cardinality.One,
      target: "schema::Type",
      properties: [
      ],
    },
  ],
});

spec.set("cfg::ConfigObject", {
  name: "cfg::ConfigObject",
  bases: ["std::BaseObject"],
  ancestors: ["std::BaseObject"],
  properties: [
  ],
  links: [
  ],
});

spec.set("cfg::AbstractConfig", {
  name: "cfg::AbstractConfig",
  bases: ["cfg::ConfigObject"],
  ancestors: ["cfg::ConfigObject","std::BaseObject"],
  properties: [
    {
      name: "listen_port",
      cardinality: $.Cardinality.One,
    },
    {
      name: "listen_addresses",
      cardinality: $.Cardinality.Many,
    },
    {
      name: "allow_dml_in_functions",
      cardinality: $.Cardinality.AtMostOne,
    },
    {
      name: "shared_buffers",
      cardinality: $.Cardinality.AtMostOne,
    },
    {
      name: "query_work_mem",
      cardinality: $.Cardinality.AtMostOne,
    },
    {
      name: "effective_cache_size",
      cardinality: $.Cardinality.AtMostOne,
    },
    {
      name: "effective_io_concurrency",
      cardinality: $.Cardinality.AtMostOne,
    },
    {
      name: "default_statistics_target",
      cardinality: $.Cardinality.AtMostOne,
    },
  ],
  links: [
    {
      name: "auth",
      cardinality: $.Cardinality.Many,
      target: "cfg::Auth",
      properties: [
      ],
    },
  ],
});

spec.set("cfg::Auth", {
  name: "cfg::Auth",
  bases: ["cfg::ConfigObject"],
  ancestors: ["cfg::ConfigObject","std::BaseObject"],
  properties: [
    {
      name: "priority",
      cardinality: $.Cardinality.One,
    },
    {
      name: "user",
      cardinality: $.Cardinality.Many,
    },
    {
      name: "comment",
      cardinality: $.Cardinality.AtMostOne,
    },
  ],
  links: [
    {
      name: "method",
      cardinality: $.Cardinality.AtMostOne,
      target: "cfg::AuthMethod",
      properties: [
      ],
    },
  ],
});

spec.set("cfg::AuthMethod", {
  name: "cfg::AuthMethod",
  bases: ["cfg::ConfigObject"],
  ancestors: ["cfg::ConfigObject","std::BaseObject"],
  properties: [
  ],
  links: [
  ],
});

spec.set("cfg::Config", {
  name: "cfg::Config",
  bases: ["cfg::AbstractConfig"],
  ancestors: ["cfg::AbstractConfig","cfg::ConfigObject","std::BaseObject"],
  properties: [
  ],
  links: [
  ],
});

spec.set("cfg::DatabaseConfig", {
  name: "cfg::DatabaseConfig",
  bases: ["cfg::AbstractConfig"],
  ancestors: ["cfg::AbstractConfig","cfg::ConfigObject","std::BaseObject"],
  properties: [
  ],
  links: [
  ],
});

spec.set("cfg::SCRAM", {
  name: "cfg::SCRAM",
  bases: ["cfg::AuthMethod"],
  ancestors: ["cfg::AuthMethod","cfg::ConfigObject","std::BaseObject"],
  properties: [
  ],
  links: [
  ],
});

spec.set("cfg::SystemConfig", {
  name: "cfg::SystemConfig",
  bases: ["cfg::AbstractConfig"],
  ancestors: ["cfg::AbstractConfig","cfg::ConfigObject","std::BaseObject"],
  properties: [
  ],
  links: [
  ],
});

spec.set("cfg::Trust", {
  name: "cfg::Trust",
  bases: ["cfg::AuthMethod"],
  ancestors: ["cfg::AuthMethod","cfg::ConfigObject","std::BaseObject"],
  properties: [
  ],
  links: [
  ],
});

spec.set("std::Object", {
  name: "std::Object",
  bases: ["std::BaseObject"],
  ancestors: ["std::BaseObject"],
  properties: [
  ],
  links: [
  ],
});

spec.set("default::Bag", {
  name: "default::Bag",
  bases: ["std::Object"],
  ancestors: ["std::Object","std::BaseObject"],
  properties: [
    {
      name: "bigintField",
      cardinality: $.Cardinality.AtMostOne,
    },
    {
      name: "boolField",
      cardinality: $.Cardinality.AtMostOne,
    },
    {
      name: "datetimeField",
      cardinality: $.Cardinality.AtMostOne,
    },
    {
      name: "decimalField",
      cardinality: $.Cardinality.AtMostOne,
    },
    {
      name: "durationField",
      cardinality: $.Cardinality.AtMostOne,
    },
    {
      name: "float32Field",
      cardinality: $.Cardinality.AtMostOne,
    },
    {
      name: "float64Field",
      cardinality: $.Cardinality.AtMostOne,
    },
    {
      name: "genre",
      cardinality: $.Cardinality.AtMostOne,
    },
    {
      name: "int16Field",
      cardinality: $.Cardinality.AtMostOne,
    },
    {
      name: "int32Field",
      cardinality: $.Cardinality.AtMostOne,
    },
    {
      name: "int64Field",
      cardinality: $.Cardinality.AtMostOne,
    },
    {
      name: "localDateField",
      cardinality: $.Cardinality.AtMostOne,
    },
    {
      name: "localDateTimeField",
      cardinality: $.Cardinality.AtMostOne,
    },
    {
      name: "localTimeField",
      cardinality: $.Cardinality.AtMostOne,
    },
    {
      name: "namedTuple",
      cardinality: $.Cardinality.AtMostOne,
    },
    {
      name: "secret_identity",
      cardinality: $.Cardinality.AtMostOne,
    },
    {
      name: "stringMultiArr",
      cardinality: $.Cardinality.Many,
    },
    {
      name: "stringsArr",
      cardinality: $.Cardinality.AtMostOne,
    },
    {
      name: "stringsMulti",
      cardinality: $.Cardinality.AtLeastOne,
    },
    {
      name: "unnamedTuple",
      cardinality: $.Cardinality.AtMostOne,
    },
    {
      name: "enumArr",
      cardinality: $.Cardinality.AtMostOne,
    },
  ],
  links: [
  ],
});

spec.set("default::Person", {
  name: "default::Person",
  bases: ["std::Object"],
  ancestors: ["std::Object","std::BaseObject"],
  properties: [
    {
      name: "name",
      cardinality: $.Cardinality.One,
    },
  ],
  links: [
  ],
});

spec.set("default::Hero", {
  name: "default::Hero",
  bases: ["default::Person"],
  ancestors: ["default::Person","std::Object","std::BaseObject"],
  properties: [
    {
      name: "number_of_movies",
      cardinality: $.Cardinality.AtMostOne,
    },
    {
      name: "secret_identity",
      cardinality: $.Cardinality.AtMostOne,
    },
  ],
  links: [
    {
      name: "villains",
      cardinality: $.Cardinality.Many,
      target: "default::Villain",
      properties: [
      ],
    },
  ],
});

spec.set("default::Movie", {
  name: "default::Movie",
  bases: ["std::Object"],
  ancestors: ["std::Object","std::BaseObject"],
  properties: [
    {
      name: "title",
      cardinality: $.Cardinality.One,
    },
    {
      name: "rating",
      cardinality: $.Cardinality.AtMostOne,
    },
  ],
  links: [
    {
      name: "characters",
      cardinality: $.Cardinality.Many,
      target: "default::Person",
      properties: [
      ],
    },
  ],
});

spec.set("default::Villain", {
  name: "default::Villain",
  bases: ["default::Person"],
  ancestors: ["default::Person","std::Object","std::BaseObject"],
  properties: [
  ],
  links: [
    {
      name: "nemesis",
      cardinality: $.Cardinality.AtMostOne,
      target: "default::Hero",
      properties: [
      ],
    },
  ],
});

spec.set("schema::Object", {
  name: "schema::Object",
  bases: ["std::BaseObject"],
  ancestors: ["std::BaseObject"],
  properties: [
    {
      name: "name",
      cardinality: $.Cardinality.One,
    },
    {
      name: "internal",
      cardinality: $.Cardinality.One,
    },
    {
      name: "builtin",
      cardinality: $.Cardinality.One,
    },
    {
      name: "computed_fields",
      cardinality: $.Cardinality.AtMostOne,
    },
  ],
  links: [
  ],
});

spec.set("schema::AnnotationSubject", {
  name: "schema::AnnotationSubject",
  bases: ["schema::Object"],
  ancestors: ["schema::Object","std::BaseObject"],
  properties: [
  ],
  links: [
    {
      name: "annotations",
      cardinality: $.Cardinality.Many,
      target: "schema::Annotation",
      properties: [
      {
        name: "value",
        cardinality: $.Cardinality.Many,
      },
      ],
    },
  ],
});

spec.set("schema::Alias", {
  name: "schema::Alias",
  bases: ["schema::AnnotationSubject"],
  ancestors: ["schema::AnnotationSubject","schema::Object","std::BaseObject"],
  properties: [
    {
      name: "expr",
      cardinality: $.Cardinality.One,
    },
  ],
  links: [
    {
      name: "type",
      cardinality: $.Cardinality.One,
      target: "schema::Type",
      properties: [
      ],
    },
  ],
});

spec.set("schema::SubclassableObject", {
  name: "schema::SubclassableObject",
  bases: ["schema::Object"],
  ancestors: ["schema::Object","std::BaseObject"],
  properties: [
    {
      name: "abstract",
      cardinality: $.Cardinality.AtMostOne,
    },
    {
      name: "is_abstract",
      cardinality: $.Cardinality.AtMostOne,
    },
    {
      name: "final",
      cardinality: $.Cardinality.AtMostOne,
    },
    {
      name: "is_final",
      cardinality: $.Cardinality.AtMostOne,
    },
  ],
  links: [
  ],
});

spec.set("schema::InheritingObject", {
  name: "schema::InheritingObject",
  bases: ["schema::SubclassableObject"],
  ancestors: ["schema::SubclassableObject","schema::Object","std::BaseObject"],
  properties: [
    {
      name: "inherited_fields",
      cardinality: $.Cardinality.AtMostOne,
    },
  ],
  links: [
    {
      name: "bases",
      cardinality: $.Cardinality.Many,
      target: "schema::InheritingObject",
      properties: [
      ],
    },
    {
      name: "ancestors",
      cardinality: $.Cardinality.Many,
      target: "schema::InheritingObject",
      properties: [
      ],
    },
  ],
});

spec.set("schema::Annotation", {
  name: "schema::Annotation",
  bases: ["schema::Object","schema::InheritingObject"],
  ancestors: ["schema::InheritingObject","schema::SubclassableObject","schema::Object","std::BaseObject"],
  properties: [
    {
      name: "inheritable",
      cardinality: $.Cardinality.AtMostOne,
    },
  ],
  links: [
  ],
});

spec.set("schema::Type", {
  name: "schema::Type",
  bases: ["schema::SubclassableObject","schema::AnnotationSubject"],
  ancestors: ["schema::SubclassableObject","schema::AnnotationSubject","schema::Object","std::BaseObject"],
  properties: [
    {
      name: "expr",
      cardinality: $.Cardinality.AtMostOne,
    },
    {
      name: "from_alias",
      cardinality: $.Cardinality.One,
    },
    {
      name: "is_from_alias",
      cardinality: $.Cardinality.One,
    },
  ],
  links: [
  ],
});

spec.set("schema::CollectionType", {
  name: "schema::CollectionType",
  bases: ["schema::Type"],
  ancestors: ["schema::Type","schema::SubclassableObject","schema::AnnotationSubject","schema::Object","std::BaseObject"],
  properties: [
  ],
  links: [
  ],
});

spec.set("schema::Array", {
  name: "schema::Array",
  bases: ["schema::CollectionType"],
  ancestors: ["schema::CollectionType","schema::Type","schema::SubclassableObject","schema::AnnotationSubject","schema::Object","std::BaseObject"],
  properties: [
    {
      name: "dimensions",
      cardinality: $.Cardinality.AtMostOne,
    },
  ],
  links: [
    {
      name: "element_type",
      cardinality: $.Cardinality.One,
      target: "schema::Type",
      properties: [
      ],
    },
  ],
});

spec.set("schema::CallableObject", {
  name: "schema::CallableObject",
  bases: ["schema::AnnotationSubject"],
  ancestors: ["schema::AnnotationSubject","schema::Object","std::BaseObject"],
  properties: [
    {
      name: "return_typemod",
      cardinality: $.Cardinality.AtMostOne,
    },
  ],
  links: [
    {
      name: "params",
      cardinality: $.Cardinality.Many,
      target: "schema::Parameter",
      properties: [
      ],
    },
    {
      name: "return_type",
      cardinality: $.Cardinality.AtMostOne,
      target: "schema::Type",
      properties: [
      ],
    },
  ],
});

spec.set("schema::VolatilitySubject", {
  name: "schema::VolatilitySubject",
  bases: ["schema::Object"],
  ancestors: ["schema::Object","std::BaseObject"],
  properties: [
    {
      name: "volatility",
      cardinality: $.Cardinality.AtMostOne,
    },
  ],
  links: [
  ],
});

spec.set("schema::Cast", {
  name: "schema::Cast",
  bases: ["schema::AnnotationSubject","schema::VolatilitySubject"],
  ancestors: ["schema::AnnotationSubject","schema::VolatilitySubject","schema::Object","std::BaseObject"],
  properties: [
    {
      name: "allow_implicit",
      cardinality: $.Cardinality.AtMostOne,
    },
    {
      name: "allow_assignment",
      cardinality: $.Cardinality.AtMostOne,
    },
  ],
  links: [
    {
      name: "from_type",
      cardinality: $.Cardinality.AtMostOne,
      target: "schema::Type",
      properties: [
      ],
    },
    {
      name: "to_type",
      cardinality: $.Cardinality.AtMostOne,
      target: "schema::Type",
      properties: [
      ],
    },
  ],
});

spec.set("schema::ConsistencySubject", {
  name: "schema::ConsistencySubject",
  bases: ["schema::Object","schema::InheritingObject","schema::AnnotationSubject"],
  ancestors: ["schema::InheritingObject","schema::SubclassableObject","schema::AnnotationSubject","schema::Object","std::BaseObject"],
  properties: [
  ],
  links: [
    {
      name: "constraints",
      cardinality: $.Cardinality.Many,
      target: "schema::Constraint",
      properties: [
      ],
    },
  ],
});

spec.set("schema::Constraint", {
  name: "schema::Constraint",
  bases: ["schema::CallableObject","schema::InheritingObject"],
  ancestors: ["schema::CallableObject","schema::InheritingObject","schema::SubclassableObject","schema::AnnotationSubject","schema::Object","std::BaseObject"],
  properties: [
    {
      name: "expr",
      cardinality: $.Cardinality.AtMostOne,
    },
    {
      name: "subjectexpr",
      cardinality: $.Cardinality.AtMostOne,
    },
    {
      name: "finalexpr",
      cardinality: $.Cardinality.AtMostOne,
    },
    {
      name: "errmessage",
      cardinality: $.Cardinality.AtMostOne,
    },
    {
      name: "delegated",
      cardinality: $.Cardinality.AtMostOne,
    },
  ],
  links: [
    {
      name: "params",
      cardinality: $.Cardinality.Many,
      target: "schema::Parameter",
      properties: [
      {
        name: "value",
        cardinality: $.Cardinality.Many,
      },
      ],
    },
    {
      name: "subject",
      cardinality: $.Cardinality.AtMostOne,
      target: "schema::ConsistencySubject",
      properties: [
      ],
    },
  ],
});

spec.set("schema::Delta", {
  name: "schema::Delta",
  bases: ["schema::Object"],
  ancestors: ["schema::Object","std::BaseObject"],
  properties: [
  ],
  links: [
    {
      name: "parents",
      cardinality: $.Cardinality.Many,
      target: "schema::Delta",
      properties: [
      ],
    },
  ],
});

spec.set("schema::Extension", {
  name: "schema::Extension",
  bases: ["schema::AnnotationSubject","schema::Object"],
  ancestors: ["schema::AnnotationSubject","schema::Object","std::BaseObject"],
  properties: [
  ],
  links: [
    {
      name: "package",
      cardinality: $.Cardinality.One,
      target: "sys::ExtensionPackage",
      properties: [
      ],
    },
  ],
});

spec.set("schema::Function", {
  name: "schema::Function",
  bases: ["schema::CallableObject","schema::VolatilitySubject"],
  ancestors: ["schema::CallableObject","schema::AnnotationSubject","schema::VolatilitySubject","schema::Object","std::BaseObject"],
  properties: [
    {
      name: "fallback",
      cardinality: $.Cardinality.AtMostOne,
    },
  ],
  links: [
  ],
});

spec.set("schema::Index", {
  name: "schema::Index",
  bases: ["schema::AnnotationSubject"],
  ancestors: ["schema::InheritingObject","schema::SubclassableObject","schema::AnnotationSubject","schema::Object","std::BaseObject"],
  properties: [
    {
      name: "expr",
      cardinality: $.Cardinality.AtMostOne,
    },
  ],
  links: [
  ],
});

spec.set("schema::Pointer", {
  name: "schema::Pointer",
  bases: ["schema::InheritingObject","schema::ConsistencySubject","schema::AnnotationSubject"],
  ancestors: ["schema::ConsistencySubject","schema::InheritingObject","schema::SubclassableObject","schema::AnnotationSubject","schema::Object","std::BaseObject"],
  properties: [
    {
      name: "cardinality",
      cardinality: $.Cardinality.AtMostOne,
    },
    {
      name: "required",
      cardinality: $.Cardinality.AtMostOne,
    },
    {
      name: "readonly",
      cardinality: $.Cardinality.AtMostOne,
    },
    {
      name: "default",
      cardinality: $.Cardinality.AtMostOne,
    },
    {
      name: "expr",
      cardinality: $.Cardinality.AtMostOne,
    },
  ],
  links: [
    {
      name: "source",
      cardinality: $.Cardinality.AtMostOne,
      target: "schema::Source",
      properties: [
      ],
    },
    {
      name: "target",
      cardinality: $.Cardinality.AtMostOne,
      target: "schema::Type",
      properties: [
      ],
    },
  ],
});

spec.set("schema::Source", {
  name: "schema::Source",
  bases: ["schema::Object"],
  ancestors: ["schema::InheritingObject","schema::SubclassableObject","schema::Object","std::BaseObject"],
  properties: [
  ],
  links: [
    {
      name: "indexes",
      cardinality: $.Cardinality.Many,
      target: "schema::Index",
      properties: [
      ],
    },
    {
      name: "pointers",
      cardinality: $.Cardinality.Many,
      target: "schema::Pointer",
      properties: [
      ],
    },
  ],
});

spec.set("schema::Link", {
  name: "schema::Link",
  bases: ["schema::Pointer","schema::Source"],
  ancestors: ["schema::Pointer","schema::ConsistencySubject","schema::Source","schema::InheritingObject","schema::SubclassableObject","schema::AnnotationSubject","schema::Object","std::BaseObject"],
  properties: [
    {
      name: "on_target_delete",
      cardinality: $.Cardinality.AtMostOne,
    },
  ],
  links: [
    {
      name: "properties",
      cardinality: $.Cardinality.Many,
      target: "schema::Pointer",
      properties: [
      ],
    },
  ],
});

spec.set("schema::Migration", {
  name: "schema::Migration",
  bases: ["schema::AnnotationSubject","schema::Object"],
  ancestors: ["schema::AnnotationSubject","schema::Object","std::BaseObject"],
  properties: [
    {
      name: "script",
      cardinality: $.Cardinality.One,
    },
    {
      name: "message",
      cardinality: $.Cardinality.AtMostOne,
    },
  ],
  links: [
    {
      name: "parents",
      cardinality: $.Cardinality.Many,
      target: "schema::Migration",
      properties: [
      ],
    },
  ],
});

spec.set("schema::Module", {
  name: "schema::Module",
  bases: ["schema::Object","schema::AnnotationSubject"],
  ancestors: ["schema::AnnotationSubject","schema::Object","std::BaseObject"],
  properties: [
  ],
  links: [
  ],
});

spec.set("schema::ObjectType", {
  name: "schema::ObjectType",
  bases: ["schema::InheritingObject","schema::ConsistencySubject","schema::AnnotationSubject","schema::Type","schema::Source"],
  ancestors: ["schema::ConsistencySubject","schema::Source","schema::InheritingObject","schema::Type","schema::SubclassableObject","schema::AnnotationSubject","schema::Object","std::BaseObject"],
  properties: [
    {
      name: "compound_type",
      cardinality: $.Cardinality.One,
    },
    {
      name: "is_compound_type",
      cardinality: $.Cardinality.One,
    },
  ],
  links: [
    {
      name: "union_of",
      cardinality: $.Cardinality.Many,
      target: "schema::ObjectType",
      properties: [
      ],
    },
    {
      name: "intersection_of",
      cardinality: $.Cardinality.Many,
      target: "schema::ObjectType",
      properties: [
      ],
    },
    {
      name: "links",
      cardinality: $.Cardinality.Many,
      target: "schema::Link",
      properties: [
      ],
    },
    {
      name: "properties",
      cardinality: $.Cardinality.Many,
      target: "schema::Property",
      properties: [
      ],
    },
  ],
});

spec.set("schema::Operator", {
  name: "schema::Operator",
  bases: ["schema::CallableObject","schema::VolatilitySubject"],
  ancestors: ["schema::CallableObject","schema::AnnotationSubject","schema::VolatilitySubject","schema::Object","std::BaseObject"],
  properties: [
    {
      name: "operator_kind",
      cardinality: $.Cardinality.AtMostOne,
    },
    {
      name: "abstract",
      cardinality: $.Cardinality.AtMostOne,
    },
    {
      name: "is_abstract",
      cardinality: $.Cardinality.AtMostOne,
    },
  ],
  links: [
  ],
});

spec.set("schema::Parameter", {
  name: "schema::Parameter",
  bases: ["schema::Object"],
  ancestors: ["schema::Object","std::BaseObject"],
  properties: [
    {
      name: "typemod",
      cardinality: $.Cardinality.One,
    },
    {
      name: "kind",
      cardinality: $.Cardinality.One,
    },
    {
      name: "num",
      cardinality: $.Cardinality.One,
    },
    {
      name: "default",
      cardinality: $.Cardinality.AtMostOne,
    },
  ],
  links: [
    {
      name: "type",
      cardinality: $.Cardinality.One,
      target: "schema::Type",
      properties: [
      ],
    },
  ],
});

spec.set("schema::Property", {
  name: "schema::Property",
  bases: ["schema::Pointer"],
  ancestors: ["schema::Pointer","schema::ConsistencySubject","schema::InheritingObject","schema::SubclassableObject","schema::AnnotationSubject","schema::Object","std::BaseObject"],
  properties: [
  ],
  links: [
  ],
});

spec.set("schema::PseudoType", {
  name: "schema::PseudoType",
  bases: ["schema::InheritingObject","schema::Type"],
  ancestors: ["schema::InheritingObject","schema::Type","schema::SubclassableObject","schema::AnnotationSubject","schema::Object","std::BaseObject"],
  properties: [
  ],
  links: [
  ],
});

spec.set("schema::ScalarType", {
  name: "schema::ScalarType",
  bases: ["schema::InheritingObject","schema::ConsistencySubject","schema::AnnotationSubject","schema::Type"],
  ancestors: ["schema::ConsistencySubject","schema::InheritingObject","schema::Type","schema::SubclassableObject","schema::AnnotationSubject","schema::Object","std::BaseObject"],
  properties: [
    {
      name: "default",
      cardinality: $.Cardinality.AtMostOne,
    },
    {
      name: "enum_values",
      cardinality: $.Cardinality.AtMostOne,
    },
  ],
  links: [
  ],
});

spec.set("schema::Tuple", {
  name: "schema::Tuple",
  bases: ["schema::CollectionType"],
  ancestors: ["schema::CollectionType","schema::Type","schema::SubclassableObject","schema::AnnotationSubject","schema::Object","std::BaseObject"],
  properties: [
  ],
  links: [
    {
      name: "element_types",
      cardinality: $.Cardinality.Many,
      target: "schema::TupleElement",
      properties: [
      ],
    },
  ],
});

spec.set("schema::TupleElement", {
  name: "schema::TupleElement",
  bases: ["std::BaseObject"],
  ancestors: ["std::BaseObject"],
  properties: [
    {
      name: "name",
      cardinality: $.Cardinality.AtMostOne,
    },
  ],
  links: [
    {
      name: "type",
      cardinality: $.Cardinality.One,
      target: "schema::Type",
      properties: [
      ],
    },
  ],
});

spec.set("stdgraphql::Mutation", {
  name: "stdgraphql::Mutation",
  bases: ["std::BaseObject"],
  ancestors: ["std::BaseObject"],
  properties: [
    {
      name: "__typename",
      cardinality: $.Cardinality.One,
    },
  ],
  links: [
  ],
});

spec.set("stdgraphql::Query", {
  name: "stdgraphql::Query",
  bases: ["std::BaseObject"],
  ancestors: ["std::BaseObject"],
  properties: [
    {
      name: "__typename",
      cardinality: $.Cardinality.One,
    },
  ],
  links: [
  ],
});

spec.set("sys::SystemObject", {
  name: "sys::SystemObject",
  bases: ["schema::AnnotationSubject"],
  ancestors: ["schema::AnnotationSubject","schema::Object","std::BaseObject"],
  properties: [
  ],
  links: [
  ],
});

spec.set("sys::Database", {
  name: "sys::Database",
  bases: ["sys::SystemObject","schema::AnnotationSubject"],
  ancestors: ["sys::SystemObject","schema::AnnotationSubject","schema::Object","std::BaseObject"],
  properties: [
    {
      name: "name",
      cardinality: $.Cardinality.One,
    },
  ],
  links: [
  ],
});

spec.set("sys::ExtensionPackage", {
  name: "sys::ExtensionPackage",
  bases: ["sys::SystemObject","schema::AnnotationSubject"],
  ancestors: ["sys::SystemObject","schema::AnnotationSubject","schema::Object","std::BaseObject"],
  properties: [
    {
      name: "script",
      cardinality: $.Cardinality.One,
    },
    {
      name: "version",
      cardinality: $.Cardinality.One,
    },
  ],
  links: [
  ],
});

spec.set("sys::Role", {
  name: "sys::Role",
  bases: ["sys::SystemObject","schema::InheritingObject","schema::AnnotationSubject"],
  ancestors: ["sys::SystemObject","schema::AnnotationSubject","schema::InheritingObject","schema::SubclassableObject","schema::Object","std::BaseObject"],
  properties: [
    {
      name: "name",
      cardinality: $.Cardinality.One,
    },
    {
      name: "superuser",
      cardinality: $.Cardinality.One,
    },
    {
      name: "is_superuser",
      cardinality: $.Cardinality.One,
    },
    {
      name: "password",
      cardinality: $.Cardinality.AtMostOne,
    },
  ],
  links: [
    {
      name: "member_of",
      cardinality: $.Cardinality.Many,
      target: "sys::Role",
      properties: [
      ],
    },
  ],
});
