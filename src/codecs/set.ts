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

import {ICodec, Codec, uuid} from "./ifaces";
import {WriteBuffer, ReadBuffer} from "../buffer";
import {ArrayCodec} from "./array";
import {Set} from "../datatypes/set";

export class SetCodec extends Codec implements ICodec {
  private subCodec: ICodec;

  constructor(tid: uuid, subCodec: ICodec) {
    super(tid);
    this.subCodec = subCodec;
  }

  encode(_buf: WriteBuffer, _obj: any): void {
    throw new Error("Sets cannot be passed in query arguments");
  }

  decode(buf: ReadBuffer): any {
    if (this.subCodec instanceof ArrayCodec) {
      return this.decodeSetOfArrays(buf);
    } else {
      return this.decodeSet(buf);
    }
  }

  private decodeSetOfArrays(buf: ReadBuffer): any {
    const ndims = buf.readInt32();
    if (ndims === 0) {
      return new Set(0);
    }
    if (ndims !== 1) {
      throw new Error(`expected 1-dimensional array of records of arrays`);
    }

    buf.discard(4); // ignore flags

    const len = buf.readUInt32();

    buf.discard(4); // ignore the lower bound info

    const result = new Set(len);
    const elemBuf = ReadBuffer.alloc();
    const subCodec = this.subCodec;

    for (let i = 0; i < len; i++) {
      buf.discard(4); // ignore array element size

      const recSize = buf.readUInt32();
      if (recSize !== 1) {
        throw new Error(
          "expected a record with a single element as an array set " +
            "element envelope"
        );
      }

      const elemLen = buf.readInt32();
      if (elemLen === -1) {
        throw new Error("unexpected NULL value in array set element");
      }

      buf.sliceInto(elemBuf, elemLen);
      result[i] = subCodec.decode(elemBuf);
    }

    return result;
  }

  private decodeSet(buf: ReadBuffer): any {
    const ndims = buf.readInt32();
    if (ndims === 0) {
      return new Set(0);
    }
    if (ndims !== 1) {
      throw new Error(`invalid set dimensinality: ${ndims}`);
    }

    buf.discard(4); // ignore flags

    const len = buf.readUInt32();

    buf.discard(4); // ignore the lower bound info

    const result = new Set(len);
    const elemBuf = ReadBuffer.alloc();
    const subCodec = this.subCodec;

    for (let i = 0; i < len; i++) {
      const elemLen = buf.readInt32();
      if (elemLen === -1) {
        result[i] = null;
      } else {
        buf.sliceInto(elemBuf, elemLen);
        result[i] = subCodec.decode(elemBuf);
      }
    }

    return result;
  }
}
