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

import {KNOWN_TYPENAMES} from "./codecs";

import {ICodec, Codec, uuid} from "./ifaces";
import {ReadBuffer, WriteBuffer} from "../buffer";

class Tuple extends Array {}

export class TupleCodec extends Codec implements ICodec {
  private subCodecs: ICodec[];

  constructor(tid: uuid, codecs: ICodec[]) {
    super(tid);
    this.subCodecs = codecs;
  }

  encode(buf: WriteBuffer, object: any): void {
    throw new Error("Tuples cannot be passed in query arguments");
  }

  decode(buf: ReadBuffer): any {
    const els = buf.readUInt32();
    const subCodecs = this.subCodecs;
    if (els !== subCodecs.length) {
      throw new Error(
        `cannot decode Tuple: expected ${
          subCodecs.length
        } elements, got ${els}`
      );
    }

    const elemBuf = ReadBuffer.alloc();
    const result = new Tuple(els);
    for (let i = 0; i < els; i++) {
      const elemLen = buf.readInt32();
      if (elemLen === -1) {
        result[i] = null;
      } else {
        buf.sliceInto(elemBuf, elemLen);
        result[i] = subCodecs[i].decode(elemBuf);
      }
    }

    return result;
  }
}

export class EmptyTupleCodec extends Codec implements ICodec {
  encode(buf: WriteBuffer, object: any): void {
    if (!Array.isArray(object)) {
      throw new Error("cannot encode empty Tuple: expected an array");
    }
    if (object.length) {
      throw new Error(
        `cannot encode empty Tuple: expected 0 elements got ${object.length}`
      );
    }
    buf.writeInt32(4);
    buf.writeInt32(0);
  }

  decode(buf: ReadBuffer): any {
    const els = buf.readInt32();
    if (els !== 0) {
      throw new Error(
        `cannot decode empty Tuple: expected 0 elements, received ${els}`
      );
    }
    return new Tuple();
  }
}

export const EMPTY_TUPLE_CODEC_ID = KNOWN_TYPENAMES.get("empty-tuple")!;
export const EMPTY_TUPLE_CODEC = new EmptyTupleCodec(EMPTY_TUPLE_CODEC_ID);
