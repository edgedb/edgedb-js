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

import type { ReadBuffer, WriteBuffer } from "../primitives/buffer";
import { type ICodec, ScalarCodec } from "./ifaces";
import { InvalidArgumentError } from "../errors";
import { Float16Array, getFloat16, isFloat16Array, setFloat16 } from "../utils";
import { SparseVector } from "../datatypes/pgvector";
import type { CodecContext } from "./context";

export const PG_VECTOR_MAX_DIM = (1 << 16) - 1;

export class PgVectorCodec extends ScalarCodec implements ICodec {
  override readonly tsType = "Float32Array";

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

  decode(buf: ReadBuffer, ctx: CodecContext): any {
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

    return ctx.postDecode(this, vec);
  }
}

export class PgVectorHalfVecCodec extends ScalarCodec implements ICodec {
  override readonly tsType = "Float16Array";
  override readonly tsModule = "edgedb";

  encode(buf: WriteBuffer, object: any): void {
    if (!(isFloat16Array(object) || Array.isArray(object))) {
      throw new InvalidArgumentError(
        `a Float16Array or array of numbers was expected, got "${object}"`,
      );
    }

    if (object.length > PG_VECTOR_MAX_DIM) {
      throw new InvalidArgumentError(
        "too many elements in array to encode into pgvector",
      );
    }

    buf
      .writeInt32(4 + object.length * 2)
      .writeUInt16(object.length)
      .writeUInt16(0);

    const vecBuf = new Uint8Array(object.length * 2);
    const data = new DataView(
      vecBuf.buffer,
      vecBuf.byteOffset,
      vecBuf.byteLength,
    );

    if (isFloat16Array(object)) {
      for (let i = 0; i < object.length; i++) {
        setFloat16(data, i * 2, object[i]);
      }
    } else {
      for (let i = 0; i < object.length; i++) {
        if (typeof object[i] !== "number") {
          throw new InvalidArgumentError(
            `elements of vector array expected to be a numbers, got "${object[i]}"`,
          );
        }
        setFloat16(data, i * 2, object[i]);
      }
    }

    buf.writeBuffer(vecBuf);
  }

  decode(buf: ReadBuffer, ctx: CodecContext): any {
    const dim = buf.readUInt16();
    buf.discard(2);

    const vecBuf = buf.readBuffer(dim * 2);
    const data = new DataView(
      vecBuf.buffer,
      vecBuf.byteOffset,
      vecBuf.byteLength,
    );
    const vec = new Float16Array(dim);

    for (let i = 0; i < dim; i++) {
      vec[i] = getFloat16(data, i * 2);
    }

    return ctx.postDecode(this, vec);
  }
}

export class PgVectorSparseVecCodec extends ScalarCodec implements ICodec {
  override readonly tsType = "SparseVector";
  override readonly tsModule = "edgedb";

  encode(buf: WriteBuffer, object: any): void {
    if (!(object instanceof SparseVector)) {
      throw new InvalidArgumentError(
        `a SparseVector was expected, got "${object}"`,
      );
    }

    const nnz = object.indexes.length;

    if (nnz > PG_VECTOR_MAX_DIM || nnz > object.length) {
      throw new InvalidArgumentError(
        "too many elements in sparse vector value",
      );
    }

    buf
      .writeUInt32(4 * (3 + nnz * 2))
      .writeUInt32(object.length)
      .writeUInt32(nnz)
      .writeUInt32(0);

    const vecBuf = new Uint8Array(nnz * 8);
    const data = new DataView(
      vecBuf.buffer,
      vecBuf.byteOffset,
      vecBuf.byteLength,
    );

    for (let i = 0; i < nnz; i++) {
      data.setUint32(i * 4, object.indexes[i]);
    }
    for (let i = 0; i < nnz; i++) {
      data.setFloat32((nnz + i) * 4, object.values[i]);
    }

    buf.writeBuffer(vecBuf);
  }

  decode(buf: ReadBuffer, ctx: CodecContext): any {
    const dim = buf.readUInt32();
    const nnz = buf.readUInt32();
    buf.discard(4);

    const vecBuf = buf.readBuffer(nnz * 8);
    const data = new DataView(
      vecBuf.buffer,
      vecBuf.byteOffset,
      vecBuf.byteLength,
    );
    const indexes = new Uint32Array(nnz);
    for (let i = 0; i < nnz; i++) {
      indexes[i] = data.getUint32(i * 4);
    }
    const vecData = new Float32Array(nnz);
    for (let i = 0; i < nnz; i++) {
      vecData[i] = data.getFloat32((i + nnz) * 4);
    }

    if (ctx.hasOverload(this)) {
      return ctx.postDecode(this, [dim, indexes, vecData]);
    }

    return new SparseVector(dim, indexes, vecData);
  }
}
