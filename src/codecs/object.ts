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
import {ONE, AT_LEAST_ONE} from "./consts";
import {
  InvalidArgumentError,
  MissingArgumentError,
  QueryArgumentError,
  UnknownArgumentError,
} from "../errors";

const EDGE_POINTER_IS_IMPLICIT = 1 << 0;
const EDGE_POINTER_IS_LINKPROP = 1 << 1;

export interface ObjectFieldInfo {
  name: string;
  implicit: boolean;
  linkprop: boolean;
}

export class ObjectCodec extends Codec implements ICodec {
  private codecs: ICodec[];
  private fields: ObjectFieldInfo[];
  private namesSet: Set<string>;
  private cardinalities: number[];

  constructor(
    tid: uuid,
    codecs: ICodec[],
    names: string[],
    flags: number[],
    cards: number[]
  ) {
    super(tid);

    this.codecs = codecs;

    this.fields = new Array(names.length);
    this.namesSet = new Set();
    this.cardinalities = cards;

    for (let i = 0; i < names.length; i++) {
      const isLinkprop = !!(flags[i] & EDGE_POINTER_IS_LINKPROP);
      const name = isLinkprop ? `@${names[i]}` : names[i];
      this.fields[i] = {
        name,
        implicit: !!(flags[i] & EDGE_POINTER_IS_IMPLICIT),
        linkprop: isLinkprop,
      };
      this.namesSet.add(name);
    }
  }

  encode(_buf: WriteBuffer, _object: any): void {
    throw new InvalidArgumentError("Objects cannot be passed as arguments");
  }

  encodeArgs(args: any): Buffer {
    if (this.fields[0].name === "0") {
      return this._encodePositionalArgs(args);
    }
    return this._encodeNamedArgs(args);
  }

  _encodePositionalArgs(args: any): Buffer {
    if (!Array.isArray(args)) {
      throw new InvalidArgumentError("an array of arguments was expected");
    }

    const codecs = this.codecs;
    const codecsLen = codecs.length;

    if (args.length !== codecsLen) {
      throw new QueryArgumentError(
        `expected ${codecsLen} argument${codecsLen === 1 ? "" : "s"}, got ${
          args.length
        }`
      );
    }

    const elemData = new WriteBuffer();
    for (let i = 0; i < codecsLen; i++) {
      elemData.writeInt32(0); // reserved
      const arg = args[i];
      if (arg == null) {
        const card = this.cardinalities[i];
        if (card === ONE || card === AT_LEAST_ONE) {
          throw new MissingArgumentError(
            `argument ${this.fields[i].name} is required, but received ${arg}`
          );
        }
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

  _encodeNamedArgs(args: any): Buffer {
    if (args == null) {
      throw new MissingArgumentError(
        "One or more named arguments expected, received null"
      );
    }

    const keys = Object.keys(args);
    const fields = this.fields;
    const namesSet = this.namesSet;
    const codecs = this.codecs;
    const codecsLen = codecs.length;

    if (keys.length > codecsLen) {
      const extraKeys = keys.filter(key => !namesSet.has(key));
      throw new UnknownArgumentError(
        `Unused named argument${
          extraKeys.length === 1 ? "" : "s"
        }: "${extraKeys.join('", "')}"`
      );
    }

    const elemData = new WriteBuffer();
    for (let i = 0; i < codecsLen; i++) {
      const key = fields[i].name;
      const val = args[key];

      elemData.writeInt32(0); // reserved bytes
      if (val == null) {
        const card = this.cardinalities[i];
        if (card === ONE || card === AT_LEAST_ONE) {
          throw new MissingArgumentError(
            `argument ${this.fields[i].name} is required, but received ${val}`
          );
        }
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
    const codecs = this.codecs;
    const fields = this.fields;

    const els = buf.readUInt32();
    if (els !== codecs.length) {
      throw new Error(
        `cannot decode Object: expected ${codecs.length} elements, got ${els}`
      );
    }

    const elemBuf = ReadBuffer.alloc();
    const result: any = {};
    for (let i = 0; i < els; i++) {
      buf.discard(4); // reserved
      const elemLen = buf.readInt32();
      const name = fields[i].name;
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

  getFields(): ObjectFieldInfo[] {
    return Array.from(this.fields);
  }

  getKind(): CodecKind {
    return "object";
  }
}
