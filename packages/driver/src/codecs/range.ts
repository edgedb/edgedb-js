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

import { ICodec, Codec, uuid, CodecKind } from "./ifaces";
import { WriteBuffer, ReadBuffer } from "../primitives/buffer";
import { MultiRange, Range } from "../datatypes/range";
import { InvalidArgumentError, ProtocolError } from "../errors";

enum RangeFlags {
  EMPTY = 1 << 0,
  INC_LOWER = 1 << 1,
  INC_UPPER = 1 << 2,
  EMPTY_LOWER = 1 << 3,
  EMPTY_UPPER = 1 << 4,
}

export class RangeCodec extends Codec implements ICodec {
  private subCodec: ICodec;
  readonly typeName: string | null;

  constructor(tid: uuid, typeName: string | null, subCodec: ICodec) {
    super(tid);
    this.subCodec = subCodec;
    this.typeName = typeName;
  }

  static encodeRange(subCodec: ICodec, buf: WriteBuffer, obj: any): void {
    if (!(obj instanceof Range)) {
      throw new InvalidArgumentError("a Range was expected");
    }

    const elemData = new WriteBuffer();

    if (obj.lower !== null) {
      subCodec.encode(elemData, obj.lower);
    }
    if (obj.upper !== null) {
      subCodec.encode(elemData, obj.upper);
    }

    const elemBuf = elemData.unwrap();

    buf.writeInt32(1 + elemBuf.length);
    buf.writeUInt8(
      obj.isEmpty
        ? RangeFlags.EMPTY
        : (obj.incLower ? RangeFlags.INC_LOWER : 0) |
            (obj.incUpper ? RangeFlags.INC_UPPER : 0) |
            (obj.lower === null ? RangeFlags.EMPTY_LOWER : 0) |
            (obj.upper === null ? RangeFlags.EMPTY_UPPER : 0)
    );
    buf.writeBuffer(elemBuf);
  }

  static decodeRange(subCodec: ICodec, buf: ReadBuffer): any {
    const flags = buf.readUInt8();

    if (flags & RangeFlags.EMPTY) {
      return Range.empty();
    }

    const elemBuf = ReadBuffer.alloc();

    let lower: any = null;
    let upper: any = null;

    if (!(flags & RangeFlags.EMPTY_LOWER)) {
      buf.sliceInto(elemBuf, buf.readInt32());
      lower = subCodec.decode(elemBuf);
      elemBuf.finish();
    }

    if (!(flags & RangeFlags.EMPTY_UPPER)) {
      buf.sliceInto(elemBuf, buf.readInt32());
      upper = subCodec.decode(elemBuf);
      elemBuf.finish();
    }

    return new Range(
      lower,
      upper,
      !!(flags & RangeFlags.INC_LOWER),
      !!(flags & RangeFlags.INC_UPPER)
    );
  }

  encode(buf: WriteBuffer, obj: any): void {
    RangeCodec.encodeRange(this.subCodec, buf, obj);
  }

  decode(buf: ReadBuffer): any {
    return RangeCodec.decodeRange(this.subCodec, buf);
  }

  getSubcodecs(): ICodec[] {
    return [this.subCodec];
  }

  getKind(): CodecKind {
    return "range";
  }
}

export class MultiRangeCodec extends Codec implements ICodec {
  private subCodec: ICodec;
  readonly typeName: string | null;

  constructor(tid: uuid, typeName: string | null, subCodec: ICodec) {
    super(tid);
    this.subCodec = subCodec;
    this.typeName = typeName;
  }

  encode(buf: WriteBuffer, obj: any): void {
    if (!(obj instanceof MultiRange)) {
      throw new InvalidArgumentError("a MultiRange was expected");
    }

    const objLen = obj.length;

    if (objLen > 0x7fffffff) {
      // objLen > MAXINT32
      throw new InvalidArgumentError("too many elements in multirange");
    }

    const subCodec = this.subCodec;
    const elemData = new WriteBuffer();

    for (const item of obj) {
      try {
        RangeCodec.encodeRange(subCodec, elemData, item);
      } catch (e) {
        throw new InvalidArgumentError(`invalid multirange element: $e`);
      }
    }

    const elemBuf = elemData.unwrap();
    if (elemBuf.length > 0x7fffffff - 4) {
      throw new InvalidArgumentError(
        `size of encoded multirange extends allowed ${0x7fffffff - 4} bytes`
      );
    }

    buf
      .writeInt32(4 + elemBuf.length)
      .writeInt32(objLen)
      .writeBuffer(elemBuf);
  }

  decode(buf: ReadBuffer): any {
    const elemCount = buf.readInt32();

    const subCodec = this.subCodec;
    const elemBuf = ReadBuffer.alloc();

    const result = new Array(elemCount);

    for (var i = 0; i < elemCount; i++) {
      const elemLen = buf.readInt32();
      if (elemLen == -1) {
        throw new ProtocolError("unexpected NULL value in multirange");
      } else {
        buf.sliceInto(elemBuf, elemLen);
        result[i] = RangeCodec.decodeRange(subCodec, elemBuf);
        elemBuf.finish();
      }
    }

    return new MultiRange(result);
  }

  getSubcodecs(): ICodec[] {
    return [this.subCodec];
  }

  getKind(): CodecKind {
    return "multirange";
  }
}
