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

import {
  parseConnectArguments,
  NormalizedConnectConfig,
} from "../src/con_utils";
import {asyncConnect} from "./testbase";
import {AwaitConnection} from "../src/client";

function env_wrap(env: {[key: string]: any}, func: () => void): void {
  const old_env: {[key: string]: any} = {};

  // record the envuronment variables
  for (const key in env) {
    if (process.env[key] !== undefined) {
      old_env[key] = process.env[key];
    }
  }
  // set up the envuronment variables
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
    // restore the envuronment variables
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
  result?: NormalizedConnectConfig;
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
      expect(args).toEqual(result);
    });
  }
}

test("parseConnectArguments", () => {
  const TESTS: ConnectionTestCase[] = [
    {
      opts: {
        user: "user",
        host: "localhost",
      },
      result: {
        addrs: [["localhost", 5656]],
        user: "user",
        database: "user",
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
      },
      result: {
        addrs: [["host2", 456]],
        user: "user2",
        password: "passw2",
        database: "db2",
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
        server_settings: {ssl: "False"},
      },
      result: {
        addrs: [["host2", 456]],
        user: "user2",
        password: "passw2",
        database: "db2",
        server_settings: {ssl: "False"},
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
        command_timeout: 10,
      },
      result: {
        addrs: [["localhost", 5555]],
        user: "user3",
        password: "123123",
        database: "abcdef",
        command_timeout: 10,
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
        server_settings: {param: "123"},
        user: "me",
        password: "ask",
        database: "db",
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
        server_settings: {aa: "bb"},
      },
      result: {
        addrs: [["127.0.0.1", 888]],
        server_settings: {aa: "bb", param: "123"},
        user: "me",
        password: "ask",
        database: "db",
      },
    },

    {
      opts: {dsn: "edgedb:///dbname?host=/unix_sock/test&user=spam"},
      result: {
        addrs: [path.join("/unix_sock/test", ".s.EDGEDB.5656")],
        user: "spam",
        database: "dbname",
      },
    },

    {
      opts: {dsn: "pq:///dbname?host=/unix_sock/test&user=spam"},
      error: "invalid DSN",
    },

    {
      opts: {dsn: "edgedb://host1,host2,host3/db", port: [111, 222]},
      error: "could not match 2 port numbers to 3 hosts",
    },

    {
      opts: {dsn: "edgedb://user@?port=56226&host=%2Ftmp"},
      result: {
        addrs: [path.join("/tmp", ".s.EDGEDB.56226")],
        user: "user",
        database: "user",
      },
    },

    {
      opts: {dsn: "edgedb://user@?host=%2Ftmp", admin: true},
      result: {
        addrs: [path.join("/tmp", ".s.EDGEDB.admin.5656")],
        user: "user",
        database: "user",
      },
    },

    {
      opts: {dsn: "edgedbadmin://user@?host=%2Ftmp"},
      result: {
        addrs: [path.join("/tmp", ".s.EDGEDB.admin.5656")],
        user: "user",
        database: "user",
      },
    },

    {
      opts: {dsn: "edgedbadmin://user@?host=%2Ftmp", admin: false},
      result: {
        addrs: [path.join("/tmp", ".s.EDGEDB.5656")],
        user: "user",
        database: "user",
      },
    },
  ];

  for (const testCase of TESTS) {
    runConnectionTest(testCase);
  }
});

test("connect: timeout", async () => {
  let con: AwaitConnection | undefined;
  try {
    con = await asyncConnect({timeout: 1});
    throw new Error("conneciton didn't time out");
  } catch (e) {
    expect(e.message).toMatch("failed to connect");
  } finally {
    if (typeof con !== "undefined") {
      await con.close();
    }
  }
});
