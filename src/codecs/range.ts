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

import {ICodec, Codec, uuid, CodecKind} from "./ifaces";
import {WriteBuffer, ReadBuffer} from "../primitives/buffer";
import {Range} from "../datatypes/range";

enum Inc {
  LOWER = 1 << 1,
  UPPER = 1 << 2,
}

export class RangeCodec extends Codec implements ICodec {
  private subCodec: ICodec;

  constructor(tid: uuid, subCodec: ICodec) {
    super(tid);
    this.subCodec = subCodec;
  }

  encode(buf: WriteBuffer, obj: any): void {
    if (!(obj instanceof Range)) {
      throw new Error("a Range was expected");
    }

    const subCodec = this.subCodec;
    const elemData = new WriteBuffer();

    subCodec.encode(elemData, obj.lower);
    subCodec.encode(elemData, obj.upper);

    const elemBuf = elemData.unwrap();

    buf.writeInt32(1 + elemBuf.length);
    buf.writeUInt8(
      (obj.incLower ? Inc.LOWER : 0) | (obj.incUpper ? Inc.UPPER : 0)
    );
    buf.writeBuffer(elemBuf);
  }

  decode(buf: ReadBuffer): any {
    const flags = buf.readUInt8();

    const elemBuf = ReadBuffer.alloc();
    const subCodec = this.subCodec;

    buf.sliceInto(elemBuf, buf.readInt32());
    const lower = subCodec.decode(elemBuf);
    elemBuf.finish();

    buf.sliceInto(elemBuf, buf.readInt32());
    const upper = subCodec.decode(elemBuf);
    elemBuf.finish();

    return new Range(
      lower,
      upper,
      !!(flags & Inc.LOWER),
      !!(flags & Inc.UPPER)
    );
  }

  getSubcodecs(): ICodec[] {
    return [this.subCodec];
  }

  getKind(): CodecKind {
    return "range";
  }
}
