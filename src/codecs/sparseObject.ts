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
import {ReadBuffer, WriteBuffer} from "../primitives/buffer";

export class SparseObjectCodec extends Codec implements ICodec {
  private codecs: ICodec[];
  private names: string[];

  constructor(tid: uuid, codecs: ICodec[], names: string[]) {
    super(tid);

    this.codecs = codecs;
    this.names = names;
  }

  encode(buf: WriteBuffer, object: any): void {
    const elemBuf = new WriteBuffer();

    let objLen = 0;
    for (const [key, val] of Object.entries(object)) {
      if (val != null) {
        const i = this.names.indexOf(key);
        if (i === -1) {
          throw new Error();
        }
        objLen += 1;
        elemBuf.writeInt32(i);
        this.codecs[i].encode(elemBuf, val);
      }
    }
    const elemData = elemBuf.unwrap();
    buf.writeInt32(4 + elemData.length);
    buf.writeInt32(objLen);
    buf.writeBuffer(elemData);
  }

  decode(buf: ReadBuffer): any {
    const codecs = this.codecs;
    const names = this.names;

    const els = buf.readUInt32();

    const elemBuf = ReadBuffer.alloc();
    const result: any = {};
    for (let _ = 0; _ < els; _++) {
      const i = buf.readUInt32();
      const elemLen = buf.readInt32();
      const name = names[i];
      let val = null;
      if (elemLen !== -1) {
        buf.sliceInto(elemBuf, elemLen);
        val = codecs[i].decode(elemBuf);
        elemBuf.finish();
      }
      result[name] = val;
    }

    return result;
  }

  getSubcodecs(): ICodec[] {
    return Array.from(this.codecs);
  }

  getKind(): CodecKind {
    return "sparse_object";
  }
}
