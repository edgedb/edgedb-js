import type * as stdTypes from "./std";
import type * as scalarBase from "../scalarBase";
import * as edgedb from "edgedb";

const LOCAL_DATE_SYMBOL: unique symbol = Symbol("cal::local_date");
export interface LocalDate extends stdTypes.Anyscalar, scalarBase.Materialtype<edgedb.LocalDate, "cal::local_date", never, never, never> {
  [LOCAL_DATE_SYMBOL]: true;
}
export const LocalDate: LocalDate = {
  __name: "cal::local_date",
} as any;

const LOCAL_DATETIME_SYMBOL: unique symbol = Symbol("cal::local_datetime");
export interface LocalDatetime extends stdTypes.Anyscalar, scalarBase.Materialtype<edgedb.LocalDateTime, "cal::local_datetime", never, never, never> {
  [LOCAL_DATETIME_SYMBOL]: true;
}
export const LocalDatetime: LocalDatetime = {
  __name: "cal::local_datetime",
} as any;

const LOCAL_TIME_SYMBOL: unique symbol = Symbol("cal::local_time");
export interface LocalTime extends stdTypes.Anyscalar, scalarBase.Materialtype<edgedb.LocalTime, "cal::local_time", never, never, never> {
  [LOCAL_TIME_SYMBOL]: true;
}
export const LocalTime: LocalTime = {
  __name: "cal::local_time",
} as any;

const RELATIVE_DURATION_SYMBOL: unique symbol = Symbol("cal::relative_duration");
export interface RelativeDuration extends stdTypes.Anyscalar, scalarBase.Materialtype<unknown, "cal::relative_duration", never, never, never> {
  [RELATIVE_DURATION_SYMBOL]: true;
}
export const RelativeDuration: RelativeDuration = {
  __name: "cal::relative_duration",
} as any;
