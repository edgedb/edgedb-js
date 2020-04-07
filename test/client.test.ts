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

import {
  Set,
  Tuple,
  NamedTuple,
  UUID,
  LocalDateTime,
  DivisionByZeroError,
  EdgeDBError,
  MissingRequiredError,
} from "../src/index";
import {LocalDate, Duration} from "../src/datatypes/datetime";
import {asyncConnect, connectWithCallback} from "./testbase";

test("fetchAll: basic scalars", async () => {
  const con = await asyncConnect();
  let res;
  try {
    res = await con.fetchAll("select {'a', 'bc'}");
    expect(res).toEqual(["a", "bc"]);

    res = await con.fetchAll(
      `select {
        -1,
        1,
        0,
        15,
        281474976710656,
        22,
        -11111,
        346456723423,
        -346456723423,
        2251799813685125,
        -2251799813685125
      };
      `
    );
    expect(res).toEqual([
      -1,
      1,
      0,
      15,
      281474976710656,
      22,
      -11111,
      346456723423,
      -346456723423,
      2251799813685125,
      -2251799813685125,
    ]);

    res = await con.fetchAll("select <int32>{-1, 0, 1, 10, 2147483647};");
    expect(res).toEqual([-1, 0, 1, 10, 2147483647]);

    res = await con.fetchAll("select <int16>{-1, 0, 1, 10, 15, 22, -1111};");
    expect(res).toEqual([-1, 0, 1, 10, 15, 22, -1111]);

    res = await con.fetchAll("select {true, false, false, true, false};");
    expect(res).toEqual([true, false, false, true, false]);

    res = await con.fetchOne("select [<float64>123.2, <float64>-1.1]");
    expect(res[0]).toBeCloseTo(123.2, 2);
    expect(res[1]).toBeCloseTo(-1.1, 2);

    res = await con.fetchOne("select [<float32>123.2, <float32>-1.1]");
    expect(res[0]).toBeCloseTo(123.2, 2);
    expect(res[1]).toBeCloseTo(-1.1, 2);

    res = await con.fetchOne("select b'abcdef'");
    expect(res instanceof Buffer).toBeTruthy();
    expect(res).toEqual(Buffer.from("abcdef", "utf8"));

    res = await con.fetchOne("select <json>[1, 2, 3]");
    expect(res).toBe("[1, 2, 3]");
  } finally {
    await con.close();
  }
});

test("fetch: bigint", async () => {
  const con = await asyncConnect();
  let res;
  try {
    const testar = [
      BigInt("0"),
      BigInt("-0"),
      BigInt("+0"),
      BigInt("1"),
      BigInt("-1"),
      BigInt("123"),
      BigInt("-123"),
      BigInt("123789"),
      BigInt("-123789"),
      BigInt("19876"),
      BigInt("-19876"),
      BigInt("19876"),
      BigInt("-19876"),
      BigInt("198761239812739812739801279371289371932"),
      BigInt("-198761182763908473812974620938742386"),
      BigInt("98761239812739812739801279371289371932"),
      BigInt("-98761182763908473812974620938742386"),
      BigInt("8761239812739812739801279371289371932"),
      BigInt("-8761182763908473812974620938742386"),
      BigInt("761239812739812739801279371289371932"),
      BigInt("-761182763908473812974620938742386"),
      BigInt("61239812739812739801279371289371932"),
      BigInt("-61182763908473812974620938742386"),
      BigInt("1239812739812739801279371289371932"),
      BigInt("-1182763908473812974620938742386"),
      BigInt("9812739812739801279371289371932"),
      BigInt("-3908473812974620938742386"),
      BigInt("98127373373209"),
      BigInt("-4620938742386"),
      BigInt("100000000000"),
      BigInt("-100000000000"),
      BigInt("10000000000"),
      BigInt("-10000000000"),
      BigInt("1000000000"),
      BigInt("-1000000000"),
      BigInt("100000000"),
      BigInt("-100000000"),
      BigInt("10000000"),
      BigInt("-10000000"),
      BigInt("1000000"),
      BigInt("-1000000"),
      BigInt("100000"),
      BigInt("-100000"),
      BigInt("10000"),
      BigInt("-10000"),
      BigInt("1000"),
      BigInt("-1000"),
      BigInt("100"),
      BigInt("-100"),
      BigInt("10"),
      BigInt("-10"),
      BigInt("100030000010"),
      BigInt("-100000600004"),
      BigInt("10000000100"),
      BigInt("-10030000000"),
      BigInt("1000040000"),
      BigInt("-1000000000"),
      BigInt("1010000001"),
      BigInt("-1000000001"),
      BigInt("1001001000"),
      BigInt("-10000099"),
      BigInt("99999"),
      BigInt("9999"),
      BigInt("999"),
      BigInt("1011"),
      BigInt("1009"),
      BigInt("1709"),
    ];

    // Generate random bigints
    for (let i = 0; i < 1000; i++) {
      const len = Math.floor(Math.random() * 30) + 1;
      let num = "";
      for (let j = 0; j < len; j++) {
        num += "0123456789"[Math.floor(Math.random() * 10)];
      }
      testar.push(BigInt(num));
    }

    // Generate more random bigints consisting from mostly 0s
    for (let i = 0; i < 1000; i++) {
      const len = Math.floor(Math.random() * 50) + 1;
      let num = "";
      for (let j = 0; j < len; j++) {
        num += "0000000012"[Math.floor(Math.random() * 10)];
      }
      testar.push(BigInt(num));
    }

    res = await con.fetchOne("select <array<bigint>>$0", [testar]);
    expect(res).toEqual(testar);
  } finally {
    await con.close();
  }
});

test("fetch: positional args", async () => {
  const con = await asyncConnect();
  let res;
  try {
    const intCases: Array<[string[], number[]]> = [
      [
        ["int16", "int32", "int64"],
        [1, 1111],
      ],
      [
        ["int16", "int32", "int64"],
        [100, -101],
      ],
      [
        ["int16", "int32", "int64"],
        [10011, 0],
      ],
      [["int64"], [17592186032104, -4398037227340]],
      [
        ["float32", "float64"],
        [10011, 12312],
      ],
    ];
    for (const [types, values] of intCases) {
      for (const type of types) {
        res = await con.fetchOne(
          `select (<${type}>$0 + <${type}>$1,);`,
          values
        );
        expect(res[0]).toBe(values[0] + values[1]);
      }
    }

    res = await con.fetchOne(`select <json>$0`, ["[1,2]"]);
    expect(res).toBe("[1, 2]");

    res = await con.fetchOne(`select <str>$0`, ["[1,2]"]);
    expect(res).toBe("[1,2]");

    res = await con.fetchOne(`select (<bool>$0, <bool>$1)`, [true, false]);
    expect(res).toEqual([true, false]);

    const bytes = Buffer.allocUnsafe(4);
    bytes.writeInt32BE(-12312, 0);
    res = await con.fetchOne(`select <bytes>$0`, [bytes]);
    expect(res).toEqual(bytes);

    const dt = new Date(Date.now());
    res = await con.fetchOne(`select <datetime>$0`, [dt]);
    expect(res).toEqual(dt);
    res = await con.fetchOne(`select [<datetime>$0, <datetime>$0]`, [dt]);
    expect(res).toEqual([dt, dt]);

    const ldt = new LocalDateTime(2012, 5, 30, 14, 11, 33, 123);
    res = await con.fetchOne(`select <cal::local_datetime>$0`, [ldt]);
    expect(res instanceof LocalDateTime).toBeTruthy();
    expect((res as LocalDateTime).getHours()).toBe(14);
    expect((res as LocalDateTime).toISOString()).toBe(
      "2012-06-30T14:11:33.123"
    );

    res = await con.fetchOne(`select len(<array<int64>>$0)`, [
      [1, 2, 3, 4, 5],
    ]);
    expect(res).toEqual(5);
  } finally {
    await con.close();
  }
});

test("fetch: named args", async () => {
  const con = await asyncConnect();
  let res;
  try {
    res = await con.fetchOne(`select <str>$a`, {a: "123"});
    expect(res).toBe("123");

    res = await con.fetchOne(`select <str>$a ++ <str>$b`, {
      b: "abc",
      a: "123",
    });
    expect(res).toBe("123abc");

    res = await con
      .fetchOne(`select <str>$a ++ <str>$b`, {
        b: "abc",
        a: "123",
        c: "def",
      })
      .then(() => {
        throw new Error(
          "there should have been an unexpected named argument error"
        );
      })
      .catch((e) => {
        expect(e.toString()).toMatch(/unexpected named argument: "c"/);
      });

    res = await con.fetchOne(`select len(<str>$a ?? "aa")`, {a: null});
    expect(res).toBe(2);
  } finally {
    await con.close();
  }
});

test("fetch: int overflow", async () => {
  const con = await asyncConnect();
  let res;
  try {
    res = await con.fetchOne(`
      select <int64>(2^53) - 1;
    `);
    expect(res).toBe(9007199254740991);

    await con
      .fetchOne(`select <int64>(2^53);`)
      .then(() => {
        throw new Error("there should have been an overflow error");
      })
      .catch((e) => {
        expect(e.toString()).toMatch(/cannot unpack.*9007199254740992.*/);
      });

    res = await con.fetchOne(`
      select -<int64>(2^53);
    `);
    expect(res).toBe(-9007199254740992);

    await con
      .fetchOne(`select -<int64>(2^53) - 1;`)
      .then(() => {
        throw new Error("there should have been an overflow error");
      })
      .catch((e) => {
        expect(e.toString()).toMatch(/cannot unpack.*-9007199254740993.*/);
      });
  } finally {
    await con.close();
  }
});

test("fetch: datetime", async () => {
  const con = await asyncConnect();
  let res;
  try {
    res = await con.fetchOne(`
      with dt := <datetime>'2016-01-10T17:11:01.123Z'
      select (dt, datetime_get(dt, 'epochseconds') * 1000)
    `);
    expect(res[0].getTime()).toBe(res[1]);

    res = await con.fetchOne(`
      with dt := <datetime>'1716-01-10T01:00:00.123123Z'
      select (dt, datetime_get(dt, 'epochseconds') * 1000)
    `);
    expect(res[0].getTime()).toBe(Math.ceil(res[1]));
  } finally {
    await con.close();
  }
});

test("fetch: cal::local_date", async () => {
  const con = await asyncConnect();
  let res;
  try {
    res = await con.fetchOne(`
      select <cal::local_date>'2016-01-10';
      `);
    expect(res instanceof LocalDate).toBeTruthy();
    expect(res.toString()).toBe("2016-01-10");

    res = await con.fetchOne(
      `
      select <cal::local_date>$0;
      `,
      [res]
    );
    expect(res instanceof LocalDate).toBeTruthy();
    expect(res.toString()).toBe("2016-01-10");
  } finally {
    await con.close();
  }
});

test("fetch: cal::local_time", async () => {
  const con = await asyncConnect();
  let res;
  try {
    for (const time of [
      "11:12:13",
      "00:01:11.34",
      "00:00:00",
      "23:59:59.999",
    ]) {
      res = await con.fetchOne(
        `
        select (<cal::local_time><str>$time, <str><cal::local_time><str>$time);
        `,
        {time}
      );
      expect(res[0].toString()).toBe(res[1]);

      const res2 = await con.fetchOne(
        `
        select <cal::local_time>$time;
        `,
        {time: res[0]}
      );
      expect(res2.toString()).toBe(res[0].toString());
    }
  } finally {
    await con.close();
  }
});

test("fetch: duration", async () => {
  const con = await asyncConnect();
  let res;
  try {
    for (const time of [
      "24 hours",
      "68464977 seconds 74 milliseconds 11 microseconds",
    ]) {
      res = await con.fetchOne(
        `
        select (<duration><str>$time, <str><duration><str>$time);
        `,
        {time}
      );
      expect(res[0].toString()).toBe(res[1]);

      const res2 = await con.fetchOne(
        `
        select <duration>$time;
        `,
        {time: res[0]}
      );
      expect(res2.toString()).toBe(res[0].toString());
    }
  } finally {
    await con.close();
  }
});

test("fetch: duration fuzz", async () => {
  jest.setTimeout(10_000);
  const randint = (min: number, max: number) => {
    const x = Math.round(Math.random() * (max - min) + min);
    return x === -0 ? 0 : x;
  };

  const durs = [
    new Duration(),
    new Duration(1),
    new Duration(-1),
    new Duration(1),
    new Duration(-1),
    new Duration(-752043.296),
    new Duration(3542924),
    new Duration(86400000),
    new Duration(-86400000),
  ];

  // Fuzz it!
  for (let _i = 0; _i < 5000; _i++) {
    durs.push(new Duration(randint(-500, 500) * 86400 + randint(-1000, 1000)));
  }

  const con = await asyncConnect();
  try {
    // Test that Duration.__str__ formats the same as <str><duration>.
    const dursAsText = await con.fetchAll(
      `
        WITH args := array_unpack(<array<duration>>$0)
        SELECT <str>args;
      `,
      [durs]
    );

    // Test encode/decode round trip.
    const dursFromDb = await con.fetchAll(
      `
        WITH args := array_unpack(<array<duration>>$0)
        SELECT args;
      `,
      [durs]
    );

    for (let i = 0; i < durs.length; i++) {
      expect(durs[i].toString()).toBe(dursAsText[i]);
      expect(dursFromDb[i].toMilliseconds()).toEqual(durs[i].toMilliseconds());
      expect(dursFromDb[i].toSeconds()).toEqual(durs[i].toSeconds());
      expect(dursFromDb[i].toMicroseconds()).toEqual(durs[i].toMicroseconds());
    }
  } finally {
    await con.close();
  }
});

test("fetch: tuple", async () => {
  const con = await asyncConnect();
  let res;
  try {
    res = await con.fetchAll("select ()");
    expect(res).toEqual([[]]);

    res = await con.fetchOne("select (1,)");
    expect(res).toEqual([1]);

    res = await con.fetchAll("select (1, 'abc')");
    expect(res).toEqual([[1, "abc"]]);

    res = await con.fetchAll("select {(1, 'abc'), (2, 'bcd')}");
    expect(res).toEqual([
      [1, "abc"],
      [2, "bcd"],
    ]);
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

    const insp = util.inspect(t0);
    expect(
      insp === "Tuple [ 1, 'abc' ]" || insp === "Tuple(2) [ 1, 'abc' ]"
    ).toBeTruthy();
  } finally {
    await con.close();
  }
});

test("fetch: object", async () => {
  const con = await asyncConnect();
  let res;
  try {
    res = await con.fetchOne(`
      select schema::Function {
        name,
        params: {
          kind,
          num,
          @foo := 42
        } order by .num asc
      }
      filter .name = 'std::str_repeat'
      limit 1
    `);

    expect(JSON.stringify(res)).toEqual(
      JSON.stringify({
        name: "std::str_repeat",
        params: [
          {kind: "POSITIONAL", num: 0, "@foo": 42},
          {kind: "POSITIONAL", num: 1, "@foo": 42},
        ],
      })
    );

    expect(res.params[0].num).toBe(0);
    expect(res.params[1].num).toBe(1);

    expect(util.inspect(res.params[0])).toBe(
      "Object [ kind := 'POSITIONAL', num := 0, @foo := 42 ]"
    );

    expect(res.params.length).toBe(2);
    expect(res.params[0].id instanceof UUID).toBeTruthy();
    expect(res.params[0].__tid__ instanceof UUID).toBeTruthy();
    expect(res.params[1].__tid__).toEqual(res.params[0].__tid__);
    expect(res.id instanceof UUID).toBeTruthy();
    expect(res.__tid__ instanceof UUID).toBeTruthy();
    expect(res.params[1].__tid__).not.toEqual(res.__tid__);

    // regression test: test that empty sets are properly decoded.
    await con.fetchOne(`
      select schema::Function {
        name,
        params: {
          kind,
        } limit 0,
        multi setarr := <array<int32>>{}
      }
      filter .name = 'std::str_repeat'
      limit 1
    `);
  } finally {
    await con.close();
  }
});

test("fetch: set of arrays", async () => {
  const con = await asyncConnect();
  let res;
  try {
    res = await con.fetchOne(`
      select schema::Function {
        id,
        sets := {[1, 2], [1]}
      }
      limit 1
    `);

    res = res.sets;
    expect(res).toEqual([[1, 2], [1]]);
    expect(res.length).toBe(2);
    expect(res instanceof Set).toBeTruthy();
    expect(res instanceof Array).toBeTruthy();
    expect(res[1] instanceof Set).toBeFalsy();
    expect(res[1] instanceof Array).toBeTruthy();

    res = await con.fetchAll(`
      select {[1, 2], [1]};
    `);

    expect(res).toEqual([[1, 2], [1]]);
    expect(res.length).toBe(2);
    expect(res instanceof Set).toBeTruthy();
    expect(res instanceof Array).toBeTruthy();
    expect(res[1] instanceof Set).toBeFalsy();
    expect(res[1] instanceof Array).toBeTruthy();
  } finally {
    await con.close();
  }
});

test("fetch: object implicit fields", async () => {
  const con = await asyncConnect();
  let res;
  try {
    res = await con.fetchOne(`
      select schema::Function {
        id,
      }
      limit 1
    `);

    expect(JSON.stringify(res)).toMatch(/^\{"id":"([\w\d\-]{36})"\}$/);
    expect(JSON.stringify(res)).not.toMatch(/"__tid__"/);

    res = await con.fetchOne(`
      select schema::Function
      limit 1
    `);

    expect(JSON.stringify(res)).toMatch(/"id":"([\w\d\-]{36})"/);

    res = await con.fetchOne(`
      select schema::Function {
        name
      }
      filter .name = 'std::str_repeat'
      limit 1
    `);

    expect(JSON.stringify(res)).toBe('{"name":"std::str_repeat"}');
  } finally {
    await con.close();
  }
});

test("fetch: uuid", async () => {
  const con = await asyncConnect();
  let res;
  try {
    res = await con.fetchOne("SELECT schema::ObjectType.id LIMIT 1");
    expect(res instanceof UUID).toBeTruthy();
    expect(res.buffer.length).toBe(16);

    res = await con.fetchOne(
      "SELECT <uuid>'759637d8-6635-11e9-b9d4-098002d459d5'"
    );
    expect(res instanceof UUID).toBeTruthy();
    expect(res.buffer.length).toBe(16);
    expect(res.toString()).toBe("759637d8-6635-11e9-b9d4-098002d459d5");
  } finally {
    await con.close();
  }
});

test("fetch: enum", async () => {
  const con = await asyncConnect();
  await con.execute("start transaction");
  try {
    await con.execute(`
      CREATE SCALAR TYPE MyEnum EXTENDING enum<"A", "B">;
    `);

    await con.execute("declare savepoint s1");
    await con
      .fetchOne("SELECT <MyEnum><str>$0", ["Z"])
      .then(() => {
        throw new Error("an exception was expected");
      })
      .catch((e) => {
        expect(e.toString()).toMatch(/invalid input value for enum/);
      });
    await con.execute("rollback to savepoint s1");

    let ret = await con.fetchOne("SELECT <MyEnum><str>$0", ["A"]);
    expect(ret).toBe("A");

    ret = await con.fetchOne("SELECT <MyEnum>$0", ["A"]);
    expect(ret).toBe("A");
  } finally {
    await con.close();
  }
});

test("fetch: namedtuple", async () => {
  const con = await asyncConnect();
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
  const con = await asyncConnect();
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
  const con = await asyncConnect();
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

  const con = await asyncConnect();
  let res;
  try {
    // A 1mb string.
    res = await con.fetchOne("select str_repeat('a', <int64>(10^6));");
    expect(res.length).toEqual(1_000_000);

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
  const con = await asyncConnect();
  let res;
  try {
    res = await con.fetchOneJSON("select (a := 1)");
    expect(JSON.parse(res)).toEqual({a: 1});

    res = await con.fetchOneJSON("select (a := 1n)");
    expect(JSON.parse(res)).toEqual({a: 1});
    expect(typeof JSON.parse(res).a).toEqual("number");

    res = await con.fetchOneJSON("select (a := 1.5n)");
    expect(JSON.parse(res)).toEqual({a: 1.5});
    expect(typeof JSON.parse(res).a).toEqual("number");
  } finally {
    await con.close();
  }
});

test("fetchAllJSON", async () => {
  const con = await asyncConnect();
  try {
    const res = await con.fetchAllJSON("select {(a := 1), (a := 2)}");
    expect(JSON.parse(res)).toEqual([{a: 1}, {a: 2}]);
  } finally {
    await con.close();
  }
});

test("fetchOne wrong cardinality", async () => {
  const con = await asyncConnect();
  try {
    await con
      .fetchOneJSON("start transaction")
      .then(() => {
        throw new Error("an exception was expected");
      })
      .catch((e) => {
        expect(e.toString()).toMatch(/fetchOneJSON\(\) returned no data/);
      });

    await con
      .fetchOne("start transaction")
      .then(() => {
        throw new Error("an exception was expected");
      })
      .catch((e) => {
        expect(e.toString()).toMatch(/fetchOne\(\) returned no data/);
      });
  } finally {
    await con.close();
  }
});

test("execute", async () => {
  const con = await asyncConnect();
  try {
    await con
      .execute(`select 1/0;`)
      .then(() => {
        throw new Error("zero division was not propagated");
      })
      .catch((e: Error) => {
        expect(e.toString()).toMatch("division by zero");
        expect(e instanceof DivisionByZeroError).toBeTruthy();
        expect(e instanceof MissingRequiredError).toBeFalsy();
        expect(e instanceof EdgeDBError).toBeTruthy();
        expect((<DivisionByZeroError>e).code).toBe(0x05_01_00_01);
      });

    await con.execute("start transaction isolation serializable");
    try {
      const isolation = await con.fetchOne(
        "select sys::get_transaction_isolation()"
      );
      expect(isolation).toBe("SERIALIZABLE");
    } finally {
      await con.execute("rollback");
    }
  } finally {
    await con.close();
  }
});

test("callbacks", (done) => {
  connectWithCallback(undefined, (err, con) => {
    if (err) {
      throw err;
    }

    if (!con) {
      throw new Error("no connection object");
    }

    con.execute("start transaction", (err1, _data1) => {
      if (err1) {
        throw err1;
      }

      con.fetchOne("select <int64>$i + 1", {i: 10}, (err2, data2) => {
        if (err2) {
          throw err2;
        }

        try {
          expect(data2).toBe(11);
        } finally {
          con.execute("rollback", (err3, _data3) => {
            try {
              if (err3) {
                throw err3;
              }
            } finally {
              con.close(() => {
                done();
              });
            }
          });
        }
      });
    });
  });
});

test("fetch/optimistic cache invalidation", async () => {
  const typename = "CacheInv_01";
  const query = `SELECT ${typename}.prop1 LIMIT 1`;
  const con = await asyncConnect();
  await con.execute("start transaction");
  try {
    await con.execute(`
      CREATE TYPE ${typename} {
        CREATE REQUIRED PROPERTY prop1 -> std::str;
      };

      INSERT ${typename} {
        prop1 := 'aaa'
      };
    `);

    for (let i = 0; i < 5; i++) {
      const res = await con.fetchOne(query);
      expect(res).toBe("aaa");
    }

    await con.execute(`
      DELETE (SELECT ${typename});

      ALTER TYPE ${typename} {
        DROP PROPERTY prop1;
      };

      ALTER TYPE ${typename} {
        CREATE REQUIRED PROPERTY prop1 -> std::int64;
      };

      INSERT ${typename} {
        prop1 := 123
      };
    `);

    for (let i = 0; i < 5; i++) {
      const res = await con.fetchOne(query);
      expect(res).toBe(123);
    }
  } finally {
    await con.execute("rollback");
    await con.close();
  }
});

test("fetch no codec", async () => {
  const con = await asyncConnect();
  try {
    await con
      .fetchOne("select <decimal>1")
      .then(() => {
        throw new Error("an exception was expected");
      })
      .catch((e) => {
        expect(e.toString()).toMatch(/no JS codec for std::decimal/);
      });
    await con.fetchOne("select 123").then((res) => {
      expect(res).toEqual(123);
    });
  } finally {
    await con.close();
  }
});

test("concurrent ops", async () => {
  const con = await asyncConnect();
  try {
    const p1 = con.fetchOne(`SELECT 1 + 2`);
    await Promise.all([p1, con.fetchOne(`SELECT sys::get_version_as_str()`)])
      .then(() => {
        throw new Error("an exception was expected");
      })
      .catch((e) => {
        expect(e.toString()).toMatch(/Another operation is in progress/);
      });

    const res = await p1;
    expect(res).toBe(3);
  } finally {
    await con.close();
  }
});
