/*!
 * This source file is part of the EdgeDB open source project.
 *
 * Copyright 2020-present MagicStack Inc. and the EdgeDB authors.
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

import * as errors from "../src/errors";
import each from "jest-each";
import {Deferred, createPool, getHolder, unwrapConnection} from "../src/pool";
import {getPool, getConnectOptions} from "./testbase";
import connect from "../src/client";
import {Connection, Pool} from "../src/ifaces";
import {ConnectConfig} from "../src/con_utils";

// Jest by default applies a test timeout of 5 seconds; some of the following
// tests occasionally require more time to execute
// (this also depends on the machine: a CI agent is likely less powerful
// than a developer's machine and the timeout must account for this)
const BiggerTimeout = 60e3;

class CrashTestError extends Error {
  constructor() {
    super("Crash test");
  }
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

function getProxyConnection(proxy: Connection): Connection {
  // @ts-ignore
  return proxy[unwrapConnection]();
}

describe("pool.initialize: creates minSize count of connections", () => {
  each([0, 1, 5, 10, 20]).it(
    "when minSize is '%s'",
    async (minSize) => {
      const connections: Connection[] = [];

      async function onConnect(connection: Connection): Promise<void> {
        if (connections.indexOf(connection) > -1) {
          throw new Error("onConnect was called more than once");
        }
        connections.push(connection);
      }

      const maxSize = minSize + 50;
      const pool = await createPool({
        connectOptions: getConnectOptions(),
        minSize,
        maxSize,
        onConnect,
      });

      // @ts-ignore
      expect(pool._queue).toHaveLength(maxSize);
      expect(connections).toHaveLength(minSize);

      await pool.close();
    },
    BiggerTimeout
  );
});

test("pool.query: basic scalars", async () => {
  const pool = await getPool();

  let res = await pool.query("select {'a', 'bc'}");
  expect(res).toEqual(["a", "bc"]);

  res = await pool.query(
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

  await pool.close();
});

test("pool.queryJSON", async () => {
  const pool = await getPool();

  const res = await pool.queryJSON("select {(a := 1), (a := 2)}");
  expect(JSON.parse(res)).toEqual([{a: 1}, {a: 2}]);

  await pool.close();
});

test("pool.queryOne", async () => {
  const pool = await getPool();
  let res;

  res = await pool.queryOne("select 100");
  expect(res).toBe(100);

  res = await pool.queryOne("select 'Charlie Brown'");
  expect(res).toBe("Charlie Brown");

  await pool.close();
});

test("pool.queryOneJSON", async () => {
  const pool = await getPool();
  let res;

  res = await pool.queryOneJSON("select (a := 1)");
  expect(JSON.parse(res)).toEqual({a: 1});

  res = await pool.queryOneJSON("select (a := 1n)");
  expect(JSON.parse(res)).toEqual({a: 1});
  expect(typeof JSON.parse(res).a).toEqual("number");

  res = await pool.queryOneJSON("select (a := 1.5n)");
  expect(JSON.parse(res)).toEqual({a: 1.5});
  expect(typeof JSON.parse(res).a).toEqual("number");

  await pool.close();
});

describe("pool concurrency 1", () => {
  each([1, 5, 10, 20, 100]).it(
    "when concurrency is '%s'",
    async (concurrency) => {
      const pool = await createPool({
        connectOptions: getConnectOptions(),
        minSize: 5,
        maxSize: 10,
      });

      async function work(): Promise<void> {
        const proxy = await pool.acquire();
        expect(await proxy.queryOne("SELECT 1")).toBe(1);
        await pool.release(proxy);
      }

      await Promise.all(
        new Array(concurrency).fill(undefined).map(() => work())
      );

      await pool.close();
    },
    BiggerTimeout
  );
});

describe("pool concurrency 2", () => {
  each([1, 3, 5, 10, 20, 100]).it(
    "when concurrency is '%s'",
    async (concurrency) => {
      const pool = await createPool({
        connectOptions: getConnectOptions(),
        minSize: 5,
        maxSize: 5,
      });

      async function work(): Promise<void> {
        const proxy = await pool.acquire();
        expect(await proxy.queryOne("SELECT 1")).toBe(1);
        await pool.release(proxy);
      }

      await Promise.all(
        new Array(concurrency).fill(undefined).map(() => work())
      );

      await pool.close();
    },
    BiggerTimeout
  );
});

describe("pool concurrency 3", () => {
  each([1, 3, 5, 10, 20, 100]).it(
    "when concurrency is '%s'",
    async (concurrency) => {
      const pool = await createPool({
        connectOptions: getConnectOptions(),
        minSize: 5,
        maxSize: 5,
      });

      async function work(): Promise<void> {
        const result = await pool.run(async (connection) => {
          return await connection.queryOne("SELECT 1");
        });
        expect(result).toBe(1);
      }

      await Promise.all(
        new Array(concurrency).fill(undefined).map(() => work())
      );

      await pool.close();
    },
    BiggerTimeout
  );
});

test("pool.onAcquire callback", async () => {
  const deferred = new Deferred<Connection>();

  async function onAcquire(connection: Connection): Promise<void> {
    deferred.setResult(connection);
  }

  const pool = await createPool({
    connectOptions: getConnectOptions(),
    minSize: 5,
    maxSize: 5,
    onAcquire,
  });

  const proxy = await pool.acquire();
  await pool.release(proxy);

  expect(deferred.done).toBe(true);
  expect(deferred.result).toBe(proxy);

  await pool.close();
});

test("pool.onRelease callback", async () => {
  const deferred = new Deferred<Connection>();

  async function onRelease(connection: Connection): Promise<void> {
    deferred.setResult(connection);
  }

  const pool = await createPool({
    connectOptions: getConnectOptions(),
    minSize: 5,
    maxSize: 5,
    onRelease,
  });

  const proxy = await pool.acquire();
  await pool.release(proxy);

  expect(deferred.done).toBe(true);
  expect(deferred.result).toBe(proxy);

  await pool.close();
});

test(
  "pool.onAcquire onConnect callbacks",
  async () => {
    // This method tests onAcquire, onConnect execution and their order;
    // it also ensures that no more connections than the maximum size of
    // the pool are created (concurrency is 2x max size).
    const connections: Connection[] = [];

    async function onAcquire(proxy: Connection): Promise<void> {
      if (connections.indexOf(getProxyConnection(proxy)) === -1) {
        throw new Error("onAcquire was not called");
      }
    }

    async function onConnect(connection: Connection): Promise<void> {
      if (connections.indexOf(connection) > -1) {
        throw new Error("onConnect was called more than once");
      }
      connections.push(connection);
    }

    async function user(pool: Pool): Promise<void> {
      const proxy = await pool.acquire();

      if (connections.indexOf(getProxyConnection(proxy)) === -1) {
        throw new Error("init was not called");
      }

      await pool.release(proxy);
    }

    const _pool = await createPool({
      connectOptions: getConnectOptions(),
      minSize: 2,
      maxSize: 5,
      onAcquire,
      onConnect,
    });

    await Promise.all(new Array(10).fill(undefined).map(() => user(_pool)));

    expect(connections).toHaveLength(5);

    await _pool.close();
  },
  BiggerTimeout
);

test(
  "pool.release raises for foreign connection proxy",
  async () => {
    const pool1 = await createPool({
      connectOptions: getConnectOptions(),
      minSize: 1,
      maxSize: 1,
    });
    const pool2 = await createPool({
      connectOptions: getConnectOptions(),
      minSize: 1,
      maxSize: 1,
    });

    const proxy = await pool1.acquire();

    try {
      await expect(pool2.release(proxy)).rejects.toThrow(
        "The connection proxy does not belong to this pool."
      );
    } finally {
      await pool1.release(proxy);
    }

    await pool1.close();
    await pool2.close();
  },
  BiggerTimeout
);

test(
  "pool.release more than once does not raise exception",
  async () => {
    const pool = await createPool({
      connectOptions: getConnectOptions(),
      minSize: 1,
      maxSize: 1,
    });

    const proxy = await pool.acquire();

    await pool.release(proxy);
    await pool.release(proxy);

    await pool.close();
  },
  BiggerTimeout
);

test(
  "pool.release more than once does not raise exception",
  async () => {
    const pool = await createPool({
      connectOptions: getConnectOptions(),
      minSize: 1,
      maxSize: 1,
    });

    const proxy = await pool.acquire();

    await pool.release(proxy);
    await pool.release(proxy);

    await pool.close();
  },
  BiggerTimeout
);

test(
  "a released proxy cannot be used to query",
  async () => {
    // This method tests that a released connection proxy cannot be used to
    // do further queries
    const pool = await createPool({
      connectOptions: getConnectOptions(),
      minSize: 1,
      maxSize: 1,
    });

    const proxy = await pool.acquire();

    await pool.release(proxy);

    async function failing(): Promise<void> {
      await proxy.query("select 1");
    }

    await expect(failing()).rejects.toThrow("The proxy is detached");

    await pool.close();
  },
  BiggerTimeout
);

test(
  "exception in onAcquire",
  async () => {
    let setupCalls = 0;
    let lastProxy: Connection | undefined;
    const proxies: Array<Connection | string> = [];

    async function onAcquire(connectionProxy: Connection): Promise<void> {
      setupCalls += 1;
      lastProxy = connectionProxy;

      if (setupCalls > 1) {
        proxies.push(connectionProxy);
      } else {
        proxies.push("error");
        throw new CrashTestError();
      }
    }

    const pool = await createPool({
      connectOptions: getConnectOptions(),
      minSize: 1,
      maxSize: 1,
      onAcquire,
    });

    // initialize causes setupCalls to become 1, since minSize == 1
    // the next call to .acquire() fails because onAcquire raises an error
    await expect(pool.acquire()).rejects.toThrow(new CrashTestError().message);

    if (lastProxy === undefined) {
      await pool.close();
      throw new Error("Expected a populated lastProxy");
    }

    // while handling the error, the pool closes the connection, so lastProxy
    // is now detached
    expect(lastProxy.isClosed()).toBe(true);

    // the next call to acquire works
    const proxy = await pool.acquire();
    expect(proxies).toEqual(["error", proxy]);

    await pool.release(proxy);
    await pool.close();
  },
  BiggerTimeout
);
test(
  "exception in onConnect",
  async () => {
    let setupCalls = 0;
    let lastConnection: Connection | undefined;
    const connections: Array<Connection | string> = [];

    async function onConnect(connection: Connection): Promise<void> {
      setupCalls += 1;
      lastConnection = connection;

      if (setupCalls > 1) {
        connections.push(connection);
      } else {
        connections.push("error");
        throw new CrashTestError();
      }
    }

    const pool = await createPool({
      connectOptions: getConnectOptions(),
      minSize: 0,
      maxSize: 1,
      onConnect,
    });

    await expect(pool.acquire()).rejects.toThrow(new CrashTestError().message);

    if (lastConnection === undefined) {
      await pool.close();
      throw new Error("Expected a populated lastConnection");
    }

    expect(lastConnection.isClosed()).toBe(true);

    // the next call to acquire works
    const proxy = await pool.acquire();

    expect(connections.length).toEqual(2);
    expect(connections[0]).toBe("error");
    expect(connections[1]).toBe(getProxyConnection(proxy));

    expect(await lastConnection.queryOne("select 1")).toBe(1);

    await pool.release(proxy);
    await pool.close();
  },
  BiggerTimeout
);

test(
  "no acquire deadlock",
  async (done) => {
    const pool = await createPool({
      connectOptions: getConnectOptions(),
      minSize: 1,
      maxSize: 1,
    });

    async function sleepAndRelease(): Promise<void> {
      await pool.run(async (connection) => {
        await connection.execute("SELECT sys::sleep(1)");

        done();
      });
    }

    sleepAndRelease();
    await new Promise((resolve) => setTimeout(resolve, 500));

    const proxy = await pool.acquire();

    expect(await proxy.queryOne("SELECT 1")).toBe(1);
    await pool.release(proxy);
    await pool.close();
  },
  BiggerTimeout
);

test(
  "createPool initializes the pool automatically",
  async () => {
    let called = false;

    const pool = await createPool({
      connectOptions: getConnectOptions(),
      minSize: 1,
      maxSize: 1,
      onConnect: async () => {
        called = true;
      },
    });

    expect(called).toBe(true);
    await pool.close();
  },
  BiggerTimeout
);

test(
  "pool connection factory",
  async () => {
    let calls = 0;

    async function connectionFactory(
      options?: ConnectConfig | null
    ): Promise<Connection> {
      calls += 1;
      return await connect(options);
    }

    const pool = await createPool({
      connectOptions: getConnectOptions(),
      minSize: 3,
      maxSize: 5,
      connectionFactory,
    });

    expect(calls).toBe(3);
    await pool.close();
  },
  BiggerTimeout
);

describe("pool connection methods", () => {
  async function testquery(_pool: Pool): Promise<number> {
    const i = randomInt(0, 20);
    await new Promise((resolve) => setTimeout(resolve, i));
    const result = await _pool.query(`SELECT ${i}`);
    expect(result).toEqual([i]);
    return 1;
  }

  async function testqueryOne(_pool: Pool): Promise<number> {
    const i = randomInt(0, 20);
    await new Promise((resolve) => setTimeout(resolve, i));
    const result = await _pool.queryOne(`SELECT ${i}`);
    expect(result).toEqual(i);
    return 1;
  }

  async function testExecute(_pool: Pool): Promise<number> {
    await new Promise((resolve) => setTimeout(resolve, randomInt(0, 20)));
    await _pool.execute(`SELECT {1, 2, 3, 4}`);
    return 1;
  }

  async function run(
    times: number,
    method: (_pool: Pool) => Promise<number>
  ): Promise<void> {
    const pool = await createPool({
      connectOptions: getConnectOptions(),
      minSize: 5,
      maxSize: 10,
    });

    const results = await Promise.all<number>(
      new Array(times).fill(undefined).map(() => method(pool))
    );

    expect(results).toEqual(new Array(times).fill(1));
    await pool.close();
  }

  const methods = [testquery, testqueryOne, testExecute];

  each(methods).it(
    "when method is '%s'",
    async (method) => {
      await run(200, method);
    },
    BiggerTimeout
  );
});

test(
  "pool close waits for release",
  async () => {
    let connectionReleased = false;
    const flag = new Deferred<boolean>();

    const pool = await createPool({
      connectOptions: getConnectOptions(),
      minSize: 1,
      maxSize: 1,
    });

    async function work(): Promise<void> {
      const proxy = await pool.acquire();

      flag.setResult(true);
      await new Promise((resolve) => setTimeout(resolve, 100));

      connectionReleased = true;
      await pool.release(proxy);
    }

    work();

    await flag.promise;
    await pool.close();
    expect(connectionReleased).toBe(true);
  },
  BiggerTimeout
);

test(
  "pool expire connections",
  async () => {
    const pool = await createPool({
      connectOptions: getConnectOptions(),
      minSize: 1,
      maxSize: 1,
    });

    const proxy = await pool.acquire();

    try {
      pool.expireConnections();
    } finally {
      await pool.release(proxy);
    }

    try {
      // @ts-ignore
      const holder = proxy[getHolder]();
      expect(holder.connection).toBeNull();
    } finally {
      await pool.close();
    }
  },
  BiggerTimeout
);

test("createPool.queryOne", async () => {
  const pool = await createPool({
    connectOptions: getConnectOptions(),
  });
  let res;

  res = await pool.queryOne("select 100");
  expect(res).toBe(100);

  res = await pool.queryOne("select 'Charlie Brown'");
  expect(res).toBe("Charlie Brown");

  await pool.close();
});

describe("pool.getStats: includes the number of open connections", () => {
  each([0, 1, 5, 10, 20]).it(
    "when minSize is '%s'",
    async (minSize) => {
      const maxSize = minSize + 50;
      const pool = await createPool({
        connectOptions: getConnectOptions(),
        minSize,
        maxSize,
      });

      const stats = pool.getStats();
      expect(stats.queueLength).toBe(0);
      expect(stats.openConnections).toBe(minSize);

      await pool.close();
    },
    BiggerTimeout
  );
});

describe("pool.getStats: includes queue length", () => {
  // This test proves that pool stats queueLength indicates a number
  // of consumers awaiting for a connection.
  each([5, 10, 20, 30, 40]).it(
    "when request count is '%s'",
    async (requests) => {
      const minSize = 0;
      const maxSize = 10;

      const pool = await createPool({
        connectOptions: getConnectOptions(),
        minSize,
        maxSize,
      });

      const promises: Array<Promise<Connection>> = [];
      // simulate consumers of the pool: for example functions that require
      // a connection to process a web request
      for (const _ of new Array(requests)) {
        promises.push(pool.acquire());
      }

      // await for maxSize count of promises: these are resolved
      // as soon as maxSize connections are open
      const firstPromises = await Promise.all(
        promises.slice(0, Math.min(requests, maxSize))
      );

      // get stats: the queue length must be the number of consumers awaiting
      // for a connection
      const stats = pool.getStats();

      try {
        expect(stats.queueLength).toBe(Math.max(0, requests - maxSize));
      } finally {
        // release proxies
        for (const proxy of firstPromises) {
          await pool.release(proxy);
        }

        if (requests > maxSize) {
          for (const promise of promises.slice(maxSize)) {
            await pool.release(await promise);
          }
        }
        await pool.close();
      }
    },
    BiggerTimeout
  );
});

test("pool transaction", async () => {
  const typename = "PoolTransactionTest";
  const pool = await getPool();

  try {
    await pool.execute(`
      CREATE TYPE ${typename} {
        CREATE REQUIRED PROPERTY name -> std::str;
      };
    `);

    async function faulty(): Promise<void> {
      await pool.transaction(async () => {
        await pool.execute(`
          INSERT ${typename} {
            name := 'Test Transaction'
          };
        `);

        await pool.execute("SELECT 1 / 0;");
      });
    }

    await expect(faulty()).rejects.toThrow(
      new errors.DivisionByZeroError().message
    );

    const items = await pool.query(
      `select ${typename} {name} filter .name = 'Test Transaction'`
    );

    expect(items).toHaveLength(0);
  } finally {
    await pool.execute(`DROP TYPE ${typename};`);
    await pool.close();
  }
});
