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

import * as util from "util";

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

  private _toString(): string {
    if (this._str != null) {
      return this._str;
    }
    this._str = this._buf.toString("hex");
    return this._str;
  }

  get buffer(): Buffer {
    return this._buf;
  }

  toString(): string {
    return this._toString();
  }

  valueOf(): string {
    return this._toString();
  }

  toJSON(): string {
    return this._toString();
  }

  [util.inspect.custom](_depth: number, options: util.InspectOptions): string {
    return `UUID [ ${util.inspect(
      this._toString(),
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
