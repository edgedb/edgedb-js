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

import {ReadBuffer} from "../buffer";
import LRU from "../lru";
import {ICodec, uuid} from "./ifaces";
import {NULL_CODEC_ID, NULL_CODEC, SCALAR_CODECS, KNOWN_TYPES} from "./codecs";
import {EMPTY_TUPLE_CODEC, EMPTY_TUPLE_CODEC_ID, TupleCodec} from "./tuple";
import {ArrayCodec} from "./array";
import {NamedTupleCodec} from "./namedtuple";
import {EnumCodec} from "./enum";

const CODECS_CACHE_SIZE = 1000;
const CODECS_BUILD_CACHE_SIZE = 200;

const CTYPE_SET = 0;
const CTYPE_SHAPE = 1;
const CTYPE_BASE_SCALAR = 2;
const CTYPE_SCALAR = 3;
const CTYPE_TUPLE = 4;
const CTYPE_NAMEDTUPLE = 5;
const CTYPE_ARRAY = 6;
const CTYPE_ENUM = 7;

export class CodecsRegistry {
  private codecsBuildCache: LRU<uuid, ICodec>;
  private codecs: LRU<uuid, ICodec>;

  constructor() {
    this.codecs = new LRU({capacity: CODECS_CACHE_SIZE});
    this.codecsBuildCache = new LRU({capacity: CODECS_BUILD_CACHE_SIZE});
  }

  hasCodec(typeId: uuid): boolean {
    if (this.codecs.has(typeId)) {
      return true;
    }

    return typeId === NULL_CODEC_ID || typeId === EMPTY_TUPLE_CODEC_ID;
  }

  getCodec(typeId: uuid): ICodec | null {
    const codec = this.codecs.get(typeId);
    if (codec != null) {
      return codec;
    }

    if (typeId === EMPTY_TUPLE_CODEC_ID) {
      return EMPTY_TUPLE_CODEC;
    }

    if (typeId === NULL_CODEC_ID) {
      return NULL_CODEC;
    }

    return null;
  }

  buildCodec(spec: Buffer): ICodec {
    const frb = new ReadBuffer(spec);
    const codecsList: ICodec[] = [];
    let codec: ICodec | null = null;

    while (frb.length) {
      codec = this._buildCodec(frb, codecsList);
      if (codec == null) {
        continue;
      }
      codecsList.push(codec);
      this.codecs.set(codec.tid, codec);
    }

    if (codec == null) {
      throw new Error("could not build a codec");
    }

    return codec;
  }

  private _buildCodec(frb: ReadBuffer, cl: ICodec[]): ICodec | null {
    const t = frb.readUInt8();
    const tid = frb.readUUID();

    let res = this.codecs.get(tid);
    if (res == null) {
      res = this.codecsBuildCache.get(tid);
    }

    if (res != null) {
      // We have a codec for this "tid"; advance the buffer
      // so that we can process the next codec.

      switch (t) {
        case CTYPE_SET: {
          frb.discard(2);
          break;
        }

        case CTYPE_SHAPE: {
          const els = frb.readUInt16();
          for (let i = 0; i < els; i++) {
            frb.discard(1);
            frb.discard(frb.readUInt16() + 2);
          }
          break;
        }

        case CTYPE_BASE_SCALAR: {
          break;
        }

        case CTYPE_SCALAR: {
          frb.discard(2);
          break;
        }

        case CTYPE_TUPLE: {
          const els = frb.readUInt16();
          frb.discard(2 * els);
          break;
        }

        case CTYPE_NAMEDTUPLE: {
          const els = frb.readUInt16();
          for (let i = 0; i < els; i++) {
            frb.discard(2 + frb.readUInt16());
          }
          break;
        }

        case CTYPE_ARRAY: {
          frb.discard(2);
          const els = frb.readUInt16();
          if (els !== 1) {
            throw new Error(
              "cannot handle arrays with more than one dimension"
            );
          }
          frb.discard(4);
          break;
        }

        case CTYPE_ENUM: {
          const els = frb.readUInt16();
          for (let i = 0; i < els; i++) {
            frb.discard(frb.readUInt16());
          }
          break;
        }

        default: {
          if (t >= 0xf0 && t <= 0xff) {
            frb.discard(frb.readUInt16());
          } else {
            throw new Error(
              `no codec implementation for EdgeDB data class ${t}`
            );
          }
        }
      }

      return res;
    }

    switch (t) {
      case CTYPE_BASE_SCALAR: {
        res = SCALAR_CODECS.get(tid);
        break;
      }

      case CTYPE_ARRAY: {
        const pos = frb.readUInt16();
        const els = frb.readUInt16();
        if (els !== 1) {
          throw new Error("cannot handle arrays with more than one dimension");
        }
        const dimLen = frb.readInt32();
        const subCodec = cl[pos];
        if (subCodec == null) {
          throw new Error("could not build array codec: missing subcodec");
        }
        res = new ArrayCodec(tid, subCodec, dimLen);
        break;
      }

      case CTYPE_TUPLE: {
        const els = frb.readUInt16();
        const codecs = new Array(els);
        for (let i = 0; i < els; i++) {
          const pos = frb.readUInt16();
          const subCodec = cl[pos];
          if (subCodec == null) {
            throw new Error("could not build tuple codec: missing subcodec");
          }
          codecs[i] = subCodec;
        }
        res = new TupleCodec(tid, codecs);
        break;
      }

      case CTYPE_NAMEDTUPLE: {
        const els = frb.readUInt16();
        const codecs = new Array(els);
        const names = new Array(els);
        for (let i = 0; i < els; i++) {
          const strLen = frb.readUInt16();
          names[i] = frb.readBuffer(strLen).toString("utf8");

          const pos = frb.readUInt16();
          const subCodec = cl[pos];
          if (subCodec == null) {
            throw new Error(
              "could not build namedtuple codec: missing subcodec"
            );
          }
          codecs[i] = subCodec;
        }
        res = new NamedTupleCodec(tid, codecs, names);
        break;
      }

      case CTYPE_ENUM: {
        /* There's no way to customize ordering in JS, so we
           simply ignore that information and unpack enums into
           simple strings.
        */
        const els = frb.readUInt16();
        for (let i = 0; i < els; i++) {
          frb.discard(frb.readUInt16());
        }
        res = new EnumCodec(tid);
        break;
      }
    }

    if (res == null) {
      if (KNOWN_TYPES.has(tid)) {
        throw new Error(
          `could not build a codec for ${KNOWN_TYPES.get(tid)} type`
        );
      } else {
        throw new Error(`could not build a codec for ${tid} type`);
      }
    }

    this.codecsBuildCache.set(tid, res);
    return res;
  }
}
