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

import * as path from "path";
import * as util from "util";

import {
  parseConnectArguments,
  NormalizedConnectConfig,
} from "../src/con_utils";
import {asyncConnect} from "./testbase";
import {Connection} from "../src/ifaces";
import * as errors from "../src/errors";

function env_wrap(env: {[key: string]: any}, func: () => void): void {
  const old_env: {[key: string]: any} = {};

  // record the environment variables
  for (const key in env) {
    if (process.env[key] !== undefined) {
      old_env[key] = process.env[key];
    }
  }
  // set up the environment variables
  for (const key in env) {
    if (env[key] == null) {
      delete process.env[key];
    } else {
      process.env[key] = env[key];
    }
  }

  try {
    func();
  } finally {
    // restore the environment variables
    for (const key in env) {
      if (old_env[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = old_env[key];
      }
    }
  }
}

interface ConnectionTestCase {
  env?: {[key: string]: string};
  opts?: {[key: string]: any};
  result?: Partial<NormalizedConnectConfig>;
  error?: string | RegExp;
}

function runConnectionTest({
  env = {},
  opts,
  result,
  error,
}: ConnectionTestCase): void {
  if (error) {
    expect(() => {
      env_wrap(env, parseConnectArguments.bind(null, opts));
    }).toThrow(error);
  } else {
    env_wrap(env, () => {
      const args = parseConnectArguments(opts);
      expect(args).toMatchObject(result!);
    });
  }
}

test("parseConnectArguments", () => {
  const TESTS: ConnectionTestCase[] = [
    {
      opts: {
        user: "user",
        host: "localhost",
        logging: false,
        waitUntilAvailable: 0,
      },
      result: {
        addrs: [["localhost", 5656]],
        user: "user",
        database: "edgedb",
        waitUntilAvailable: 0,
        tlsOptions: {
          ALPNProtocols: ["edgedb-binary"],
        },
        logging: false,
        inProject: false,
        fromProject: false,
        fromEnv: false,
      },
    },

    {
      env: {
        EDGEDB_USER: "user",
        EDGEDB_DATABASE: "testdb",
        EDGEDB_PASSWORD: "passw",
        EDGEDB_HOST: "host",
        EDGEDB_PORT: "123",
      },
      result: {
        addrs: [["host", 123]],
        user: "user",
        password: "passw",
        database: "testdb",
        waitUntilAvailable: 30_000,
        tlsOptions: {
          ALPNProtocols: ["edgedb-binary"],
        },
        logging: true,
        inProject: false,
        fromProject: false,
        fromEnv: true,
      },
    },

    {
      env: {
        EDGEDB_USER: "user",
        EDGEDB_DATABASE: "testdb",
        EDGEDB_PASSWORD: "passw",
        EDGEDB_HOST: "host",
        EDGEDB_PORT: "123",
      },
      opts: {
        host: "host2",
        port: "456",
        user: "user2",
        password: "passw2",
        database: "db2",
        waitUntilAvailable: 30_000,
        tlsOptions: {
          ALPNProtocols: ["edgedb-binary"],
        },
      },
      result: {
        addrs: [["host2", 456]],
        user: "user2",
        password: "passw2",
        database: "db2",
        waitUntilAvailable: 30_000,
        tlsOptions: {
          ALPNProtocols: ["edgedb-binary"],
        },
        fromEnv: false,
      },
    },

    {
      env: {
        EDGEDB_USER: "user",
        EDGEDB_DATABASE: "testdb",
        EDGEDB_PASSWORD: "passw",
        EDGEDB_HOST: "host",
        EDGEDB_PORT: "123",
        PGSSLMODE: "prefer",
      },
      opts: {
        dsn: "edgedb://user3:123123@localhost/abcdef",
        host: "host2",
        port: "456",
        user: "user2",
        password: "passw2",
        database: "db2",
        serverSettings: {ssl: "False"},
      },
      result: {
        addrs: [["host2", 456]],
        user: "user2",
        password: "passw2",
        database: "db2",
        serverSettings: {ssl: "False"},
        waitUntilAvailable: 30_000,
        tlsOptions: {
          ALPNProtocols: ["edgedb-binary"],
        },
      },
    },

    {
      env: {
        EDGEDB_USER: "user",
        EDGEDB_DATABASE: "testdb",
        EDGEDB_PASSWORD: "passw",
        EDGEDB_HOST: "host",
        EDGEDB_PORT: "123",
      },
      opts: {
        dsn: "edgedb://user3:123123@localhost:5555/abcdef",
        commandTimeout: 10,
      },
      result: {
        addrs: [["localhost", 5555]],
        user: "user3",
        password: "123123",
        database: "abcdef",
        commandTimeout: 10,
        waitUntilAvailable: 30_000,
        tlsOptions: {
          ALPNProtocols: ["edgedb-binary"],
        },
      },
    },

    {
      opts: {
        dsn: "edgedb://user3:123123@localhost:5555/abcdef",
      },
      result: {
        addrs: [["localhost", 5555]],
        user: "user3",
        password: "123123",
        database: "abcdef",
        waitUntilAvailable: 30_000,
        tlsOptions: {
          ALPNProtocols: ["edgedb-binary"],
        },
      },
    },

    {
      opts: {dsn: "edgedb://user@host1,host2/db"},
      result: {
        addrs: [
          ["host1", 5656],
          ["host2", 5656],
        ],
        database: "db",
        user: "user",
        waitUntilAvailable: 30_000,
        tlsOptions: {
          ALPNProtocols: ["edgedb-binary"],
        },
      },
    },

    {
      opts: {dsn: "edgedb://user@host1:1111,host2:2222/db"},
      result: {
        addrs: [
          ["host1", 1111],
          ["host2", 2222],
        ],
        database: "db",
        user: "user",
        waitUntilAvailable: 30_000,
        tlsOptions: {
          ALPNProtocols: ["edgedb-binary"],
        },
      },
    },

    {
      env: {
        EDGEDB_HOST: "host1:1111,host2:2222",
        EDGEDB_USER: "foo",
      },
      opts: {dsn: "edgedb:///db"},
      result: {
        addrs: [
          ["host1", 1111],
          ["host2", 2222],
        ],
        database: "db",
        user: "foo",
        waitUntilAvailable: 30_000,
        tlsOptions: {
          ALPNProtocols: ["edgedb-binary"],
        },
      },
    },

    {
      env: {
        EDGEDB_USER: "foo",
      },
      opts: {dsn: "edgedb:///db?host=host1:1111,host2:2222"},
      result: {
        addrs: [
          ["host1", 1111],
          ["host2", 2222],
        ],
        database: "db",
        user: "foo",
        waitUntilAvailable: 30_000,
        tlsOptions: {
          ALPNProtocols: ["edgedb-binary"],
        },
      },
    },

    {
      env: {
        EDGEDB_USER: "foo",
      },
      opts: {dsn: "edgedb:///db", host: ["host1", "host2"]},
      result: {
        addrs: [
          ["host1", 5656],
          ["host2", 5656],
        ],
        database: "db",
        user: "foo",
        waitUntilAvailable: 30_000,
        tlsOptions: {
          ALPNProtocols: ["edgedb-binary"],
        },
      },
    },

    {
      opts: {
        dsn:
          "edgedb://user3:123123@localhost:5555/" +
          "abcdef?param=sss&param=123&host=testhost&user=testuser" +
          "&port=2222&database=testdb",
        host: "127.0.0.1",
        port: "888",
        user: "me",
        password: "ask",
        database: "db",
      },
      result: {
        addrs: [["127.0.0.1", 888]],
        serverSettings: {param: "123"},
        user: "me",
        password: "ask",
        database: "db",
        waitUntilAvailable: 30_000,
        tlsOptions: {
          ALPNProtocols: ["edgedb-binary"],
        },
      },
    },

    {
      opts: {
        dsn:
          "edgedb://user3:123123@localhost:5555/" +
          "abcdef?param=sss&param=123&host=testhost&user=testuser" +
          "&port=2222&database=testdb",
        host: "127.0.0.1",
        port: "888",
        user: "me",
        password: "ask",
        database: "db",
        serverSettings: {aa: "bb"},
      },
      result: {
        addrs: [["127.0.0.1", 888]],
        serverSettings: {aa: "bb", param: "123"},
        user: "me",
        password: "ask",
        database: "db",
        waitUntilAvailable: 30_000,
        tlsOptions: {
          ALPNProtocols: ["edgedb-binary"],
        },
      },
    },

    {
      opts: {dsn: "edgedb:///dbname?host=/unix_sock/test&user=spam"},
      error: "UNIX sockets are not supported",
    },

    {
      opts: {dsn: "pq:///dbname?host=/unix_sock/test&user=spam"},
      error:
        'dsn "pq:///dbname?host=/unix_sock/test&user=spam" ' +
        "is neither a edgedb:// URI nor valid instance name",
    },

    {
      opts: {dsn: "edgedb://host1,host2,host3/db", port: [111, 222]},
      error: "could not match 2 port numbers to 3 hosts",
    },

    {
      opts: {dsn: "edgedb://user@?port=56226&host=%2Ftmp"},
      error: "UNIX sockets are not supported",
    },
  ];

  for (const testCase of TESTS) {
    runConnectionTest(testCase);
  }
});

test("connect: timeout", async () => {
  let con: Connection | undefined;
  try {
    con = await asyncConnect({
      timeout: 1,
      waitUntilAvailable: 0,
      pool: {minSize: 1},
    });
    throw new Error("connection didn't time out");
  } catch (e: any) {
    expect(e).toBeInstanceOf(errors.ClientConnectionTimeoutError);
    expect(e.message).toMatch("connection timed out (1ms)");
  } finally {
    if (typeof con !== "undefined") {
      await con.close();
    }
  }
});

test("connect: refused", async () => {
  let con: Connection | undefined;
  try {
    con = await asyncConnect({
      host: "localhost",
      port: 23456,
      waitUntilAvailable: 0,
      pool: {minSize: 1},
    });
    throw new Error("connection isn't refused");
  } catch (e: any) {
    expect(e).toBeInstanceOf(errors.ClientConnectionFailedTemporarilyError);
    expect(e.source.code).toMatch("ECONNREFUSED");
  } finally {
    if (typeof con !== "undefined") {
      await con.close();
    }
  }
});

test("connect: invalid name", async () => {
  let con: Connection | undefined;
  try {
    con = await asyncConnect({
      host: "invalid.example.org",
      port: 23456,
      waitUntilAvailable: 0,
      pool: {minSize: 1},
    });
    throw new Error("name was resolved");
  } catch (e: any) {
    expect(e).toBeInstanceOf(errors.ClientConnectionFailedTemporarilyError);
    expect(e.source.code).toMatch("ENOTFOUND");
    expect(e.source.syscall).toMatch("getaddrinfo");
  } finally {
    if (typeof con !== "undefined") {
      await con.close();
    }
  }
});

test("connect: refused unix", async () => {
  let con: Connection | undefined;
  try {
    con = await asyncConnect({
      host: "/tmp/non-existent",
      waitUntilAvailable: 0,
      pool: {minSize: 1},
    });
    throw new Error("connection isn't refused");
  } catch (e: any) {
    expect(e.toString()).toMatch("UNIX sockets are not supported");
  } finally {
    if (typeof con !== "undefined") {
      await con.close();
    }
  }
});
