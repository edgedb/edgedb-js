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

import {ReadBuffer, WriteBuffer} from "../buffer";
import {BoolCodec} from "./boolean";
import {ICodec, uuid, Codec} from "./ifaces";
import {
  Int16Codec,
  Int32Codec,
  Int64Codec,
  Float32Codec,
  Float64Codec,
} from "./numbers";
import {BigIntCodec} from "./numerics";
import {StrCodec} from "./text";
import {UUIDCodec} from "./uuid";
import {BytesCodec} from "./bytes";
import {JSONCodec} from "./json";
import {
  DateTimeCodec,
  LocalDateCodec,
  LocalDateTimeCodec,
  LocalTimeCodec,
  DurationCodec,
} from "./datetime";

export const KNOWN_TYPES = new Map<uuid, string>([
  ["00000000000000000000000000000001", "anytype"],
  ["00000000000000000000000000000002", "anytuple"],
  ["000000000000000000000000000000f0", "std"],
  ["000000000000000000000000000000ff", "empty-tuple"],
  ["00000000000000000000000000000100", "std::uuid"],
  ["00000000000000000000000000000101", "std::str"],
  ["00000000000000000000000000000102", "std::bytes"],
  ["00000000000000000000000000000103", "std::int16"],
  ["00000000000000000000000000000104", "std::int32"],
  ["00000000000000000000000000000105", "std::int64"],
  ["00000000000000000000000000000106", "std::float32"],
  ["00000000000000000000000000000107", "std::float64"],
  ["00000000000000000000000000000108", "std::decimal"],
  ["00000000000000000000000000000109", "std::bool"],
  ["0000000000000000000000000000010a", "std::datetime"],
  ["0000000000000000000000000000010b", "std::local_datetime"],
  ["0000000000000000000000000000010c", "std::local_date"],
  ["0000000000000000000000000000010d", "std::local_time"],
  ["0000000000000000000000000000010e", "std::duration"],
  ["0000000000000000000000000000010f", "std::json"],
  ["00000000000000000000000000000110", "std::bigint"],
]);

export const KNOWN_TYPENAMES = (() => {
  const res = new Map<string, uuid>();
  for (const [id, name] of KNOWN_TYPES.entries()) {
    res.set(name, id);
  }
  return res;
})();

///////////////////////////////////////////////////////////////////////////////

export class NullCodec extends Codec implements ICodec {
  encode(_buf: WriteBuffer, _object: any): void {
    throw new Error("null codec cannot used to encode data");
  }

  decode(_buf: ReadBuffer): any {
    throw new Error("null codec cannot used to decode data");
  }
}

///////////////////////////////////////////////////////////////////////////////

export const SCALAR_CODECS = new Map<uuid, ICodec>();

export const NULL_CODEC_ID = "00000000000000000000000000000000";
export const NULL_CODEC = new NullCodec(NULL_CODEC_ID);

///////////////////////////////////////////////////////////////////////////////

function registerScalarCodec(
  typename: string,
  type: new (tid: uuid) => ICodec
): void {
  const id = KNOWN_TYPENAMES.get(typename);
  if (id == null) {
    throw new Error("unknown type name");
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

registerScalarCodec("std::local_date", LocalDateCodec);
registerScalarCodec("std::local_time", LocalTimeCodec);
registerScalarCodec("std::local_datetime", LocalDateTimeCodec);
registerScalarCodec("std::datetime", DateTimeCodec);
registerScalarCodec("std::duration", DurationCodec);
