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

import {ICodec, Codec, uuid, CodecKind} from "./ifaces.ts";
import {WriteBuffer, ReadBuffer} from "../primitives/buffer.ts";
import {Range} from "../datatypes/range.ts";
import {InvalidArgumentError} from "../errors/index.ts";

enum RangeFlags {
  EMPTY = 1 << 0,
  INC_LOWER = 1 << 1,
  INC_UPPER = 1 << 2,
  EMPTY_LOWER = 1 << 3,
  EMPTY_UPPER = 1 << 4,
}

export class RangeCodec extends Codec implements ICodec {
  private subCodec: ICodec;

  constructor(tid: uuid, subCodec: ICodec) {
    super(tid);
    this.subCodec = subCodec;
  }

  encode(buf: WriteBuffer, obj: any): void {
    if (!(obj instanceof Range)) {
      throw new InvalidArgumentError("a Range was expected");
    }

    const subCodec = this.subCodec;
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

  decode(buf: ReadBuffer): any {
    const flags = buf.readUInt8();

    if (flags & RangeFlags.EMPTY) {
      return Range.empty();
    }

    const elemBuf = ReadBuffer.alloc();
    const subCodec = this.subCodec;

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

  getSubcodecs(): ICodec[] {
    return [this.subCodec];
  }

  getKind(): CodecKind {
    return "range";
  }
}
