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

import * as edgedb from "../src/index.node";
import {resolveErrorCode} from "../src/errors/resolve";

test("resolve error", () => {
  expect(resolveErrorCode(0x04_02_01_01)).toBe(edgedb.InvalidLinkTargetError);
  expect(resolveErrorCode(0x04_02_01_ff)).toBe(edgedb.InvalidTargetError);
  expect(resolveErrorCode(0x04_02_ff_ff)).toBe(edgedb.InvalidTypeError);
  expect(resolveErrorCode(0x04_ff_ff_ff)).toBe(edgedb.QueryError);
  expect(resolveErrorCode(0xfe_ff_ff_ff)).toBe(edgedb.EdgeDBError);
});
