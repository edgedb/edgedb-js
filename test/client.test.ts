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

import connect, {
  Set,
  Tuple,
  NamedTuple,
  UUID,
  LocalDateTime,
} from "../src/index";
import {LocalDate, Duration} from "../src/datatypes/datetime";

test("fetchAll: basic scalars", async () => {
  const con = await connect();
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

test("fetch: positional args", async () => {
  const con = await connect();
  let res;
  try {
    const intCases: Array<[string[], number[]]> = [
      [["int16", "int32", "int64"], [1, 1111]],
      [["int16", "int32", "int64"], [100, -101]],
      [["int16", "int32", "int64"], [10011, 0]],
      [["int64"], [17592186032104, -4398037227340]],
      [["float32", "float64"], [10011, 12312]],
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
    res = await con.fetchOne(`select <local_datetime>$0`, [ldt]);
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
  const con = await connect();
  let res;
  try {
    res = await con.fetchOne(`select <str>$a`, {a: "123"});
    expect(res).toBe("123");

    res = await con.fetchOne(`select <str>$a ++ <str>$b`, {
      a: "123",
      b: "abc",
    });
    expect(res).toBe("123abc");

    res = await con.fetchOne(`select len(<str>$a ?? "aa")`, {a: null});
    expect(res).toBe(2);
  } finally {
    await con.close();
  }
});

test("fetch: int overflow", async () => {
  const con = await connect();
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

test("fetch: date", async () => {
  const con = await connect();
  let res;
  try {
    res = await con.fetchOne(`
      with dt := <datetime>'January 10, 2016 17:11:01.123 UTC'
      select (dt, datetime_get(dt, 'epoch') * 1000)
    `);
    expect(res[0].getTime()).toBe(res[1]);

    res = await con.fetchOne(`
      with dt := <datetime>'January 10, 1716 01:00:00.123123 UTC'
      select (dt, datetime_get(dt, 'epoch') * 1000)
    `);
    expect(res[0].getTime()).toBe(Math.ceil(res[1]));
  } finally {
    await con.close();
  }
});

test("fetch: local_date", async () => {
  const con = await connect();
  let res;
  try {
    res = await con.fetchOne(`
      select <local_date>'January 10, 2016';
      `);
    expect(res instanceof LocalDate).toBeTruthy();
    expect(res.toString()).toBe("2016-01-10");

    res = await con.fetchOne(
      `
      select <local_date>$0;
      `,
      [res]
    );
    expect(res instanceof LocalDate).toBeTruthy();
    expect(res.toString()).toBe("2016-01-10");
  } finally {
    await con.close();
  }
});

test("fetch: local_time", async () => {
  const con = await connect();
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
        select (<local_time><str>$time, <str><local_time><str>$time);
        `,
        {time}
      );
      expect(res[0].toString()).toBe(res[1]);

      const res2 = await con.fetchOne(
        `
        select <local_time>$time;
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
  const con = await connect();
  let res;
  try {
    for (const time of [
      "12 days",
      "2 years 1 month 33 days -93423 seconds 74 milliseconds 11 microseconds",
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
  const randint = (min: number, max: number) => {
    const x = Math.round(Math.random() * (max - min) + min);
    return x === -0 ? 0 : x;
  };

  const durs = [
    new Duration(),
    new Duration(0, 0, 1),
    new Duration(0, 0, -1),
    new Duration(0, 1),
    new Duration(0, -1),
    new Duration(1, 0),
    new Duration(-1, 0),
    new Duration(1, 0),
    new Duration(1, 1, 1),
    new Duration(-1, -1, -1),
    new Duration(1, -1, 1),
    new Duration(-1, 1, -1),
  ];

  // Fuzz it!
  for (let _i = 0; _i < 5000; _i++) {
    durs.push(
      new Duration(
        randint(-50, 50),
        randint(-500, 500),
        randint(-1000000, 1000000)
      )
    );
  }

  const con = await connect();
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

      expect(dursFromDb[i].getMonths()).toEqual(durs[i].getMonths());
      expect(dursFromDb[i].getDays()).toEqual(durs[i].getDays());
      expect(dursFromDb[i].getMilliseconds()).toEqual(
        durs[i].getMilliseconds()
      );
    }
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

test("fetch: object", async () => {
  const con = await connect();
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
  } finally {
    await con.close();
  }
});

test("fetch: set of arrays", async () => {
  const con = await connect();
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
  const con = await connect();
  let res;
  try {
    res = await con.fetchOne(`
      select schema::Function {
        id,
      }
      limit 1
    `);

    expect(JSON.stringify(res)).toMatch(/^\{"id":"([\w\d]{32})"\}$/);
    expect(JSON.stringify(res)).not.toMatch(/"__tid__"/);

    res = await con.fetchOne(`
      select schema::Function
      limit 1
    `);

    expect(JSON.stringify(res)).toMatch(/"id":"([\w\d]{32})"/);

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

test("execute", async () => {
  const con = await connect();
  try {
    await con
      .execute(`select 1/0;`)
      .then(() => {
        throw new Error("zero division was not propagated");
      })
      .catch((e: Error) => {
        expect(e.toString()).toMatch("division by zero");
      });

    await con.execute("start transaction isolation serializable");
    try {
      const isolation = await con.fetchOne(
        "select sys::get_transaction_isolation()"
      );
      expect(isolation).toBe("serializable");
    } finally {
      await con.execute("rollback");
    }
  } finally {
    await con.close();
  }
});

test("callbacks", (done) => {
  connect(
    null,
    (err, con) => {
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
              if (err3) {
                throw err3;
              }
              done();
            });
          }
        });
      });
    }
  );
});
