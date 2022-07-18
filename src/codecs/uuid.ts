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
import {InvalidArgumentError} from "../errors";

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

const byteToHex: string[] = [];

for (let i = 0; i < 256; ++i) {
  byteToHex.push((i + 0x100).toString(16).slice(1));
}
export function bytesToHex(buffer: Buffer) {
  const arr = new Uint8Array(buffer);

  return (
    byteToHex[arr[0]] +
    byteToHex[arr[1]] +
    byteToHex[arr[2]] +
    byteToHex[arr[3]] +
    "-" +
    byteToHex[arr[4]] +
    byteToHex[arr[5]] +
    "-" +
    byteToHex[arr[6]] +
    byteToHex[arr[7]] +
    "-" +
    byteToHex[arr[8]] +
    byteToHex[arr[9]] +
    "-" +
    byteToHex[arr[10]] +
    byteToHex[arr[11]] +
    byteToHex[arr[12]] +
    byteToHex[arr[13]] +
    byteToHex[arr[14]] +
    byteToHex[arr[15]]
  ).toLowerCase();
}

export class UUIDCodec extends ScalarCodec implements ICodec {
  encode(buf: WriteBuffer, object: any): void {
    if (typeof object === "string") {
      const ubuf = UUIDBufferFromString(object);
      buf.writeInt32(16);
      buf.writeBuffer(ubuf);
    } else {
      throw new InvalidArgumentError(
        `cannot encode UUID "${object}": invalid type`
      );
    }
  }

  decode(buf: ReadBuffer): any {
    return bytesToHex(buf.readBuffer(16));
  }
}
