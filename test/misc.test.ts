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

import {decodeInt64ToString} from "../src/compat";
import {WriteBuffer} from "../src/buffer";

test("int64 rendering", () => {
  const genInt = (min: number, max: number): number =>
    Math.floor(Math.random() * (max - min) + min);

  const wbuf = new WriteBuffer();

  const testRender = (inp: number) => {
    wbuf.reset();
    wbuf.writeInt64(inp);
    const buf = wbuf.unwrap();
    const out = decodeInt64ToString(buf);

    expect(out).toBe(inp.toString());
  };

  testRender(-1);
  testRender(0);
  testRender(1);
  testRender(2);
  testRender(-1);
  testRender(-2);
  testRender(111);
  testRender(-113);

  for (let _ = 0; _ < 10000; _++) {
    testRender(genInt(-4503599627370496, 4503599627370496));
    testRender(genInt(-1000, 1000));
  }
});
