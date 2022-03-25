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

import {ICodec, Codec, uuid, IArgsCodec, CodecKind} from "./ifaces";
import {ReadBuffer, WriteBuffer} from "../primitives/buffer";
import {EmptyTupleCodec} from "./tuple";
import {generateType, NamedTupleConstructor} from "../datatypes/namedtuple";

export class NamedTupleCodec extends Codec implements ICodec, IArgsCodec {
  private subCodecs: ICodec[];
  private newTupleFunc: NamedTupleConstructor;
  private names: string[];
  private namesSet: Set<string>;

  constructor(tid: uuid, codecs: ICodec[], names: string[]) {
    super(tid);
    this.subCodecs = codecs;
    this.names = names;
    this.namesSet = new Set(names);
    this.newTupleFunc = generateType(names);
  }

  encode(_buf: WriteBuffer, _object: any): void {
    throw new Error("Named tuples cannot be passed in query arguments");
  }

  encodeArgs(args: any): Buffer {
    if (args == null) {
      throw new Error("One or more named arguments expected, received null");
    }

    const keys = Object.keys(args);
    const names = this.names;
    const namesSet = this.namesSet;
    const codecs = this.subCodecs;
    const codecsLen = codecs.length;

    if (keys.length > codecsLen) {
      const extraKeys = keys.filter(key => !namesSet.has(key));
      throw new Error(
        `Unused named argument${
          extraKeys.length === 1 ? "" : "s"
        }: "${extraKeys.join('", "')}"`
      );
    }

    if (!codecsLen) {
      return EmptyTupleCodec.BUFFER;
    }

    const elemData = new WriteBuffer();
    for (let i = 0; i < codecsLen; i++) {
      const key = names[i];
      const val = args[key];

      elemData.writeInt32(0); // reserved bytes
      if (val == null) {
        elemData.writeInt32(-1);
      } else {
        const codec = codecs[i];
        codec.encode(elemData, val);
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
        `cannot decode NamedTuple: expected ` +
          `${subCodecs.length} elements, got ${els}`
      );
    }

    const elemBuf = ReadBuffer.alloc();
    const result = this.newTupleFunc();
    for (let i = 0; i < els; i++) {
      buf.discard(4); // reserved
      const elemLen = buf.readInt32();
      let val = null;
      if (elemLen !== -1) {
        buf.sliceInto(elemBuf, elemLen);
        val = subCodecs[i].decode(elemBuf);
        elemBuf.finish();
      }
      result[this.names[i]] = val;
    }

    return result;
  }

  getSubcodecs(): ICodec[] {
    return Array.from(this.subCodecs);
  }

  getKind(): CodecKind {
    return "namedtuple";
  }
}
