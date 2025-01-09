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

import type { ReadBuffer } from "../primitives/buffer";
import { WriteBuffer } from "../primitives/buffer";
import { BoolCodec } from "./boolean";
import { type ICodec, type uuid, type CodecKind, Codec } from "./ifaces";
import {
  Int16Codec,
  Int32Codec,
  Int64Codec,
  Float32Codec,
  Float64Codec,
} from "./numbers";
import { BigIntCodec, DecimalStringCodec } from "./numerics";
import { StrCodec } from "./text";
import { UUIDCodec } from "./uuid";
import { BytesCodec } from "./bytes";
import { JSONCodec, PgTextJSONCodec } from "./json";
import {
  DateTimeCodec,
  LocalDateCodec,
  LocalDateTimeCodec,
  LocalTimeCodec,
  DurationCodec,
  RelativeDurationCodec,
  DateDurationCodec,
} from "./datetime";
import { ConfigMemoryCodec } from "./memory";
import {
  PgVectorCodec,
  PgVectorHalfVecCodec,
  PgVectorSparseVecCodec,
} from "./pgvector";
import { InternalClientError } from "../errors";

import type { CodecContext } from "./context";

import { INVALID_CODEC_ID, KNOWN_TYPENAMES, NULL_CODEC_ID } from "./consts";

import type { Float16Array } from "../adapter.shared.node";

// Types for Client.withCodecs() API:
export namespace Codecs {
  export type Codec<T> = {
    encode: (data: any) => T;
    decode: (data: T) => any;
  };

  export type AnyCodec = Codec<any>;

  export type BoolCodec = Codec<boolean>;
  export type Int16Codec = Codec<number>;
  export type Int32Codec = Codec<number>;
  export type Int64Codec = Codec<bigint>;
  export type Float32Codec = Codec<number>;
  export type Float64Codec = Codec<number>;
  export type BigIntCodec = Codec<string>;
  export type DecimalCodec = Codec<string>;
  export type BytesCodec = Codec<Uint8Array>;
  export type DateTimeCodec = Codec<bigint>;
  export type LocalDateTimeCodec = Codec<bigint>;
  export type LocalDateCodec = Codec<
    [years: number, months: number, days: number]
  >;
  export type LocalTimeCodec = Codec<bigint>;
  export type DurationCodec = Codec<bigint>;
  export type RelativeDurationCodec = Codec<
    [months: number, days: number, uSeconds: bigint]
  >;
  export type DateDurationCodec = Codec<[months: number, days: number]>;
  export type JsonCodec = Codec<string>;
  export type MemoryCodec = Codec<bigint>;
  export type PgVectorCodec = Codec<Float32Array>;
  export type PGVectorSparseCodec = Codec<
    [dimensions: number, indexes: Uint32Array, values: Float32Array]
  >;
  export type StrCodec = Codec<string>;
  export type UUIDCodec = Codec<Uint8Array>;

  // TODO: Figure out if we can drop the dep
  // on an external package for Float16Array.
  export type PGVectorHalfCodec = Codec<Float16Array>;

  export type KnownCodecs = {
    ["std::bool"]: BoolCodec;
    ["std::int16"]: Int16Codec;
    ["std::int32"]: Int32Codec;
    ["std::int64"]: Int64Codec;
    ["std::float32"]: Float32Codec;
    ["std::float64"]: Float64Codec;
    ["std::bigint"]: BigIntCodec;
    ["std::decimal"]: DecimalCodec;
    ["std::bytes"]: BytesCodec;
    ["std::datetime"]: DateTimeCodec;
    ["std::duration"]: DurationCodec;
    ["std::json"]: JsonCodec;
    ["std::str"]: StrCodec;
    ["std::uuid"]: UUIDCodec;

    ["cal::local_date"]: LocalDateCodec;
    ["cal::local_time"]: LocalTimeCodec;
    ["cal::local_datetime"]: LocalDateTimeCodec;
    ["cal::relative_duration"]: RelativeDurationCodec;
    ["cal::date_duration"]: DateDurationCodec;

    ["cfg::memory"]: MemoryCodec;

    ["std::pg::json"]: JsonCodec;
    ["std::pg::timestampz"]: DateTimeCodec;
    ["std::pg::timestamp"]: LocalDateTimeCodec;
    ["std::pg::date"]: LocalDateCodec;
    ["std::pg::interval"]: RelativeDurationCodec;

    ["ext::pgvector::vector"]: PgVectorCodec;
    ["ext::pgvector::halfvec"]: PGVectorHalfCodec;
    ["ext::pgvector::sparsevec"]: PGVectorSparseCodec;
  };

  export type CodecSpec = Partial<KnownCodecs> & {
    [key: string]: AnyCodec;
  };
}

///////////////////////////////////////////////////////////////////////////////

export class NullCodec extends Codec implements ICodec {
  static BUFFER: Uint8Array = new WriteBuffer().writeInt32(0).unwrap();
  encode(_buf: WriteBuffer, _object: any): void {
    throw new InternalClientError("null codec cannot used to encode data");
  }

  decode(_buf: ReadBuffer, _ctx: CodecContext): any {
    throw new InternalClientError("null codec cannot used to decode data");
  }

  getSubcodecs(): ICodec[] {
    return [];
  }

  getKind(): CodecKind {
    return "scalar";
  }
}

///////////////////////////////////////////////////////////////////////////////

export const SCALAR_CODECS = new Map<uuid, ICodec>();

export const NULL_CODEC = new NullCodec(NULL_CODEC_ID);

export const INVALID_CODEC = new NullCodec(INVALID_CODEC_ID);

///////////////////////////////////////////////////////////////////////////////

function registerScalarCodec(
  typename: string,
  type: new (tid: uuid, typename: string) => ICodec,
): void {
  const id = KNOWN_TYPENAMES.get(typename);
  if (id == null) {
    throw new InternalClientError("unknown type name");
  }

  SCALAR_CODECS.set(id, new type(id, typename));
}

registerScalarCodec("std::int16", Int16Codec);
registerScalarCodec("std::int32", Int32Codec);
registerScalarCodec("std::int64", Int64Codec);

registerScalarCodec("std::float32", Float32Codec);
registerScalarCodec("std::float64", Float64Codec);

registerScalarCodec("std::bigint", BigIntCodec);
registerScalarCodec("std::decimal", DecimalStringCodec);

registerScalarCodec("std::bool", BoolCodec);

registerScalarCodec("std::json", JSONCodec);
registerScalarCodec("std::str", StrCodec);
registerScalarCodec("std::bytes", BytesCodec);

registerScalarCodec("std::uuid", UUIDCodec);

registerScalarCodec("cal::local_date", LocalDateCodec);
registerScalarCodec("cal::local_time", LocalTimeCodec);
registerScalarCodec("cal::local_datetime", LocalDateTimeCodec);
registerScalarCodec("std::datetime", DateTimeCodec);
registerScalarCodec("std::duration", DurationCodec);
registerScalarCodec("cal::relative_duration", RelativeDurationCodec);
registerScalarCodec("cal::date_duration", DateDurationCodec);

registerScalarCodec("cfg::memory", ConfigMemoryCodec);

registerScalarCodec("std::pg::json", PgTextJSONCodec);
registerScalarCodec("std::pg::timestamptz", DateTimeCodec);
registerScalarCodec("std::pg::timestamp", LocalDateTimeCodec);
registerScalarCodec("std::pg::date", LocalDateCodec);
registerScalarCodec("std::pg::interval", RelativeDurationCodec);

registerScalarCodec("ext::pgvector::vector", PgVectorCodec);
registerScalarCodec("ext::pgvector::halfvec", PgVectorHalfVecCodec);
registerScalarCodec("ext::pgvector::sparsevec", PgVectorSparseVecCodec);
