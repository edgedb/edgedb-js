import type * as stdTypes from "./std";
import type * as calTypes from "./cal";
import type * as defaultTypes from "./default";

export type getSharedParentScalar<A, B> = 
  A extends stdTypes.Uuid ? 
    B extends stdTypes.Uuid ? 
    B
    :
    never
  :
  A extends stdTypes.Str ? 
    B extends stdTypes.Str ? 
    B
    :
    never
  :
  A extends stdTypes.Json ? 
    B extends stdTypes.Json ? 
    B
    :
    never
  :
  A extends stdTypes.Int64 ? 
    B extends stdTypes.Int64 ? 
    B
    :
    never
  :
  A extends stdTypes.Int32 ? 
    B extends stdTypes.Int32 ? 
    B
    :
    never
  :
  A extends stdTypes.Int16 ? 
    B extends stdTypes.Int16 ? 
    B
    :
    never
  :
  A extends stdTypes.Float64 ? 
    B extends stdTypes.Float64 ? 
    B
    :
    never
  :
  A extends stdTypes.Float32 ? 
    B extends stdTypes.Float32 ? 
    B
    :
    never
  :
  A extends stdTypes.Duration ? 
    B extends stdTypes.Duration ? 
    B
    :
    never
  :
  A extends stdTypes.Decimal ? 
    B extends stdTypes.Decimal ? 
    B
    :
    never
  :
  A extends stdTypes.Datetime ? 
    B extends stdTypes.Datetime ? 
    B
    :
    never
  :
  A extends stdTypes.Bytes ? 
    B extends stdTypes.Bytes ? 
    B
    :
    never
  :
  A extends stdTypes.Bool ? 
    B extends stdTypes.Bool ? 
    B
    :
    never
  :
  A extends stdTypes.Bigint ? 
    B extends stdTypes.Bigint ? 
    B
    :
    never
  :
  A extends calTypes.RelativeDuration ? 
    B extends calTypes.RelativeDuration ? 
    B
    :
    never
  :
  A extends calTypes.LocalTime ? 
    B extends calTypes.LocalTime ? 
    B
    :
    never
  :
  A extends calTypes.LocalDatetime ? 
    B extends calTypes.LocalDatetime ? 
    B
    :
    never
  :
  A extends calTypes.LocalDate ? 
    B extends calTypes.LocalDate ? 
    B
    :
    never
  :
  never

export type getSharedParentObject<A extends stdTypes.Object, B extends stdTypes.Object> = 
  A extends defaultTypes.Villain ? 
    B extends defaultTypes.Villain ? 
    B
    :
    B extends defaultTypes.Hero ? 
    defaultTypes.Person
    :
    B extends defaultTypes.Person ? 
    B
    :
    B extends stdTypes.Object ? 
    B
    :
    stdTypes.Object
  :
  A extends defaultTypes.Movie ? 
    B extends defaultTypes.Movie ? 
    B
    :
    B extends stdTypes.Object ? 
    B
    :
    stdTypes.Object
  :
  A extends defaultTypes.Hero ? 
    B extends defaultTypes.Villain ? 
    defaultTypes.Person
    :
    B extends defaultTypes.Hero ? 
    B
    :
    B extends defaultTypes.Person ? 
    B
    :
    B extends stdTypes.Object ? 
    B
    :
    stdTypes.Object
  :
  A extends defaultTypes.Person ? 
    B extends defaultTypes.Villain ? 
    A
    :
    B extends defaultTypes.Hero ? 
    A
    :
    B extends defaultTypes.Person ? 
    B
    :
    B extends stdTypes.Object ? 
    B
    :
    stdTypes.Object
  :
  A extends defaultTypes.Bag ? 
    B extends defaultTypes.Bag ? 
    B
    :
    B extends stdTypes.Object ? 
    B
    :
    stdTypes.Object
  :
  A extends stdTypes.Object ? 
    B extends defaultTypes.Villain ? 
    A
    :
    B extends defaultTypes.Movie ? 
    A
    :
    B extends defaultTypes.Hero ? 
    A
    :
    B extends defaultTypes.Person ? 
    A
    :
    B extends defaultTypes.Bag ? 
    A
    :
    B extends stdTypes.Object ? 
    B
    :
    stdTypes.Object
  :
  stdTypes.Object
