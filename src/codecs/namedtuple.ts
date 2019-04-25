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

import * as util from "util";

import {ICodec, Codec, uuid} from "./ifaces";
import {ReadBuffer, WriteBuffer} from "../buffer";

const NAMES_SYMBOL = Symbol.for("edgedb.namedtuple.fields");
const PRIVATE = {};

interface LooseObject {
  [key: string]: any;
}

export class NamedTuple extends Array {
  [_: string]: any;

  constructor(marker: any, len: number) {
    if (marker !== PRIVATE) {
      throw new Error(
        "NamedTuples are not supposed to be instantiated directly"
      );
    }
    super(len);
  }

  toJSON(): LooseObject {
    const names: string[] = this[<any>NAMES_SYMBOL];
    const obj: LooseObject = {};
    for (let i = 0; i < names.length; i++) {
      obj[names[i]] = <any>this[i];
    }
    return obj;
  }

  [util.inspect.custom](depth: number, options: util.InspectOptions): string {
    return (
      "NamedTuple " +
      util.inspect(Array.from(this), options.showHidden, depth, options.colors)
    );
  }
}

export class NamedTupleCodec extends Codec implements ICodec {
  private subCodecs: ICodec[];
  private names: string[];

  constructor(tid: uuid, codecs: ICodec[], names: string[]) {
    super(tid);
    this.subCodecs = codecs;
    this.names = names;
  }

  encode(buf: WriteBuffer, object: any): void {
    throw new Error("not implemented yet");
  }

  decode(buf: ReadBuffer): any {
    const els = buf.readUInt32();
    const subCodecs = this.subCodecs;
    const names = this.names;
    if (els !== subCodecs.length) {
      throw new Error(
        `cannot decode NamedTuple: expected ${
          subCodecs.length
        } elements, got ${els}`
      );
    }

    const elemBuf = ReadBuffer.alloc();
    const result = new NamedTuple(PRIVATE, els);
    for (let i = 0; i < els; i++) {
      const elemLen = buf.readInt32();
      let val = null;
      if (elemLen !== -1) {
        buf.sliceInto(elemBuf, elemLen);
        val = subCodecs[i].decode(elemBuf);
      }
      result[i] = val;
      result[<string>names[i]] = val;
    }

    result[<any>NAMES_SYMBOL] = names;
    return result;
  }
}
