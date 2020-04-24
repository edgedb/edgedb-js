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

import {KNOWN_TYPENAMES} from "./consts";

import {ICodec, Codec, uuid, IArgsCodec, CodecKind} from "./ifaces";
import {ReadBuffer, WriteBuffer} from "../buffer";

import {
  introspectMethod,
  IntrospectableType,
  CollectionInfo,
} from "../datatypes/introspect";

class Tuple extends Array implements IntrospectableType {
  [introspectMethod](): CollectionInfo {
    return {kind: "tuple"};
  }
}

export class TupleCodec extends Codec implements ICodec, IArgsCodec {
  private subCodecs: ICodec[];

  constructor(tid: uuid, codecs: ICodec[]) {
    super(tid);
    this.subCodecs = codecs;
  }

  encode(_buf: WriteBuffer, _object: any): void {
    throw new Error("Tuples cannot be passed in query arguments");
  }

  encodeArgs(args: any): Buffer {
    if (!Array.isArray(args)) {
      throw new Error("an array of arguments was expected");
    }

    const codecs = this.subCodecs;
    const codecsLen = codecs.length;

    if (args.length !== codecsLen) {
      throw new Error(
        `expected ${codecsLen} argument${codecsLen === 1 ? "" : "s"}, got ${
          args.length
        }`
      );
    }

    if (!codecsLen) {
      return EmptyTupleCodec.BUFFER;
    }

    const elemData = new WriteBuffer();
    for (let i = 0; i < codecsLen; i++) {
      const arg = args[i];
      elemData.writeInt32(0); // reserved bytes
      if (arg == null) {
        elemData.writeInt32(-1);
      } else {
        const codec = codecs[i];
        codec.encode(elemData, arg);
      }
    }

    const elemBuf = elemData.unwrap();
    const buf = new WriteBuffer();
    buf.writeInt32(4 + elemBuf.length);
    buf.writeInt32(codecsLen);
    buf.writeBuffer(elemBuf);
    return buf.unwrap();
  }

  decode(buf: ReadBuffer): any {
    const els = buf.readUInt32();
    const subCodecs = this.subCodecs;
    if (els !== subCodecs.length) {
      throw new Error(
        `cannot decode Tuple: expected ` +
          `${subCodecs.length} elements, got ${els}`
      );
    }

    const elemBuf = ReadBuffer.alloc();
    const result = new Tuple(els);
    for (let i = 0; i < els; i++) {
      buf.discard(4); // reserved
      const elemLen = buf.readInt32();
      if (elemLen === -1) {
        result[i] = null;
      } else {
        buf.sliceInto(elemBuf, elemLen);
        result[i] = subCodecs[i].decode(elemBuf);
        elemBuf.finish();
      }
    }

    return result;
  }

  getSubcodecs(): ICodec[] {
    return Array.from(this.subCodecs);
  }

  getKind(): CodecKind {
    return "tuple";
  }
}

export class EmptyTupleCodec extends Codec implements ICodec {
  static BUFFER: Buffer = new WriteBuffer()
    .writeInt32(4)
    .writeInt32(0)
    .unwrap();

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

  getSubcodecs(): ICodec[] {
    return [];
  }

  getKind(): CodecKind {
    return "tuple";
  }
}

export const EMPTY_TUPLE_CODEC_ID = KNOWN_TYPENAMES.get("empty-tuple")!;
export const EMPTY_TUPLE_CODEC = new EmptyTupleCodec(EMPTY_TUPLE_CODEC_ID);
