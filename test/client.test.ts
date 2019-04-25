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

import connect, {Tuple, NamedTuple, UUID} from "../src/index";

test("fetchAll: basic scalars", async () => {
  const con = await connect();
  let res;
  try {
    res = await con.fetchAll("select {'a', 'bc'}");
    expect(res).toEqual(["a", "bc"]);

    res = await con.fetchAll(
      "select {-1, 0, 15, 281474976710656, 22, -11111};"
    );
    expect(res).toEqual([-1, 0, 15, 281474976710656, 22, -11111]);

    res = await con.fetchAll("select <int32>{-1, 0, 1, 10, 2147483647};");
    expect(res).toEqual([-1, 0, 1, 10, 2147483647]);

    res = await con.fetchAll("select <int16>{-1, 0, 1, 10, 15, 22, -1111};");
    expect(res).toEqual([-1, 0, 1, 10, 15, 22, -1111]);

    res = await con.fetchAll("select {true, false, false, true, false};");
    expect(res).toEqual([true, false, false, true, false]);
  } finally {
    await con.close();
  }
});

test("fetch: tuple", async () => {
  const con = await connect();
  let res;
  try {
    res = await con.fetchAll("select ()");
    expect(res).toEqual([[]]);

    res = await con.fetchOne("select (1,)");
    expect(res).toEqual([1]);

    res = await con.fetchAll("select (1, 'abc')");
    expect(res).toEqual([[1, "abc"]]);

    res = await con.fetchAll("select {(1, 'abc'), (2, 'bcd')}");
    expect(res).toEqual([[1, "abc"], [2, "bcd"]]);
    const t0: Tuple = res[0];

    // Test that the exported type informs TypeScript that
    // it can be iterated over.
    const t0vals = [];
    for (const i of t0) {
      t0vals.push(i);
    }
    expect(t0vals).toEqual([1, "abc"]);

    expect(t0 instanceof Array).toBeTruthy();
    expect(t0[0]).toBe(1);
    expect(t0[1]).toBe("abc");
    expect(t0.length).toBe(2);
    expect(JSON.stringify(t0)).toBe('[1,"abc"]');
    expect(util.inspect(t0)).toBe("Tuple [ 1, 'abc' ]");
  } finally {
    await con.close();
  }
});

test("fetch: uuid", async () => {
  const con = await connect();
  let res;
  try {
    res = await con.fetchOne("SELECT schema::ObjectType.id LIMIT 1");
    expect(res instanceof UUID).toBeTruthy();
    expect(res.buffer.length).toBe(16);

    res = await con.fetchOne(
      "SELECT <uuid>'759637d8663511e9b9d4098002d459d5'"
    );
    expect(res instanceof UUID).toBeTruthy();
    expect(res.buffer.length).toBe(16);
    expect(res.toString()).toBe("759637d8663511e9b9d4098002d459d5");
  } finally {
    await con.close();
  }
});

test("fetch: enum", async () => {
  const con = await connect();
  let res;
  try {
    res = await con.fetchOne("SELECT sys::get_version()");
    expect(typeof res.stage).toBe("string");
    expect(res.stage).toMatch(/^(dev|alpha|beta|rc|final)$/);
  } finally {
    await con.close();
  }
});

test("fetch: namedtuple", async () => {
  const con = await connect();
  let res;
  try {
    res = await con.fetchOne("select (a := 1)");
    expect(Array.from(res)).toEqual([1]);

    res = await con.fetchAll("select (a := 1, b:= 'abc')");
    expect(Array.from(res[0])).toEqual([1, "abc"]);

    res = await con.fetchOne("select (a := 'aaa', b := true, c := 123)");
    expect(Array.from(res)).toEqual(["aaa", true, 123]);
    const t0: NamedTuple = res;

    // Test that the exported type informs TypeScript that
    // it can be iterated over.
    const t0vals = [];
    for (const i of t0) {
      t0vals.push(i);
    }
    expect(t0vals).toEqual(["aaa", true, 123]);

    expect(t0 instanceof Array).toBeTruthy();
    expect(t0[0]).toBe("aaa");
    expect(t0[1]).toBe(true);
    expect(t0[2]).toBe(123);
    expect(t0.a).toBe("aaa");
    expect(t0.b).toBe(true);
    expect(t0.c).toBe(123);
    expect(t0.length).toBe(3);
    expect(JSON.stringify(t0)).toBe('{"a":"aaa","b":true,"c":123}');
    expect(util.inspect(t0)).toBe(
      "NamedTuple [ a := 'aaa', b := true, c := 123 ]"
    );
  } finally {
    await con.close();
  }
});

test("fetchOne: basic scalars", async () => {
  const con = await connect();
  let res;
  try {
    res = await con.fetchOne("select 'abc'");
    expect(res).toBe("abc");

    res = await con.fetchOne("select 281474976710656;");
    expect(res).toBe(281474976710656);

    res = await con.fetchOne("select <int32>2147483647;");
    expect(res).toBe(2147483647);
    res = await con.fetchOne("select <int32>-2147483648;");
    expect(res).toBe(-2147483648);

    res = await con.fetchOne("select <int16>-10;");
    expect(res).toBe(-10);

    res = await con.fetchOne("select false;");
    expect(res).toBe(false);
  } finally {
    await con.close();
  }
});

test("fetchOne: arrays", async () => {
  const con = await connect();
  let res;
  try {
    res = await con.fetchOne("select [12312312, -1, 123, 0, 1]");
    expect(res).toEqual([12312312, -1, 123, 0, 1]);

    res = await con.fetchOne("select ['aaa']");
    expect(res).toEqual(["aaa"]);

    res = await con.fetchOne("select <array<str>>[]");
    expect(res).toEqual([]);

    res = await con.fetchOne("select ['aaa', '', 'bbbb']");
    expect(res).toEqual(["aaa", "", "bbbb"]);

    res = await con.fetchOne("select ['aaa', '', 'bbbb', '', 'aaaaaa🚀a']");
    expect(res).toEqual(["aaa", "", "bbbb", "", "aaaaaa🚀a"]);
  } finally {
    await con.close();
  }
});

test("fetch: long strings", async () => {
  jest.setTimeout(60_000);

  // This test is meant to stress test the ring buffer.

  const con = await connect();
  let res;
  try {
    // A 10mb string.
    res = await con.fetchOne("select str_repeat('aa', <int64>(10^7));");
    expect(res.length).toEqual(20_000_000);

    // A 100mb string.
    await con
      .fetchOne("select str_repeat('aa', <int64>(10^8));")
      .then(() => {
        throw new Error("the query should have errored out");
      })
      .catch((e) => {
        expect(e.toString()).toMatch(
          /query result is too big: buffer overflow/
        );
      });
  } finally {
    await con.close();
  }
});

test("fetchOneJSON", async () => {
  const con = await connect();
  try {
    const res = await con.fetchOneJSON("select (a := 1)");
    expect(JSON.parse(res)).toEqual({a: 1});
  } finally {
    await con.close();
  }
});

test("fetchAllJSON", async () => {
  const con = await connect();
  try {
    const res = await con.fetchAllJSON("select {(a := 1), (a := 2)}");
    expect(JSON.parse(res)).toEqual([{a: 1}, {a: 2}]);
  } finally {
    await con.close();
  }
});
