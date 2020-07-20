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

type uuid = string;

export const NULL_CODEC_ID = "00000000000000000000000000000000";

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
  ["0000000000000000000000000000010b", "cal::local_datetime"],
  ["0000000000000000000000000000010c", "cal::local_date"],
  ["0000000000000000000000000000010d", "cal::local_time"],
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
