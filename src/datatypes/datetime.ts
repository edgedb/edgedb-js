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

import {inspect} from "../compat";
import * as bi from "../bigint";

import {daysInMonth, ymd2ord, ord2ymd} from "./dateutil";

export const DATE_PRIVATE = Symbol.for("edgedb.datetime");

export class LocalDateTime {
  private readonly _date: Date;

  constructor(
    year: number,
    month: number = 0,
    day: number = 0,
    hour: number = 0,
    minute: number = 0,
    second: number = 0,
    millisecond: number = 0
  ) {
    if (
      (month as unknown) === DATE_PRIVATE &&
      (year as unknown) instanceof Date
    ) {
      this._date = (year as unknown) as Date;
    } else {
      this._date = new Date(
        Date.UTC(year, month, day, hour, minute, second, millisecond)
      );
    }
  }

  getTime(): number {
    return this._date.getTime();
  }

  getDate(): number {
    return this._date.getUTCDate();
  }

  getDay(): number {
    return this._date.getUTCDay();
  }

  getFullYear(): number {
    return this._date.getUTCFullYear();
  }

  getHours(): number {
    return this._date.getUTCHours();
  }

  getMilliseconds(): number {
    return this._date.getUTCMilliseconds();
  }

  getMinutes(): number {
    return this._date.getUTCMinutes();
  }

  getMonth(): number {
    return this._date.getUTCMonth();
  }

  getSeconds(): number {
    return this._date.getUTCSeconds();
  }

  toDateString(): string {
    return this.toString(); // cut off " GMT"
  }

  toISOString(): string {
    const result = this._date.toISOString();
    if (result[result.length - 1] !== "Z") {
      throw new Error(`unexpected ISO format: ${result}`);
    }
    return result.slice(0, -1); // cut off "Z"
  }

  toJSON(): string {
    return this.toISOString();
  }

  valueOf(): any {
    return this._date.valueOf();
  }

  toString(): string {
    const result = this._date.toUTCString();
    if (result.slice(-4) !== " GMT") {
      throw new Error(`unexpected UTC format: ${result}`);
    }
    return result.slice(0, -4); // cut off " GMT"
  }

  toDateTime(): Date {
    return new Date(
      this.getFullYear(),
      this.getMonth(),
      this.getDate(),
      this.getHours(),
      this.getMinutes(),
      this.getSeconds(),
      this.getMilliseconds()
    );
  }

  [inspect.custom](_depth: number, _options: any): string {
    return `LocalDateTime [ ${this.toISOString()} ]`;
  }
}

export class LocalTime {
  private readonly _hours: number;
  private readonly _minutes: number;
  private readonly _seconds: number;
  private readonly _milliseconds: number;

  constructor(
    hours: number,
    minutes: number = 0,
    seconds: number = 0,
    milliseconds: number = 0
  ) {
    if (hours < 0 || hours > 23) {
      throw new Error(
        `invalid number of hours ${hours}: expected a value in 0-23 range`
      );
    }
    if (minutes < 0 || minutes > 59) {
      throw new Error(
        `invalid number of minutes ${minutes}: expected a value in 0-59 range`
      );
    }
    if (seconds < 0 || seconds > 59) {
      throw new Error(
        `invalid number of seconds ${seconds}: expected a value in 0-59 range`
      );
    }
    if (milliseconds < 0 || milliseconds > 999) {
      throw new Error(
        `invalid number of milliseconds ${milliseconds}: ` +
          `expected a value in 0-999 range`
      );
    }
    this._hours = hours;
    this._minutes = minutes;
    this._seconds = seconds;
    this._milliseconds = milliseconds;
  }

  getHours(): number {
    return this._hours;
  }

  getSeconds(): number {
    return this._seconds;
  }

  getMilliseconds(): number {
    return this._milliseconds;
  }

  getMinutes(): number {
    return this._minutes;
  }

  valueOf(): string {
    return this.toString();
  }

  toString(): string {
    const hh = this._hours.toString().padStart(2, "0");
    const mm = this._minutes.toString().padStart(2, "0");
    const ss = this._seconds.toString().padStart(2, "0");
    let repr = `${hh}:${mm}:${ss}`;
    if (this._milliseconds) {
      repr += `.${this._milliseconds}`.replace(/(?:0+)$/, "");
    }
    return repr;
  }

  [inspect.custom](_depth: number, _options: any): string {
    return `LocalTime [ ${this.toString()} ]`;
  }
}

export class LocalDate {
  private readonly _year: number;
  private readonly _month: number;
  private readonly _day: number;

  constructor(year: number, monthIndex: number = 0, day: number = 1) {
    if (monthIndex < 0 || monthIndex >= 12) {
      throw new Error(
        `invalid monthIndex ${monthIndex}: expected a value in 0-11 range`
      );
    }

    const maxDays = daysInMonth(year, monthIndex + 1);
    if (monthIndex < 0 || monthIndex >= 12 || day < 1 || day > maxDays) {
      throw new Error(
        `invalid number of days ${day}: ` +
          `expected a value in 1..${maxDays} range`
      );
    }

    this._year = year;
    this._month = monthIndex;
    this._day = day;
  }

  getFullYear(): number {
    return this._year;
  }

  getMonth(): number {
    return this._month;
  }

  getDate(): number {
    return this._day;
  }

  valueOf(): string {
    return this.toString();
  }

  toString(): string {
    const mm = (this._month + 1).toString().padStart(2, "0");
    const dd = this._day.toString().padStart(2, "0");
    return `${this._year}-${mm}-${dd}`;
  }

  [inspect.custom](_depth: number, _options: any): string {
    return `LocalDate [ ${this.toString()} ]`;
  }

  toOrdinal(): number {
    return ymd2ord(this._year, this._month + 1, this._day);
  }

  static fromOrdinal(ord: number): LocalDate {
    const [year, month, day] = ord2ymd(ord);
    return new this(year, month - 1, day);
  }
}

export class Duration {
  private readonly _microseconds: bi.BigIntLike;

  constructor(
    milliseconds: number = 0,
    microseconds: bigint = bi.make(0) as bigint
  ) {
    this._microseconds = bi.add(
      bi.make(Math.floor(milliseconds * 1000)),
      microseconds
    );
  }

  static fromMicroseconds(microseconds: bigint): Duration {
    return new Duration(undefined, microseconds);
  }

  toSeconds(): number {
    return Number(this._microseconds) / 1000000;
  }

  toMilliseconds(): number {
    return Number(this._microseconds) / 1000;
  }

  toMicroseconds(): bigint {
    return this._microseconds as bigint;
  }

  toString(): string {
    const buf = [];

    const micros = this._microseconds;

    const bint_hour = bi.div(micros, bi.make(3600_000_000));
    let time = Number(
      bi.sub(micros, bi.mul(bint_hour, bi.make(3600_000_000)))
    );
    const hour = Number(bint_hour);

    const tfrac = Math.trunc(time / 60_000_000);
    time -= tfrac * 60_000_000;
    const min = tfrac;
    const sec = Math.trunc(time / 1000_000);
    let fsec = time - sec * 1000_000;

    const neg = hour < 0 || min < 0 || sec < 0 || fsec < 0;
    buf.push(
      `${neg ? "-" : ""}` +
        `${Math.abs(hour)
          .toString()
          .padStart(2, "0")}:` +
        `${Math.abs(min)
          .toString()
          .padStart(2, "0")}:` +
        `${Math.abs(sec)
          .toString()
          .padStart(2, "0")}`
    );

    fsec = Math.abs(fsec);
    if (fsec) {
      fsec = Math.round(fsec);
      buf.push(`.${fsec.toString().padStart(6, "0")}`.replace(/(0+)$/, ""));
    }

    return buf.join("");
  }

  [inspect.custom](_depth: number, _options: any): string {
    return `Duration [ ${this.toString()} ]`;
  }
}
