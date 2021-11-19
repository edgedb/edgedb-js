export enum Cardinality {
  AtMostOne = "AtMostOne",
  One = "One",
  Many = "Many",
  AtLeastOne = "AtLeastOne",
  Empty = "Empty",
}

export enum TypeKind {
  scalar = "scalar",
  enum = "enum",
  object = "object",
  namedtuple = "namedtuple",
  tuple = "tuple",
  array = "array",
}

export enum ExpressionKind {
  Set = "Set",
  Array = "Array",
  Tuple = "Tuple",
  NamedTuple = "NamedTuple",
  PathNode = "PathNode",
  PathLeaf = "PathLeaf",
  Literal = "Literal",
  Cast = "Cast",
  Select = "Select",
  Update = "Update",
  Delete = "Delete",
  Insert = "Insert",
  InsertUnlessConflict = "InsertUnlessConflict",
  Function = "Function",
  Operator = "Operator",
  For = "For",
  ForVar = "ForVar",
  TypeIntersection = "TypeIntersection",
  Alias = "Alias",
  With = "With",
  WithParams = "WithParams",
  Param = "Param",
  OptionalParam = "OptionalParam",
  Detached = "Detached",
  PolyShapeElement = "PolyShapeElement",
}

export enum SelectModifierKind {
  filter = "filter",
  order_by = "order_by",
  offset = "offset",
  limit = "limit",
}

export enum OperatorKind {
  Infix = "Infix",
  Postfix = "Postfix",
  Prefix = "Prefix",
  Ternary = "Ternary",
}
