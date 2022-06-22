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

import {ReadBuffer, WriteBuffer} from "../primitives/buffer";
import {ICodec, ScalarCodec} from "./ifaces";
import * as bi from "../primitives/bigint";
import {
  LocalDateTime,
  LocalDate,
  LocalTime,
  Duration,
  RelativeDuration,
  LocalDateFromOrdinal,
  LocalDateToOrdinal,
} from "../datatypes/datetime";
import {ymd2ord} from "../datatypes/dateutil";

/* PostgreSQL UTC epoch starts on "January 1, 2000", whereas
 * in JavaScript, the UTC epoch starts on "January 1, 1970" (the UNIX epoch).
 * To convert between the two we need to add or subtract 30 years,
 * which is specified in the below constant (in milliseconds.)
 */
const TIMESHIFT = 946684800000;
const DATESHIFT_ORD = ymd2ord(2000, 1, 1);

export class DateTimeCodec extends ScalarCodec implements ICodec {
  encode(buf: WriteBuffer, object: any): void {
    if (!(object instanceof Date)) {
      throw new Error(`a Date instance was expected, got "${object}"`);
    }
    const ms = object.getTime() - TIMESHIFT;
    const us = ms * 1000.0;
    buf.writeInt32(8);
    buf.writeInt64(us);
  }

  decode(buf: ReadBuffer): any {
    const us = buf.readBigInt64();
    const ms = Number(us) / 1000.0;
    return new Date(ms + TIMESHIFT);
  }
}

export class LocalDateTimeCodec extends ScalarCodec implements ICodec {
  encode(buf: WriteBuffer, object: any): void {
    if (!(object instanceof LocalDateTime)) {
      throw new Error(
        `a LocalDateTime instance was expected, got "${object}"`
      );
    }

    // tslint:disable-next-line:no-string-literal
    const ms = bi.make(object["_date"].getTime() - TIMESHIFT);
    const us = bi.add(
      bi.mul(ms, bi.make(1000)),
      bi.make(
        object.hour * 3_600_000_000 +
          object.minute * 60_000_000 +
          object.second * 1_000_000 +
          object.millisecond * 1000 +
          object.microsecond
      )
    );

    buf.writeInt32(8);
    buf.writeBigInt64(us as bigint);
  }

  decode(buf: ReadBuffer): any {
    const bi1000 = bi.make(1000);
    const us = buf.readBigInt64();
    const ms = bi.div(us, bi1000);

    const date = new Date(Number(ms) + TIMESHIFT);
    return new LocalDateTime(
      date.getUTCFullYear(),
      date.getUTCMonth() + 1,
      date.getUTCDate(),
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds(),
      Number(bi.sub(us, bi.mul(ms, bi1000)))
    );
  }
}

export class LocalDateCodec extends ScalarCodec implements ICodec {
  encode(buf: WriteBuffer, object: any): void {
    if (!(object instanceof LocalDate)) {
      throw new Error(`a LocalDate instance was expected, got "${object}"`);
    }
    buf.writeInt32(4);
    buf.writeInt32(LocalDateToOrdinal(object) - DATESHIFT_ORD);
  }

  decode(buf: ReadBuffer): any {
    const ord = buf.readInt32();
    return LocalDateFromOrdinal(ord + DATESHIFT_ORD);
  }
}

export class LocalTimeCodec extends ScalarCodec implements ICodec {
  encode(buf: WriteBuffer, object: any): void {
    if (!(object instanceof LocalTime)) {
      throw new Error(`a LocalTime instance was expected, got "${object}"`);
    }
    buf.writeInt32(8);
    const us =
      object.hour * 3_600_000_000 +
      object.minute * 60_000_000 +
      object.second * 1_000_000 +
      object.millisecond * 1000 +
      object.microsecond;
    buf.writeInt64(us);
  }

  decode(buf: ReadBuffer): any {
    let us = Number(buf.readBigInt64());
    let seconds = Math.floor(us / 1_000_000);
    const ms = Math.floor((us % 1_000_000) / 1000);
    us = (us % 1_000_000) - ms * 1000;
    let minutes = Math.floor(seconds / 60);
    seconds = Math.floor(seconds % 60);
    const hours = Math.floor(minutes / 60);
    minutes = Math.floor(minutes % 60);
    return new LocalTime(hours, minutes, seconds, ms, us);
  }
}

const unencodableDurationFields: Array<keyof Duration> = [
  "years",
  "months",
  "weeks",
  "days",
];

export class DurationCodec extends ScalarCodec implements ICodec {
  encode(buf: WriteBuffer, object: any): void {
    if (!(object instanceof Duration)) {
      throw new Error(`a Duration instance was expected, got "${object}"`);
    }
    for (const field of unencodableDurationFields) {
      if (object[field] !== 0) {
        throw new Error(
          `Cannot encode a 'Duration' with a non-zero number of ${field}`
        );
      }
    }

    let us = bi.make(object.microseconds);
    us = bi.add(us, bi.mul(bi.make(object.milliseconds), bi.make(1_000)));
    us = bi.add(us, bi.mul(bi.make(object.seconds), bi.make(1_000_000)));
    us = bi.add(us, bi.mul(bi.make(object.minutes), bi.make(60_000_000)));
    us = bi.add(us, bi.mul(bi.make(object.hours), bi.make(3_600_000_000)));

    buf.writeInt32(16);
    buf.writeBigInt64(us as bigint);
    buf.writeInt32(0);
    buf.writeInt32(0);
  }

  decode(buf: ReadBuffer): any {
    let bius = buf.readBigInt64();
    const days = buf.readInt32();
    const months = buf.readInt32();
    if (days !== 0) {
      throw new Error("non-zero reserved bytes in duration");
    }
    if (months !== 0) {
      throw new Error("non-zero reserved bytes in duration");
    }

    let sign = 1;
    if (Number(bius) < 0) {
      sign = -1;
      bius = bi.mul(bi.make(-1), bius);
    }

    const biMillion = bi.make(1_000_000);

    const biSeconds = bi.div(bius, biMillion);
    let us = Number(bi.sub(bius, bi.mul(biSeconds, biMillion)));
    const ms = Math.floor(us / 1000);
    us = us % 1000;

    let seconds = Number(biSeconds);
    let minutes = Math.floor(seconds / 60);
    seconds = Math.floor(seconds % 60);
    const hours = Math.floor(minutes / 60);
    minutes = Math.floor(minutes % 60);

    return new Duration(
      0,
      0,
      0,
      0,
      hours * sign,
      minutes * sign,
      seconds * sign,
      ms * sign,
      us * sign
    );
  }
}

export class RelativeDurationCodec extends ScalarCodec implements ICodec {
  encode(buf: WriteBuffer, object: any): void {
    if (!(object instanceof RelativeDuration)) {
      throw new Error(`
        a RelativeDuration instance was expected, got "${object}"
      `);
    }

    let us = bi.make(object.microseconds);
    us = bi.add(us, bi.mul(bi.make(object.milliseconds), bi.make(1_000)));
    us = bi.add(us, bi.mul(bi.make(object.seconds), bi.make(1_000_000)));
    us = bi.add(us, bi.mul(bi.make(object.minutes), bi.make(60_000_000)));
    us = bi.add(us, bi.mul(bi.make(object.hours), bi.make(3_600_000_000)));

    buf.writeInt32(16);
    buf.writeBigInt64(us as bigint);
    buf.writeInt32(object.days + 7 * object.weeks);
    buf.writeInt32(object.months + 12 * object.years);
  }

  decode(buf: ReadBuffer): any {
    let bius = buf.readBigInt64();
    let days = buf.readInt32();
    let months = buf.readInt32();

    let sign = 1;
    if (Number(bius) < 0) {
      sign = -1;
      bius = bi.mul(bi.make(-1), bius);
    }

    const biMillion = bi.make(1_000_000);

    const biSeconds = bi.div(bius, biMillion);
    let us = Number(bi.sub(bius, bi.mul(biSeconds, biMillion)));
    const ms = Math.trunc(us / 1000);
    us = us % 1000;

    let seconds = Number(biSeconds);
    let minutes = Math.trunc(seconds / 60);
    seconds = Math.trunc(seconds % 60);
    const hours = Math.trunc(minutes / 60);
    minutes = Math.trunc(minutes % 60);

    const weeks = Math.trunc(days / 7);
    days = Math.trunc(days % 7);

    const years = Math.trunc(months / 12);
    months = Math.trunc(months % 12);

    return new RelativeDuration(
      years,
      months,
      weeks,
      days,
      hours * sign,
      minutes * sign,
      seconds * sign,
      ms * sign,
      us * sign
    );
  }
}
