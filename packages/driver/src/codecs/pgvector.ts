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

import type { ReadBuffer, WriteBuffer } from "../primitives/buffer.js";
import { type ICodec, ScalarCodec } from "./ifaces.js";
import { InvalidArgumentError } from "../errors/index.js";

export const PG_VECTOR_MAX_DIM = (1 << 16) - 1;

export class PgVectorCodec extends ScalarCodec implements ICodec {
  tsType = "Float32Array";

  encode(buf: WriteBuffer, object: any): void {
    if (!(object instanceof Float32Array || Array.isArray(object))) {
      throw new InvalidArgumentError(
        `a Float32Array or array of numbers was expected, got "${object}"`,
      );
    }

    if (object.length > PG_VECTOR_MAX_DIM) {
      throw new InvalidArgumentError(
        "too many elements in array to encode into pgvector",
      );
    }

    buf
      .writeInt32(4 + object.length * 4)
      .writeUInt16(object.length)
      .writeUInt16(0);

    if (object instanceof Float32Array) {
      for (const el of object) {
        buf.writeFloat32(el);
      }
    } else {
      for (const el of object) {
        if (typeof el !== "number") {
          throw new InvalidArgumentError(
            `elements of vector array expected to be a numbers, got "${el}"`,
          );
        }
        buf.writeFloat32(el);
      }
    }
  }

  decode(buf: ReadBuffer): any {
    const dim = buf.readUInt16();
    buf.discard(2);

    const vecBuf = buf.readBuffer(dim * 4);
    const data = new DataView(
      vecBuf.buffer,
      vecBuf.byteOffset,
      vecBuf.byteLength,
    );
    const vec = new Float32Array(dim);

    for (let i = 0; i < dim; i++) {
      vec[i] = data.getFloat32(i * 4);
    }

    return vec;
  }
}
