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

import {Buffer} from "../globals.deno.ts";

import {ReadBuffer, WriteBuffer} from "../primitives/buffer.ts";
import {BoolCodec} from "./boolean.ts";
import {ICodec, uuid, Codec, CodecKind} from "./ifaces.ts";
import {
  Int16Codec,
  Int32Codec,
  Int64Codec,
  Float32Codec,
  Float64Codec,
} from "./numbers.ts";
import {BigIntCodec} from "./numerics.ts";
import {StrCodec} from "./text.ts";
import {UUIDCodec} from "./uuid.ts";
import {BytesCodec} from "./bytes.ts";
import {JSONCodec} from "./json.ts";
import {
  DateTimeCodec,
  LocalDateCodec,
  LocalDateTimeCodec,
  LocalTimeCodec,
  DurationCodec,
  RelativeDurationCodec,
  DateDurationCodec,
} from "./datetime.ts";
import {ConfigMemoryCodec} from "./memory.ts";
import {InternalClientError} from "../errors/index.ts";

import {INVALID_CODEC_ID, KNOWN_TYPENAMES, NULL_CODEC_ID} from "./consts.ts";

///////////////////////////////////////////////////////////////////////////////

export class NullCodec extends Codec implements ICodec {
  static BUFFER: Buffer = new WriteBuffer().writeInt32(0).unwrap();
  encode(_buf: WriteBuffer, _object: any): void {
    throw new InternalClientError("null codec cannot used to encode data");
  }

  decode(_buf: ReadBuffer): any {
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
  type: new (tid: uuid) => ICodec
): void {
  const id = KNOWN_TYPENAMES.get(typename);
  if (id == null) {
    throw new InternalClientError("unknown type name");
  }

  SCALAR_CODECS.set(id, new type(id));
}

registerScalarCodec("std::int16", Int16Codec);
registerScalarCodec("std::int32", Int32Codec);
registerScalarCodec("std::int64", Int64Codec);

registerScalarCodec("std::float32", Float32Codec);
registerScalarCodec("std::float64", Float64Codec);

registerScalarCodec("std::bigint", BigIntCodec);

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
