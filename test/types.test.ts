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

import {UUID} from "../src/index";

test("types: UUID", async () => {
  expect(() => {
    UUID.fromString("aaa");
  }).toThrow("invalid UUID");

  expect(() => {
    UUID.fromBuffer(Buffer.allocUnsafe(10));
  }).toThrow("expected buffer to be 16");

  const uuid = UUID.fromString("1733d49c-66ed-11e9-aa14-784f439c9965");
  expect(util.inspect(uuid)).toBe(
    "UUID [ '1733d49c66ed11e9aa14784f439c9965' ]"
  );
});
