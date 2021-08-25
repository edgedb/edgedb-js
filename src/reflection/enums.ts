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
  function = "function",
}

export enum ExpressionKind {
  Set = "Set",
  PathNode = "PathNode",
  PathLeaf = "PathLeaf",
  Literal = "Literal",
  Cast = "Cast",
  Select = "Select",
  Update = "Update",
  Delete = "Delete",
  Insert = "Insert",
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
}

export enum SelectModifierKind {
  filter = "filter",
  order_by = "order_by",
  offset = "offset",
  limit = "limit",
}
