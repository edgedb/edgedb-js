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

import {ReadBuffer, utf8Decoder} from "../primitives/buffer";
import LRU from "../primitives/lru";
import {ICodec, uuid, ScalarCodec} from "./ifaces";
import {NULL_CODEC, SCALAR_CODECS} from "./codecs";
import {NULL_CODEC_ID, KNOWN_TYPES, KNOWN_TYPENAMES} from "./consts";
import {EMPTY_TUPLE_CODEC, EMPTY_TUPLE_CODEC_ID, TupleCodec} from "./tuple";
import * as numerics from "./numerics";
import * as numbers from "./numbers";
import * as datecodecs from "./datetime";
import {JSONStringCodec} from "./json";
import {ArrayCodec} from "./array";
import {NamedTupleCodec} from "./namedtuple";
import {EnumCodec} from "./enum";
import {ObjectCodec} from "./object";
import {SetCodec} from "./set";
import {RangeCodec} from "./range";
import {ProtocolVersion} from "../ifaces";
import {versionGreaterThanOrEqual} from "../utils";
import {SparseObjectCodec} from "./sparseObject";
import {ProtocolError, InternalClientError} from "../errors";

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
const CTYPE_INPUT_SHAPE = 8;
const CTYPE_RANGE = 9;

export interface CustomCodecSpec {
  decimal_string?: boolean;
  int64_bigint?: boolean;
  datetime_localDatetime?: boolean;
  json_string?: boolean;
}

const DECIMAL_TYPEID = KNOWN_TYPENAMES.get("std::decimal")!;
const INT64_TYPEID = KNOWN_TYPENAMES.get("std::int64")!;
const DATETIME_TYPEID = KNOWN_TYPENAMES.get("std::datetime")!;
const JSON_TYPEID = KNOWN_TYPENAMES.get("std::json")!;

export class CodecsRegistry {
  private codecsBuildCache: LRU<uuid, ICodec>;
  private codecs: LRU<uuid, ICodec>;
  private customScalarCodecs: Map<uuid, ICodec>;

  constructor() {
    this.codecs = new LRU({capacity: CODECS_CACHE_SIZE});
    this.codecsBuildCache = new LRU({capacity: CODECS_BUILD_CACHE_SIZE});
    this.customScalarCodecs = new Map();
  }

  setCustomCodecs({
    decimal_string,
    int64_bigint,
    datetime_localDatetime,
    json_string
  }: CustomCodecSpec = {}): void {
    // This is a private API and it will change in the future.

    if (decimal_string) {
      this.customScalarCodecs.set(
        DECIMAL_TYPEID,
        new numerics.DecimalStringCodec(DECIMAL_TYPEID)
      );
    } else {
      this.customScalarCodecs.delete(DECIMAL_TYPEID);
    }

    if (int64_bigint) {
      this.customScalarCodecs.set(
        INT64_TYPEID,
        new numbers.Int64BigintCodec(INT64_TYPEID)
      );
    } else {
      this.customScalarCodecs.delete(INT64_TYPEID);
    }

    if (datetime_localDatetime) {
      this.customScalarCodecs.set(
        DATETIME_TYPEID,
        new datecodecs.LocalDateTimeCodec(DATETIME_TYPEID)
      );
    } else {
      this.customScalarCodecs.delete(DATETIME_TYPEID);
    }

    if (json_string) {
      this.customScalarCodecs.set(
        JSON_TYPEID,
        new JSONStringCodec(JSON_TYPEID)
      );
    } else {
      this.customScalarCodecs.delete(JSON_TYPEID);
    }
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

  buildCodec(spec: Uint8Array, protocolVersion: ProtocolVersion): ICodec {
    const frb = new ReadBuffer(spec);
    const codecsList: ICodec[] = [];
    let codec: ICodec | null = null;

    while (frb.length) {
      codec = this._buildCodec(frb, codecsList, protocolVersion);
      if (codec == null) {
        // An annotation; ignore.
        continue;
      }
      codecsList.push(codec);
      this.codecs.set(codec.tid, codec);
    }

    if (!codecsList.length) {
      throw new InternalClientError("could not build a codec");
    }

    return codecsList[codecsList.length - 1];
  }

  private _buildCodec(
    frb: ReadBuffer,
    cl: ICodec[],
    protocolVersion: ProtocolVersion
  ): ICodec | null {
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

        case CTYPE_SHAPE:
        case CTYPE_INPUT_SHAPE: {
          const els = frb.readUInt16();
          for (let i = 0; i < els; i++) {
            if (versionGreaterThanOrEqual(protocolVersion, [0, 11])) {
              frb.discard(5); // 4 (flags) + 1 (cardinality)
            } else {
              frb.discard(1); // flags
            }

            const elm_length = frb.readUInt32();
            frb.discard(elm_length + 2);
          }
          break;
        }

        case CTYPE_BASE_SCALAR: {
          break;
        }

        case CTYPE_RANGE:
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
            const elm_length = frb.readUInt32();
            frb.discard(elm_length + 2);
          }
          break;
        }

        case CTYPE_ARRAY: {
          frb.discard(2);
          const els = frb.readUInt16();
          if (els !== 1) {
            throw new ProtocolError(
              "cannot handle arrays with more than one dimension"
            );
          }
          frb.discard(4);
          break;
        }

        case CTYPE_ENUM: {
          const els = frb.readUInt16();
          for (let i = 0; i < els; i++) {
            const elm_length = frb.readUInt32();
            frb.discard(elm_length);
          }
          break;
        }

        default: {
          if (t >= 0x7f && t <= 0xff) {
            const ann_length = frb.readUInt32();
            if (t === 0xff) {
              const typeName = utf8Decoder.decode(frb.readBuffer(ann_length));
              const codec =
                this.codecs.get(tid) ?? this.codecsBuildCache.get(tid);
              if (codec instanceof ScalarCodec) {
                codec.setTypeName(typeName);
              }
            } else {
              frb.discard(ann_length);
            }
            return null;
          } else {
            throw new InternalClientError(
              `no codec implementation for EdgeDB data class ${t}`
            );
          }
        }
      }

      return res;
    }

    switch (t) {
      case CTYPE_BASE_SCALAR: {
        res = this.customScalarCodecs.get(tid);
        if (res != null) {
          break;
        }

        res = SCALAR_CODECS.get(tid);
        if (!res) {
          if (KNOWN_TYPES.has(tid)) {
            throw new InternalClientError(
              `no JS codec for ${KNOWN_TYPES.get(tid)}`
            );
          }

          throw new InternalClientError(
            `no JS codec for the type with ID ${tid}`
          );
        }
        if (!(res instanceof ScalarCodec)) {
          throw new ProtocolError(
            "could not build scalar codec: base scalar is a non-scalar codec"
          );
        }
        break;
      }

      case CTYPE_SHAPE:
      case CTYPE_INPUT_SHAPE: {
        const els = frb.readUInt16();
        const codecs: ICodec[] = new Array(els);
        const names: string[] = new Array(els);
        const flags: number[] = new Array(els);
        const cards: number[] = new Array(els);

        for (let i = 0; i < els; i++) {
          let flag: number;
          let card: number;
          if (versionGreaterThanOrEqual(protocolVersion, [0, 11])) {
            flag = frb.readUInt32();
            card = frb.readUInt8(); // cardinality
          } else {
            flag = frb.readUInt8();
            card = 0;
          }

          const name = frb.readString();

          const pos = frb.readUInt16();
          const subCodec = cl[pos];
          if (subCodec == null) {
            throw new ProtocolError(
              "could not build object codec: missing subcodec"
            );
          }

          codecs[i] = subCodec;
          names[i] = name;
          flags[i] = flag!;
          cards[i] = card!;
        }

        res =
          t === CTYPE_INPUT_SHAPE
            ? new SparseObjectCodec(tid, codecs, names)
            : new ObjectCodec(tid, codecs, names, flags, cards);
        break;
      }

      case CTYPE_SET: {
        const pos = frb.readUInt16();
        const subCodec = cl[pos];
        if (subCodec == null) {
          throw new ProtocolError(
            "could not build set codec: missing subcodec"
          );
        }
        res = new SetCodec(tid, subCodec);
        break;
      }

      case CTYPE_SCALAR: {
        const pos = frb.readUInt16();
        res = cl[pos];
        if (res == null) {
          throw new ProtocolError(
            "could not build scalar codec: missing a codec for base scalar"
          );
        }
        if (!(res instanceof ScalarCodec)) {
          throw new ProtocolError(
            "could not build scalar codec: base scalar has a non-scalar codec"
          );
        }
        res = <ICodec>res.derive(tid);
        break;
      }

      case CTYPE_ARRAY: {
        const pos = frb.readUInt16();
        const els = frb.readUInt16();
        if (els !== 1) {
          throw new ProtocolError(
            "cannot handle arrays with more than one dimension"
          );
        }
        const dimLen = frb.readInt32();
        const subCodec = cl[pos];
        if (subCodec == null) {
          throw new ProtocolError(
            "could not build array codec: missing subcodec"
          );
        }
        res = new ArrayCodec(tid, subCodec, dimLen);
        break;
      }

      case CTYPE_TUPLE: {
        const els = frb.readUInt16();
        if (els === 0) {
          res = EMPTY_TUPLE_CODEC;
        } else {
          const codecs = new Array(els);
          for (let i = 0; i < els; i++) {
            const pos = frb.readUInt16();
            const subCodec = cl[pos];
            if (subCodec == null) {
              throw new ProtocolError(
                "could not build tuple codec: missing subcodec"
              );
            }
            codecs[i] = subCodec;
          }
          res = new TupleCodec(tid, codecs);
        }
        break;
      }

      case CTYPE_NAMEDTUPLE: {
        const els = frb.readUInt16();
        const codecs = new Array(els);
        const names = new Array(els);
        for (let i = 0; i < els; i++) {
          names[i] = frb.readString();

          const pos = frb.readUInt16();
          const subCodec = cl[pos];
          if (subCodec == null) {
            throw new ProtocolError(
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
        const values: string[] = [];
        for (let i = 0; i < els; i++) {
          values.push(frb.readString());
        }
        res = new EnumCodec(tid, null, values);
        break;
      }

      case CTYPE_RANGE: {
        const pos = frb.readUInt16();
        const subCodec = cl[pos];
        if (subCodec == null) {
          throw new ProtocolError(
            "could not build range codec: missing subcodec"
          );
        }
        res = new RangeCodec(tid, subCodec);
        break;
      }
    }

    if (res == null) {
      if (KNOWN_TYPES.has(tid)) {
        throw new InternalClientError(
          `could not build a codec for ${KNOWN_TYPES.get(tid)} type`
        );
      } else {
        throw new InternalClientError(
          `could not build a codec for ${tid} type`
        );
      }
    }

    this.codecsBuildCache.set(tid, res);
    return res;
  }
}
