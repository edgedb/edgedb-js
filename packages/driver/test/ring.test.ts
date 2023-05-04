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

import { RingBuffer, RingBufferError } from "../src/primitives/ring";

test("basic operations", () => {
  const d = new RingBuffer<number>({ capacity: 3 });
  expect(d.length).toBe(0);
  expect(d.full).toBeFalsy();

  d.enq(1);
  expect(d.length).toBe(1);
  expect(d.full).toBeFalsy();

  d.enq(2);
  expect(d.length).toBe(2);
  expect(d.full).toBeTruthy();

  expect(() => {
    d.enq(3);
  }).toThrowError(RingBufferError);

  expect(d.length).toBe(2);

  expect(d.deq()).toBe(1);
  expect(d.length).toBe(1);
  expect(d.full).toBeFalsy();

  d.enq(10);
  expect(d.length).toBe(2);
  expect(d.full).toBeTruthy();
  expect(() => {
    d.enq(300);
  }).toThrowError(RingBufferError);

  expect(d.deq()).toBe(2);
  expect(d.length).toBe(1);
  expect(d.full).toBeFalsy();

  expect(d.deq()).toBe(10);
  expect(d.length).toBe(0);
  expect(d.full).toBeFalsy();

  expect(d.deq()).toBe(undefined);
  expect(d.length).toBe(0);
  expect(d.full).toBeFalsy();
});
