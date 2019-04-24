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

import {ReadBuffer, WriteBuffer} from "../buffer";
import {ICodec, Codec} from "./ifaces";

const PRIVATE = {};

export class UUID {
  private _buf: Buffer;

  constructor(marker: any, buffer: Buffer) {
    if (marker !== PRIVATE) {
      throw new TypeError(
        "UUID should not be created directly; use fromString() or fromBuffer()"
      );
    }
    this._buf = buffer;
  }

  get buffer(): Buffer {
    return this._buf;
  }

  toString(): string {
    return this._buf.toString("hex");
  }

  [util.inspect.custom](_depth: number, options: util.InspectOptions): string {
    return `UUID [ ${util.inspect(
      this.toString(),
      options.showHidden,
      0,
      options.colors
    )} ]`;
  }

  static fromString(uuid: string): UUID {
    const buf = UUIDBufferFromString(uuid);
    return new UUID(PRIVATE, buf);
  }

  static fromBuffer(uuid: Buffer): UUID {
    if (uuid.length !== 16) {
      throw new TypeError(
        `cannot create UUID from ${uuid}; expected buffer to be 16 bytes long`
      );
    }
    return new UUID(PRIVATE, uuid);
  }
}

export class UUIDCodec extends Codec implements ICodec {
  readonly isScalar = true;

  encode(buf: WriteBuffer, object: any): void {
    if (object instanceof UUID) {
      const val = <UUID>object;
      buf.writeInt32(16);
      buf.writeBuffer(val.buffer);
    } else if (typeof object === "string") {
      const val = <string>object;
      const ubuf = UUIDBufferFromString(val);
      buf.writeInt32(16);
      buf.writeBuffer(ubuf);
    } else {
      throw new Error(`cannot encode UUID "${object}": invalid type`);
    }
  }

  decode(buf: ReadBuffer): any {
    return new UUID(PRIVATE, buf.readBuffer(16));
  }
}

function UUIDBufferFromString(uuid: string): Buffer {
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
