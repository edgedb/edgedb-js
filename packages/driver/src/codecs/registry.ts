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

import { ReadBuffer, utf8Decoder } from "../primitives/buffer";
import LRU from "../primitives/lru";
import { type ICodec, type uuid, ScalarCodec } from "./ifaces";
import { NULL_CODEC, SCALAR_CODECS } from "./codecs";
import { NULL_CODEC_ID, KNOWN_TYPES, KNOWN_TYPENAMES } from "./consts";
import { EMPTY_TUPLE_CODEC, EMPTY_TUPLE_CODEC_ID, TupleCodec } from "./tuple";
import * as numbers from "./numbers";
import * as datecodecs from "./datetime";
import { JSONStringCodec, PgTextJSONStringCodec } from "./json";
import { ArrayCodec } from "./array";
import { NamedTupleCodec } from "./namedtuple";
import { EnumCodec } from "./enum";
import { ObjectCodec } from "./object";
import { SetCodec } from "./set";
import { MultiRangeCodec, RangeCodec } from "./range";
import type { ProtocolVersion } from "../ifaces";
import { versionGreaterThanOrEqual } from "../utils";
import { SparseObjectCodec } from "./sparseObject";
import { ProtocolError, InternalClientError } from "../errors";

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
const CTYPE_OBJECT = 10;
const CTYPE_COMPOUND = 11;
const CTYPE_MULTIRANGE = 12;

export interface CustomCodecSpec {
  int64_bigint?: boolean;
  datetime_localDatetime?: boolean;
  json_string?: boolean;
  pg_json_string?: boolean;
  pg_timestamptz_localDatetime?: boolean;
}

const INT64_TYPEID = KNOWN_TYPENAMES.get("std::int64")!;
const DATETIME_TYPEID = KNOWN_TYPENAMES.get("std::datetime")!;
const JSON_TYPEID = KNOWN_TYPENAMES.get("std::json")!;
const PG_JSON_TYPEID = KNOWN_TYPENAMES.get("std::pg::json")!;
const PG_TIMESTAMPTZ_TYPEID = KNOWN_TYPENAMES.get("std::pg::timestamptz")!;

export class CodecsRegistry {
  private codecsBuildCache: LRU<uuid, ICodec>;
  private codecs: LRU<uuid, ICodec>;
  private customScalarCodecs: Map<uuid, ICodec>;

  constructor() {
    this.codecs = new LRU({ capacity: CODECS_CACHE_SIZE });
    this.codecsBuildCache = new LRU({ capacity: CODECS_BUILD_CACHE_SIZE });
    this.customScalarCodecs = new Map();
  }

  setCustomCodecs({
    int64_bigint,
    datetime_localDatetime,
    json_string,
    pg_json_string,
    pg_timestamptz_localDatetime,
  }: CustomCodecSpec = {}): void {
    // This is a private API and it will change in the future.

    if (int64_bigint) {
      this.customScalarCodecs.set(
        INT64_TYPEID,
        new numbers.Int64BigintCodec(INT64_TYPEID, "std::int64"),
      );
    } else {
      this.customScalarCodecs.delete(INT64_TYPEID);
    }

    if (datetime_localDatetime) {
      this.customScalarCodecs.set(
        DATETIME_TYPEID,
        new datecodecs.LocalDateTimeCodec(DATETIME_TYPEID, "std::datetime"),
      );
    } else {
      this.customScalarCodecs.delete(DATETIME_TYPEID);
    }

    if (json_string) {
      this.customScalarCodecs.set(
        JSON_TYPEID,
        new JSONStringCodec(JSON_TYPEID, "std::json"),
      );
    } else {
      this.customScalarCodecs.delete(JSON_TYPEID);
    }

    if (pg_json_string) {
      this.customScalarCodecs.set(
        PG_JSON_TYPEID,
        new PgTextJSONStringCodec(PG_JSON_TYPEID, "std::pg::json"),
      );
    } else {
      this.customScalarCodecs.delete(PG_JSON_TYPEID);
    }

    if (pg_timestamptz_localDatetime) {
      this.customScalarCodecs.set(
        PG_TIMESTAMPTZ_TYPEID,
        new datecodecs.LocalDateTimeCodec(
          PG_TIMESTAMPTZ_TYPEID,
          "std::pg::timestamptz",
        ),
      );
    } else {
      this.customScalarCodecs.delete(PG_TIMESTAMPTZ_TYPEID);
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
      if (versionGreaterThanOrEqual(protocolVersion, [2, 0])) {
        const descLen = frb.readInt32();
        const descBuf = ReadBuffer.alloc();
        frb.sliceInto(descBuf, descLen);
        codec = this._buildCodec(descBuf, codecsList, protocolVersion, true);
        descBuf.finish("unexpected trailing data in type descriptor buffer");
      } else {
        codec = this._buildCodec(frb, codecsList, protocolVersion, false);
      }
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
    protocolVersion: ProtocolVersion,
    isProtoV2: boolean,
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
      if (isProtoV2) {
        frb.discard(frb.length);
        return res;
      }

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
        case CTYPE_MULTIRANGE:
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
              "cannot handle arrays with more than one dimension",
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
              `no codec implementation for EdgeDB data class ${t}`,
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
              `no JS codec for ${KNOWN_TYPES.get(tid)}`,
            );
          }

          throw new InternalClientError(
            `no JS codec for the type with ID ${tid}`,
          );
        }
        if (!(res instanceof ScalarCodec)) {
          throw new ProtocolError(
            "could not build scalar codec: base scalar is a non-scalar codec",
          );
        }
        break;
      }

      case CTYPE_SHAPE:
      case CTYPE_INPUT_SHAPE: {
        if (t === CTYPE_SHAPE && isProtoV2) {
          // const _isEphemeralFreeShape =
          frb.readBoolean();
          // const _objTypePos =
          frb.readUInt16();
        }

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
              "could not build object codec: missing subcodec",
            );
          }

          codecs[i] = subCodec;
          names[i] = name;
          flags[i] = flag!;
          cards[i] = card!;

          if (t === CTYPE_SHAPE && isProtoV2) {
            // const sourceTypePos =
            frb.readUInt16();
            // const _sourceType = cl[sourceTypePos];
          }
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
            "could not build set codec: missing subcodec",
          );
        }
        res = new SetCodec(tid, subCodec);
        break;
      }

      case CTYPE_SCALAR: {
        if (isProtoV2) {
          const typeName = frb.readString();
          // const _isSchemaDefined =
          frb.readBoolean();

          const ancestorCount = frb.readUInt16();
          const ancestors: ICodec[] = [];
          for (let i = 0; i < ancestorCount; i++) {
            const ancestorPos = frb.readUInt16();
            const ancestorCodec = cl[ancestorPos];
            if (ancestorCodec == null) {
              throw new ProtocolError(
                "could not build scalar codec: missing a codec for base scalar",
              );
            }

            if (!(ancestorCodec instanceof ScalarCodec)) {
              throw new ProtocolError(
                `a scalar codec expected for base scalar type, ` +
                  `got ${ancestorCodec}`,
              );
            }
            ancestors.push(ancestorCodec);
          }

          if (ancestorCount === 0) {
            res = this.customScalarCodecs.get(tid) ?? SCALAR_CODECS.get(tid);
            if (res == null) {
              if (KNOWN_TYPES.has(tid)) {
                throw new InternalClientError(
                  `no JS codec for ${KNOWN_TYPES.get(tid)}`,
                );
              }

              throw new InternalClientError(
                `no JS codec for the type with ID ${tid}`,
              );
            }
          } else {
            const baseCodec = ancestors[ancestors.length - 1];
            if (!(baseCodec instanceof ScalarCodec)) {
              throw new ProtocolError(
                `a scalar codec expected for base scalar type, ` +
                  `got ${baseCodec}`,
              );
            }
            res = baseCodec.derive(tid, typeName) as ICodec;
          }
        } else {
          const pos = frb.readUInt16();
          res = cl[pos];
          if (res == null) {
            throw new ProtocolError(
              "could not build scalar codec: missing a codec for base scalar",
            );
          }
          if (!(res instanceof ScalarCodec)) {
            throw new ProtocolError(
              "could not build scalar codec: base scalar has a non-scalar codec",
            );
          }
          res = res.derive(tid, null) as ICodec;
        }
        break;
      }

      case CTYPE_ARRAY: {
        let typeName: string | null = null;
        if (isProtoV2) {
          typeName = frb.readString();
          // const _isSchemaDefined =
          frb.readBoolean();
          const ancestorCount = frb.readUInt16();
          for (let i = 0; i < ancestorCount; i++) {
            // const ancestorPos =
            frb.readUInt16();
            // const _ancestorCodec = cl[ancestorPos];
          }
        }

        const pos = frb.readUInt16();
        const els = frb.readUInt16();
        if (els !== 1) {
          throw new ProtocolError(
            "cannot handle arrays with more than one dimension",
          );
        }
        const dimLen = frb.readInt32();
        const subCodec = cl[pos];
        if (subCodec == null) {
          throw new ProtocolError(
            "could not build array codec: missing subcodec",
          );
        }
        res = new ArrayCodec(tid, typeName, subCodec, dimLen);
        break;
      }

      case CTYPE_TUPLE: {
        let typeName: string | null = null;
        if (isProtoV2) {
          typeName = frb.readString();
          // const _isSchemaDefined =
          frb.readBoolean();
          const ancestorCount = frb.readUInt16();
          for (let i = 0; i < ancestorCount; i++) {
            // const ancestorPos =
            frb.readUInt16();
            // const _ancestorCodec = cl[ancestorPos];
          }
        }

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
                "could not build tuple codec: missing subcodec",
              );
            }
            codecs[i] = subCodec;
          }
          res = new TupleCodec(tid, typeName, codecs);
        }
        break;
      }

      case CTYPE_NAMEDTUPLE: {
        let typeName: string | null = null;
        if (isProtoV2) {
          typeName = frb.readString();
          // const _isSchemaDefined =
          frb.readBoolean();
          const ancestorCount = frb.readUInt16();
          for (let i = 0; i < ancestorCount; i++) {
            // const ancestorPos =
            frb.readUInt16();
            // const _ancestorCodec = cl[ancestorPos];
          }
        }

        const els = frb.readUInt16();
        const codecs = new Array(els);
        const names = new Array(els);
        for (let i = 0; i < els; i++) {
          names[i] = frb.readString();

          const pos = frb.readUInt16();
          const subCodec = cl[pos];
          if (subCodec == null) {
            throw new ProtocolError(
              "could not build namedtuple codec: missing subcodec",
            );
          }
          codecs[i] = subCodec;
        }
        res = new NamedTupleCodec(tid, typeName, codecs, names);
        break;
      }

      case CTYPE_ENUM: {
        let typeName: string | null = null;
        if (isProtoV2) {
          typeName = frb.readString();
          // const _isSchemaDefined =
          frb.readBoolean();
          const ancestorCount = frb.readUInt16();
          for (let i = 0; i < ancestorCount; i++) {
            // const ancestorPos =
            frb.readUInt16();
            // const _ancestorCodec = cl[ancestorPos];
          }
        }
        /* There's no way to customize ordering in JS, so we
           simply ignore that information and unpack enums into
           simple strings.
        */
        const els = frb.readUInt16();
        const values: string[] = [];
        for (let i = 0; i < els; i++) {
          values.push(frb.readString());
        }
        res = new EnumCodec(tid, typeName, null, values);
        break;
      }

      case CTYPE_RANGE: {
        let typeName: string | null = null;
        if (isProtoV2) {
          typeName = frb.readString();
          // const _isSchemaDefined =
          frb.readBoolean();
          const ancestorCount = frb.readUInt16();
          for (let i = 0; i < ancestorCount; i++) {
            // const ancestorPos =
            frb.readUInt16();
            // const _ancestorCodec = cl[ancestorPos];
          }
        }

        const pos = frb.readUInt16();
        const subCodec = cl[pos];
        if (subCodec == null) {
          throw new ProtocolError(
            "could not build range codec: missing subcodec",
          );
        }
        res = new RangeCodec(tid, typeName, subCodec);
        break;
      }

      case CTYPE_OBJECT: {
        // Ignore
        frb.discard(frb.length);
        res = NULL_CODEC;
        break;
      }

      case CTYPE_COMPOUND: {
        // Ignore
        frb.discard(frb.length);
        res = NULL_CODEC;
        break;
      }

      case CTYPE_MULTIRANGE: {
        let typeName: string | null = null;
        if (isProtoV2) {
          typeName = frb.readString();
          // const _isSchemaDefined =
          frb.readBoolean();
          const ancestorCount = frb.readUInt16();
          for (let i = 0; i < ancestorCount; i++) {
            // const ancestorPos =
            frb.readUInt16();
            // const _ancestorCodec = cl[ancestorPos];
          }
        }
        const pos = frb.readUInt16();
        const subCodec = cl[pos];
        if (subCodec == null) {
          throw new ProtocolError(
            "could not build range codec: missing subcodec",
          );
        }
        res = new MultiRangeCodec(tid, typeName, subCodec);
        break;
      }
    }

    if (res == null) {
      if (KNOWN_TYPES.has(tid)) {
        throw new InternalClientError(
          `could not build a codec for ${KNOWN_TYPES.get(tid)} type`,
        );
      } else {
        throw new InternalClientError(
          `could not build a codec for ${tid} type`,
        );
      }
    }

    this.codecsBuildCache.set(tid, res);
    return res;
  }
}
