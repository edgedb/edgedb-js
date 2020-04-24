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

import {ReadBuffer, WriteBuffer} from "../buffer";
import {ICodec, ScalarCodec} from "./ifaces";
import {
  LocalDateTime,
  LocalDate,
  LocalTime,
  DATE_PRIVATE,
  Duration,
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
    const ms = object.getTime() - TIMESHIFT;
    const us = ms * 1000.0;
    buf.writeInt32(8);
    buf.writeInt64(us);
  }

  decode(buf: ReadBuffer): any {
    const us = buf.readBigInt64();
    const ms = Number(us) / 1000.0;
    return new LocalDateTime(
      (new Date(ms + TIMESHIFT) as unknown) as number,
      (DATE_PRIVATE as unknown) as number
    );
  }
}

export class LocalDateCodec extends ScalarCodec implements ICodec {
  encode(buf: WriteBuffer, object: any): void {
    if (!(object instanceof LocalDate)) {
      throw new Error(
        `a LocalDateTime instance was expected, got "${object}"`
      );
    }
    buf.writeInt32(4);
    buf.writeInt32(object.toOrdinal() - DATESHIFT_ORD);
  }

  decode(buf: ReadBuffer): any {
    const ord = buf.readInt32();
    return LocalDate.fromOrdinal(ord + DATESHIFT_ORD);
  }
}

export class LocalTimeCodec extends ScalarCodec implements ICodec {
  encode(buf: WriteBuffer, object: any): void {
    if (!(object instanceof LocalTime)) {
      throw new Error(`a LocalTime instance was expected, got "${object}"`);
    }
    buf.writeInt32(8);
    const ms =
      (object.getHours() * 3600.0 +
        object.getMinutes() * 60.0 +
        object.getSeconds()) *
        1000.0 +
      object.getMilliseconds();
    buf.writeInt64(ms * 1000.0);
  }

  decode(buf: ReadBuffer): any {
    const us = Number(buf.readBigInt64());
    let seconds = Math.floor(us / 1_000_000);
    const ms = Math.floor((us % 1_000_000) / 1000);
    let minutes = Math.floor(seconds / 60);
    seconds = Math.floor(seconds % 60);
    const hours = Math.floor(minutes / 60);
    minutes = Math.floor(minutes % 60);
    return new LocalTime(hours, minutes, seconds, ms);
  }
}

export class DurationCodec extends ScalarCodec implements ICodec {
  encode(buf: WriteBuffer, object: any): void {
    if (!(object instanceof Duration)) {
      throw new Error(`a Duration instance was expected, got "${object}"`);
    }
    buf.writeInt32(16);
    buf.writeBigInt64(object.toMicroseconds());
    buf.writeInt32(0);
    buf.writeInt32(0);
  }

  decode(buf: ReadBuffer): any {
    const us = buf.readBigInt64();
    const days = buf.readInt32();
    const months = buf.readInt32();
    if (days !== 0) {
      throw new Error("non-zero reserved bytes in duration");
    }
    if (months !== 0) {
      throw new Error("non-zero reserved bytes in duration");
    }
    return Duration.fromMicroseconds(us as bigint);
  }
}
