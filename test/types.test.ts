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

import {UUID} from "../src/index.node";
import {LocalDate, Duration} from "../src/datatypes/datetime";

test("types: UUID", async () => {
  expect(() => {
    return UUID.fromString("aaa");
  }).toThrow("invalid UUID");

  expect(() => {
    return new UUID(Buffer.allocUnsafe(10));
  }).toThrow("expected buffer to be 16");

  const uuid = UUID.fromString("1733d49c-66ed-11e9-aa14-784f439c9965");
  expect(util.inspect(uuid)).toBe(
    "UUID [ '1733d49c-66ed-11e9-aa14-784f439c9965' ]"
  );

  expect(JSON.stringify([uuid])).toBe(
    '["1733d49c-66ed-11e9-aa14-784f439c9965"]'
  );

  expect(() => {
    // @ts-ignore
    return +uuid;
  }).toThrowError(TypeError("cannot coerce UUID to a number"));
});

test("types: LocalDate", async () => {
  const ld = new LocalDate(2008, 0, 30);
  expect(ld.toString()).toBe("2008-01-30");
  expect(ld.getFullYear()).toBe(2008);
  expect(ld.getDate()).toBe(30);
  expect(ld.getMonth()).toBe(0);

  for (const [y, m, d, n] of [
    [1, 1, 1, 1],
    [1, 12, 31, 365],
    [2, 1, 1, 366],
    [1945, 11, 12, 710347],
  ]) {
    const ld2 = new LocalDate(y, m - 1, d);
    expect(ld2.toOrdinal()).toBe(n);
    const fromord = LocalDate.fromOrdinal(n);
    expect(ld2.toString()).toBe(fromord.toString());
    expect(ld2.toOrdinal()).toBe(fromord.toOrdinal());
  }

  expect(() => {
    return new LocalDate(2008, 12, 11);
  }).toThrow(/invalid monthIndex 12/);

  expect(() => {
    return new LocalDate(2008, 3, 31);
  }).toThrow(/invalid number of days 31.*1\.\.30/);

  expect(() => {
    return new LocalDate(2008, 1, 31);
  }).toThrow(/invalid number of days 31.*1\.\.29/);

  expect(() => {
    return new LocalDate(2009, 1, 31);
  }).toThrow(/invalid number of days 31.*1\.\.28/);
});

test("types: Duration", async () => {
  expect(new Duration(68464977074.011).toString()).toBe("19018:02:57.074011");
});
