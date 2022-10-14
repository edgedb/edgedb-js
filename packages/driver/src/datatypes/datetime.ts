/*!
 * This source file is part of the EdgeDB open source project.
 *
 * Copyright 2019-present MagicStack Inc. and the EdgeDB authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as bi from "../primitives/bigint";

import {
  daysInMonth,
  ymd2ord,
  ord2ymd,
  daysBeforeMonth,
  isLeapYear
} from "./dateutil";

export const DATE_PRIVATE = Symbol.for("edgedb.datetime");

// Converts value to number, or if value is NaN returns 0
// as defined in temporal spec:
// https://tc39.es/proposal-temporal/#sec-temporal-tointegerwithoutrounding
// Note: Split into two functions, since some places in the spec throw on
// non-integers and others use rounding
function toNumber(val: any): number {
  const n = Number(val);
  if (Number.isNaN(n)) {
    return 0;
  }
  return n;
}

function assertInteger(val: number): number {
  if (!Number.isInteger(val)) {
    throw new RangeError(`unsupported fractional value ${val}`);
  }
  return val;
}

export class LocalTime {
  private readonly _hour: number;
  private readonly _minute: number;
  private readonly _second: number;
  private readonly _millisecond: number;
  private readonly _microsecond: number;
  private readonly _nanosecond: number;

  constructor(
    isoHour: number = 0,
    isoMinute: number = 0,
    isoSecond: number = 0,
    isoMillisecond: number = 0,
    isoMicrosecond: number = 0,
    isoNanosecond: number = 0
  ) {
    isoHour = Math.floor(toNumber(isoHour));
    isoMinute = Math.floor(toNumber(isoMinute));
    isoSecond = Math.floor(toNumber(isoSecond));
    isoMillisecond = Math.floor(toNumber(isoMillisecond));
    isoMicrosecond = Math.floor(toNumber(isoMicrosecond));
    isoNanosecond = Math.floor(toNumber(isoNanosecond));

    if (isoHour < 0 || isoHour > 23) {
      throw new RangeError(
        `invalid number of hours ${isoHour}: expected a value in 0-23 range`
      );
    }
    if (isoMinute < 0 || isoMinute > 59) {
      throw new RangeError(
        `invalid number of minutes ${isoMinute}: expected a value in 0-59 range`
      );
    }
    if (isoSecond < 0 || isoSecond > 59) {
      throw new RangeError(
        `invalid number of seconds ${isoSecond}: expected a value in 0-59 range`
      );
    }
    if (isoMillisecond < 0 || isoMillisecond > 999) {
      throw new RangeError(
        `invalid number of milliseconds ${isoMillisecond}: ` +
          `expected a value in 0-999 range`
      );
    }
    if (isoMicrosecond < 0 || isoMicrosecond > 999) {
      throw new RangeError(
        `invalid number of microseconds ${isoMicrosecond}: ` +
          `expected a value in 0-999 range`
      );
    }
    if (isoNanosecond < 0 || isoNanosecond > 999) {
      throw new RangeError(
        `invalid number of nanoseconds ${isoNanosecond}: ` +
          `expected a value in 0-999 range`
      );
    }

    this._hour = isoHour;
    this._minute = isoMinute;
    this._second = isoSecond;
    this._millisecond = isoMillisecond;
    this._microsecond = isoMicrosecond;
    this._nanosecond = isoNanosecond;
  }

  get hour(): number {
    return this._hour;
  }
  get minute(): number {
    return this._minute;
  }
  get second(): number {
    return this._second;
  }
  get millisecond(): number {
    return this._millisecond;
  }
  get microsecond(): number {
    return this._microsecond;
  }
  get nanosecond(): number {
    return this._nanosecond;
  }

  toString(): string {
    const hh = this._hour.toString().padStart(2, "0");
    const mm = this._minute.toString().padStart(2, "0");
    const ss = this._second.toString().padStart(2, "0");
    let repr = `${hh}:${mm}:${ss}`;
    if (this._millisecond || this._microsecond || this._nanosecond) {
      repr += `.${this._millisecond
        .toString()
        .padStart(3, "0")}${this._microsecond
        .toString()
        .padStart(3, "0")}${this._nanosecond
        .toString()
        .padStart(3, "0")}`.replace(/(?:0+)$/, "");
    }
    return repr;
  }

  toJSON(): string {
    return this.toString();
  }

  valueOf(): any {
    throw new TypeError("Not possible to compare LocalTime");
  }
}

export class LocalDate {
  private readonly _date: Date;

  constructor(isoYear: number, isoMonth: number, isoDay: number) {
    isoYear = Math.trunc(toNumber(isoYear));
    isoMonth = Math.floor(toNumber(isoMonth));
    isoDay = Math.floor(toNumber(isoDay));

    if (isoYear < -271820 || isoYear > 275759) {
      throw new RangeError(
        `invalid year ${isoYear}: expected a value in -271820-275759 range`
      );
    }
    if (isoMonth < 1 || isoMonth > 12) {
      throw new RangeError(
        `invalid month ${isoMonth}: expected a value in 1-12 range`
      );
    }
    const maxDays = daysInMonth(isoYear, isoMonth);
    if (isoDay < 1 || isoDay > maxDays) {
      throw new RangeError(
        `invalid number of days ${isoDay}: expected a value in 1-${maxDays} range`
      );
    }

    this._date = new Date(Date.UTC(isoYear, isoMonth - 1, isoDay));
    if (isoYear >= 0 && isoYear <= 99) {
      this._date.setUTCFullYear(isoYear);
    }
  }

  get year(): number {
    return this._date.getUTCFullYear();
  }
  get month(): number {
    return this._date.getUTCMonth() + 1;
  }
  get day(): number {
    return this._date.getUTCDate();
  }
  get dayOfWeek(): number {
    return ((this._date.getUTCDay() + 6) % 7) + 1;
  }
  get dayOfYear(): number {
    return (
      daysBeforeMonth(
        this._date.getUTCFullYear(),
        this._date.getUTCMonth() + 1
      ) + this._date.getUTCDate()
    );
  }
  // get weekOfYear(): number {
  //   return Math.floor((10 + this.dayOfYear - this.dayOfWeek) / 7);
  // }
  get daysInWeek(): number {
    return 7;
  }
  get daysInMonth(): number {
    return daysInMonth(
      this._date.getUTCFullYear(),
      this._date.getUTCMonth() + 1
    );
  }
  get daysInYear(): number {
    return isLeapYear(this._date.getUTCFullYear()) ? 366 : 365;
  }
  get monthsInYear(): number {
    return 12;
  }
  get inLeapYear(): boolean {
    return isLeapYear(this._date.getUTCFullYear());
  }

  toString(): string {
    const year =
      this.year < 1000 || this.year > 9999
        ? (this.year < 0 ? "-" : "+") +
          Math.abs(this.year).toString().padStart(6, "0")
        : this.year.toString();
    const month = this.month.toString().padStart(2, "0");
    const day = this.day.toString().padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  toJSON(): string {
    return this.toString();
  }

  valueOf(): any {
    throw new TypeError("Not possible to compare LocalDate");
  }
}

export function LocalDateToOrdinal(localdate: LocalDate): number {
  return ymd2ord(localdate.year, localdate.month, localdate.day);
}

export function LocalDateFromOrdinal(ordinal: number): LocalDate {
  const [year, month, day] = ord2ymd(ordinal);
  return new LocalDate(year, month, day);
}

export class LocalDateTime extends LocalDate {
  private readonly _time: LocalTime;

  constructor(
    isoYear: number,
    isoMonth: number,
    isoDay: number,
    isoHour: number = 0,
    isoMinute: number = 0,
    isoSecond: number = 0,
    isoMillisecond: number = 0,
    isoMicrosecond: number = 0,
    isoNanosecond: number = 0
  ) {
    super(isoYear, isoMonth, isoDay);

    this._time = new LocalTime(
      isoHour,
      isoMinute,
      isoSecond,
      isoMillisecond,
      isoMicrosecond,
      isoNanosecond
    );
  }

  // tslint:disable:no-string-literal
  get hour(): number {
    return this._time["_hour"];
  }
  get minute(): number {
    return this._time["_minute"];
  }
  get second(): number {
    return this._time["_second"];
  }
  get millisecond(): number {
    return this._time["_millisecond"];
  }
  get microsecond(): number {
    return this._time["_microsecond"];
  }
  get nanosecond(): number {
    return this._time["_nanosecond"];
  }
  // tslint:enable:no-string-literal

  toString(): string {
    return `${super.toString()}T${this._time.toString()}`;
  }

  valueOf(): any {
    throw new TypeError("Not possible to compare LocalDateTime");
  }
}

interface DurationLike {
  years?: number;
  months?: number;
  weeks?: number;
  days?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
  milliseconds?: number;
  microseconds?: number;
  nanoseconds?: number;
}

const durationRegex = new RegExp(
  `^(\\-|\\+)?P(?:(\\d+)Y)?(?:(\\d+)M)?(?:(\\d+)W)?(?:(\\d+)D)?` +
    `(T(?:(\\d+)(\\.\\d{1,10})?H)?(?:(\\d+)(\\.\\d{1,10})?M)?` +
    `(?:(\\d+)(\\.\\d{1,9})?S)?)?$`,
  "i"
);

export class Duration {
  private readonly _years: number;
  private readonly _months: number;
  private readonly _weeks: number;
  private readonly _days: number;
  private readonly _hours: number;
  private readonly _minutes: number;
  private readonly _seconds: number;
  private readonly _milliseconds: number;
  private readonly _microseconds: number;
  private readonly _nanoseconds: number;
  private readonly _sign: number;

  constructor(
    years: number = 0,
    months: number = 0,
    weeks: number = 0,
    days: number = 0,
    hours: number = 0,
    minutes: number = 0,
    seconds: number = 0,
    milliseconds: number = 0,
    microseconds: number = 0,
    nanoseconds: number = 0
  ) {
    years = assertInteger(toNumber(years));
    months = assertInteger(toNumber(months));
    weeks = assertInteger(toNumber(weeks));
    days = assertInteger(toNumber(days));
    hours = assertInteger(toNumber(hours));
    minutes = assertInteger(toNumber(minutes));
    seconds = assertInteger(toNumber(seconds));
    milliseconds = assertInteger(toNumber(milliseconds));
    microseconds = assertInteger(toNumber(microseconds));
    nanoseconds = assertInteger(toNumber(nanoseconds));

    const fields = [
      years,
      months,
      weeks,
      days,
      hours,
      minutes,
      seconds,
      milliseconds,
      microseconds,
      nanoseconds
    ];

    let sign = 0;

    for (const field of fields) {
      if (field === Infinity || field === -Infinity) {
        throw new RangeError("infinite values not allowed as duration fields");
      }
      const fieldSign = Math.sign(field);
      if (sign && fieldSign && fieldSign !== sign) {
        throw new RangeError(
          "mixed-sign values not allowed as duration fields"
        );
      }
      sign = sign || fieldSign;
    }

    this._years = years || 0;
    this._months = months || 0;
    this._weeks = weeks || 0;
    this._days = days || 0;
    this._hours = hours || 0;
    this._minutes = minutes || 0;
    this._seconds = seconds || 0;
    this._milliseconds = milliseconds || 0;
    this._microseconds = microseconds || 0;
    this._nanoseconds = nanoseconds || 0;
    this._sign = sign || 0;
  }

  get years(): number {
    return this._years;
  }
  get months(): number {
    return this._months;
  }
  get weeks(): number {
    return this._weeks;
  }
  get days(): number {
    return this._days;
  }
  get hours(): number {
    return this._hours;
  }
  get minutes(): number {
    return this._minutes;
  }
  get seconds(): number {
    return this._seconds;
  }
  get milliseconds(): number {
    return this._milliseconds;
  }
  get microseconds(): number {
    return this._microseconds;
  }
  get nanoseconds(): number {
    return this._nanoseconds;
  }
  get sign(): number {
    return this._sign;
  }
  get blank(): boolean {
    return this._sign === 0;
  }

  toString(): string {
    let dateParts = "";
    if (this._years) {
      dateParts += bi.make(Math.abs(this._years)) + "Y";
    }
    if (this._months) {
      dateParts += bi.make(Math.abs(this._months)) + "M";
    }
    if (this._weeks) {
      dateParts += bi.make(Math.abs(this._weeks)) + "W";
    }
    if (this._days) {
      dateParts += bi.make(Math.abs(this._days)) + "D";
    }

    let timeParts = "";
    if (this._hours) {
      timeParts += bi.make(Math.abs(this._hours)) + "H";
    }
    if (this._minutes) {
      timeParts += bi.make(Math.abs(this._minutes)) + "M";
    }
    if (
      (!dateParts && !timeParts) ||
      this._seconds ||
      this._milliseconds ||
      this._microseconds ||
      this._nanoseconds
    ) {
      const totalNanoseconds = bi
        .add(
          bi.add(
            bi.add(
              bi.mul(bi.make(Math.abs(this._seconds)), bi.make(1e9)),
              bi.mul(bi.make(Math.abs(this._milliseconds)), bi.make(1e6))
            ),
            bi.mul(bi.make(Math.abs(this._microseconds)), bi.make(1e3))
          ),
          bi.make(Math.abs(this._nanoseconds))
        )
        .toString()
        .padStart(10, "0");

      const seconds = totalNanoseconds.slice(0, -9);
      const fracSeconds = totalNanoseconds.slice(-9).replace(/0+$/, "");

      timeParts +=
        seconds + (fracSeconds.length ? "." + fracSeconds : "") + "S";
    }

    return (
      (this._sign === -1 ? "-" : "") +
      "P" +
      dateParts +
      (timeParts ? "T" + timeParts : "")
    );
  }

  toJSON(): string {
    return this.toString();
  }

  valueOf(): any {
    throw new TypeError("Not possible to compare TemporalDuration");
  }

  static from(item: string | Duration | DurationLike): Duration {
    let result: DurationLike;
    if (item instanceof Duration) {
      result = item;
    }

    if (typeof item === "object") {
      if (
        item.years === undefined &&
        item.months === undefined &&
        item.weeks === undefined &&
        item.days === undefined &&
        item.hours === undefined &&
        item.minutes === undefined &&
        item.seconds === undefined &&
        item.milliseconds === undefined &&
        item.microseconds === undefined &&
        item.nanoseconds === undefined
      ) {
        throw new TypeError(`invalid duration-like`);
      }
      result = item;
    } else {
      const str = String(item);
      const matches = str.match(durationRegex);
      if (!matches) {
        throw new RangeError(`invalid duration: ${str}`);
      }
      const [
        _duration,
        _sign,
        years,
        months,
        weeks,
        days,
        _time,
        hours,
        fHours,
        minutes,
        fMinutes,
        seconds,
        fSeconds
      ] = matches;
      if (_duration.length < 3 || _time.length === 1) {
        throw new RangeError(`invalid duration: ${str}`);
      }
      const sign = _sign === "-" ? -1 : 1;
      result = {};
      if (years) {
        result.years = sign * Number(years);
      }
      if (months) {
        result.months = sign * Number(months);
      }
      if (weeks) {
        result.weeks = sign * Number(weeks);
      }
      if (days) {
        result.days = sign * Number(days);
      }
      if (hours) {
        result.hours = sign * Number(hours);
      }
      if (fHours) {
        if (minutes || fMinutes || seconds || fSeconds) {
          throw new RangeError("only the smallest unit can be fractional");
        }
        result.minutes = Number(fHours) * 60;
      } else {
        result.minutes = toNumber(minutes);
      }
      if (fMinutes) {
        if (seconds || fSeconds) {
          throw new RangeError("only the smallest unit can be fractional");
        }
        result.seconds = Number(fMinutes) * 60;
      } else if (seconds) {
        result.seconds = Number(seconds);
      } else {
        result.seconds = (result.minutes % 1) * 60;
      }
      if (fSeconds) {
        result.milliseconds = Number(fSeconds) * 1000;
      } else {
        result.milliseconds = (result.seconds % 1) * 1000;
      }
      result.microseconds = (result.milliseconds % 1) * 1000;
      result.nanoseconds = sign * Math.floor((result.microseconds % 1) * 1000);

      result.minutes = sign * Math.floor(result.minutes);
      result.seconds = sign * Math.floor(result.seconds);
      result.milliseconds = sign * Math.floor(result.milliseconds);
      result.microseconds = sign * Math.floor(result.microseconds);
    }

    return new Duration(
      result.years,
      result.months,
      result.weeks,
      result.days,
      result.hours,
      result.minutes,
      result.seconds,
      result.milliseconds,
      result.microseconds,
      result.nanoseconds
    );
  }
}

export class RelativeDuration {
  private readonly _years: number;
  private readonly _months: number;
  private readonly _weeks: number;
  private readonly _days: number;
  private readonly _hours: number;
  private readonly _minutes: number;
  private readonly _seconds: number;
  private readonly _milliseconds: number;
  private readonly _microseconds: number;

  constructor(
    years: number = 0,
    months: number = 0,
    weeks: number = 0,
    days: number = 0,
    hours: number = 0,
    minutes: number = 0,
    seconds: number = 0,
    milliseconds: number = 0,
    microseconds: number = 0
  ) {
    this._years = Math.trunc(years) || 0;
    this._months = Math.trunc(months) || 0;
    this._weeks = Math.trunc(weeks) || 0;
    this._days = Math.trunc(days) || 0;
    this._hours = Math.trunc(hours) || 0;
    this._minutes = Math.trunc(minutes) || 0;
    this._seconds = Math.trunc(seconds) || 0;
    this._milliseconds = Math.trunc(milliseconds) || 0;
    this._microseconds = Math.trunc(microseconds) || 0;
  }
  get years(): number {
    return this._years;
  }
  get months(): number {
    return this._months;
  }
  get weeks(): number {
    return this._weeks;
  }
  get days(): number {
    return this._days;
  }
  get hours(): number {
    return this._hours;
  }
  get minutes(): number {
    return this._minutes;
  }
  get seconds(): number {
    return this._seconds;
  }
  get milliseconds(): number {
    return this._milliseconds;
  }
  get microseconds(): number {
    return this._microseconds;
  }

  toString(): string {
    let str = "P";
    if (this._years) {
      str += `${this._years}Y`;
    }
    if (this._months) {
      str += `${this._months}M`;
    }
    const days = this._days + 7 * this._weeks;
    if (days) {
      str += `${days}D`;
    }

    let timeParts = "";
    if (this._hours) {
      timeParts += `${this._hours}H`;
    }
    if (this._minutes) {
      timeParts += `${this._minutes}M`;
    }

    const seconds =
      this._seconds + this._milliseconds / 1e3 + this._microseconds / 1e6;

    if (seconds !== 0) {
      timeParts += `${seconds}S`;
    }

    if (timeParts) {
      str += `T${timeParts}`;
    }

    if (str === "P") {
      return "PT0S";
    }

    return str;
  }

  toJSON(): string {
    return this.toString();
  }

  valueOf(): any {
    throw new TypeError("Not possible to compare RelativeDuration");
  }
}

export class DateDuration {
  private readonly _years: number;
  private readonly _months: number;
  private readonly _weeks: number;
  private readonly _days: number;

  constructor(
    years: number = 0,
    months: number = 0,
    weeks: number = 0,
    days: number = 0
  ) {
    this._years = Math.trunc(years) || 0;
    this._months = Math.trunc(months) || 0;
    this._weeks = Math.trunc(weeks) || 0;
    this._days = Math.trunc(days) || 0;
  }
  get years(): number {
    return this._years;
  }
  get months(): number {
    return this._months;
  }
  get weeks(): number {
    return this._weeks;
  }
  get days(): number {
    return this._days;
  }

  toString(): string {
    let str = "P";
    if (this._years) {
      str += `${this._years}Y`;
    }
    if (this._months) {
      str += `${this._months}M`;
    }
    const days = this._days + 7 * this._weeks;
    if (days) {
      str += `${days}D`;
    }

    if (str === "P") {
      return "PT0S";
    }

    return str;
  }

  toJSON(): string {
    return this.toString();
  }

  valueOf(): any {
    throw new TypeError("Not possible to compare DateDuration");
  }
}

const humanDurationPrefixes: {[key: string]: number} = {
  h: 3_600_000,
  hou: 3_600_000,
  m: 60_000,
  min: 60_000,
  s: 1000,
  sec: 1000,
  ms: 1,
  mil: 1
};

export function parseHumanDurationString(durationStr: string): number {
  const regex =
    /(\d+|\d+\.\d+|\.\d+)\s*(hours?|minutes?|seconds?|milliseconds?|ms|h|m|s)\s*/g;

  let duration = 0;
  const seen = new Set<number>();
  let match = regex.exec(durationStr);
  let lastIndex = 0;
  while (match) {
    if (match.index !== lastIndex) {
      throw new Error(`invalid duration "${durationStr}"`);
    }
    const mult = humanDurationPrefixes[match[2].slice(0, 3)]!;
    if (seen.has(mult)) {
      throw new Error(`invalid duration "${durationStr}"`);
    }
    duration += Number(match[1]) * mult;
    seen.add(mult);
    lastIndex = regex.lastIndex;
    match = regex.exec(durationStr);
  }
  if (lastIndex !== durationStr.length) {
    throw new Error(`invalid duration "${durationStr}"`);
  }
  return duration;
}
