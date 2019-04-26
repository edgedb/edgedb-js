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
import {ICodec, Codec} from "./ifaces";

/* PostgreSQL UTC epoch starts on "January 1, 2000", whereas
 * in JavaScript, the UTC epoch starts on "January 1, 1970" (the UNIX epoch).
 * To convert between the two we need to add or subtract 30 years,
 * which is specified in the below constant (in milliseconds.)
 */
const TIMESHIFT = 946684800000;

export class DateTimeCodec extends Codec implements ICodec {
  readonly isScalar = true;

  encode(buf: WriteBuffer, object: any): void {
    if (!(object instanceof Date)) {
      throw new Error(`a Date instance was expected, got "${object}"`);
    }
    const ms = object.getTime() - TIMESHIFT;
    const us = ms * 1000.0;
    buf.writeInt64(us);
  }

  decode(buf: ReadBuffer): any {
    const us = buf.readInt64();
    const ms = us / 1000.0;
    return new Date(ms + TIMESHIFT);
  }
}
