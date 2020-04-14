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

export class UUID {
  private _buf: Buffer;
  private _str: string | null = null;

  constructor(buffer: Buffer) {
    if (buffer.length !== 16) {
      throw new TypeError(
        `cannot create UUID from ${buffer}; ` +
          `expected buffer to be 16 bytes long`
      );
    }
    this._buf = buffer;
  }

  toString(): string {
    if (this._str != null) {
      return this._str;
    }
    /* As benchmarked, the fastest way is to convert to a hex-string and
       then slice/concat with '-'.  Calling `buf.slice()` multiple times
       is 4x slower; using the `[].join('-')` pattern is 2x slower than
       simple `str+str`.

       Overall, this nicer formatting is going to be 1.5x slower than
       just returning `buf.toString('hex')`.

       See https://gist.github.com/1st1/5a7e5a8ff36d49f492631c74bc007515
       for more details.
    */
    const sl = this._buf.toString("hex");
    this._str =
      sl.slice(0, 8) +
      "-" +
      sl.slice(8, 12) +
      "-" +
      sl.slice(12, 16) +
      "-" +
      sl.slice(16, 20) +
      "-" +
      sl.slice(20, 32);
    return this._str;
  }

  get buffer(): Buffer {
    return this._buf;
  }

  valueOf(): string {
    return this.toString();
  }

  toJSON(): string {
    return this.toString();
  }

  [Symbol.toPrimitive](hint: string): string {
    if (hint === "number") {
      throw new TypeError("cannot coerce UUID to a number");
    }
    return this.toString();
  }

  [inspect.custom](_depth: number, options: any): string {
    return `UUID [ ${inspect(
      this.toString(),
      options.showHidden,
      0,
      options.colors
    )} ]`;
  }

  static fromString(uuid: string): UUID {
    const buf = UUIDBufferFromString(uuid);
    return new UUID(buf);
  }
}

export function UUIDBufferFromString(uuid: string): Buffer {
  let uuidClean = uuid;
  if (uuidClean.length !== 32) {
    uuidClean = uuidClean.replace(/\-/g, "");
    if (uuidClean.length !== 32) {
      throw new TypeError(`invalid UUID "${uuid}"`);
    }
  }
  const buf = Buffer.from(uuidClean, "hex");
  if (buf.length !== 16) {
    throw new TypeError(`invalid UUID "${uuid}"`);
  }
  return buf;
}
