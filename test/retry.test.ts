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
import {asyncConnect} from "./testbase";
import {Transaction, TransactionState} from "../src/transaction";
import {Connection} from "../src/ifaces";
import {IsolationLevel} from "../src/options";

class Barrier {
  _counter: number;
  _waiters: (() => void)[];
  constructor(counter: number) {
    this._counter = counter;
    this._waiters = [];
  }
  async ready() {
    if (this._counter == 0) {
      return;
    }
    this._counter -= 1;
    if (this._counter == 0) {
      for (let waiter of this._waiters.splice(0, this._waiters.length)) {
        waiter();
      }
    } else {
      await new Promise((accept) => {
        this._waiters.push(accept);
      });
    }
  }
}

const typename = "RetryTest";

async function run(test: (con: Connection) => Promise<void>): Promise<void> {
  const connection = await asyncConnect();

  try {
    await test(connection);
  } finally {
    await connection.close();
  }
}

async function run2(
  test: (con1: Connection, con2: Connection) => Promise<void>
): Promise<void> {
  const connection = await asyncConnect();
  try {
    const connection2 = await asyncConnect();
    try {
      await test(connection, connection2);
    } finally {
        try {
          await connection2.close();
        } catch(e) {
            console.error("Error closing connection", e)
        }
    }
  } finally {
    try {
        await connection.close();
    } catch(e) {
        console.error("Error closing connection", e)
    }
  }
}

beforeAll(async () => {
  await run(async (con) => {
    await con.execute(`
      CREATE TYPE ${typename} EXTENDING std::Object {
        CREATE PROPERTY name -> std::str {
          CREATE CONSTRAINT std::exclusive;
        };
        CREATE PROPERTY value -> std::int32 {
          SET default := 0;
        };
      };
    `);
  });
});

afterAll(async () => {
  await run(async (con) => {
    await con.execute(`DROP TYPE ${typename};`);
  });
});

test("retry: regular 01", async () => {
  await run(async (con) => {
    await con.retryingTransaction(async (tx) => {
      await tx.execute(`
        INSERT ${typename} {
          name := 'counter1'
        };
      `);
    });
  });
});

test("retry: conflict", async () => {
  await run2(async (con, con2) => {
    let iterations = 0;
    let barrier = new Barrier(2);

    async function transaction(con: Connection): Promise<void> {
      return await con.retryingTransaction(async (tx) => {
        iterations += 1;

        // This magic query makes the test more reliable for some
        // reason. I guess this is because starting a transaction
        // in EdgeDB (and/or Postgres) is accomplished somewhat
        // lazily, i.e. only start transaction on the first query
        // rather than on the `START TRANSACTION`.
        await tx.query(`SELECT 1`);

        // Start both transactions at the same initial data.
        // One should succeed other should fail and retry.
        // On next attempt, the latter should succeed
        await barrier.ready();

        return await tx.queryOne(`
          SELECT (
            INSERT ${typename} {
              name := 'counter2',
              value := 1,
            } UNLESS CONFLICT ON .name
            ELSE (
              UPDATE ${typename}
              SET { value := .value + 1 }
            )
          ).value
        `);
      });
    }

    let results = await Promise.all([transaction(con), transaction(con2)]);
    results.sort();
    expect(results).toEqual([1, 2]);
    expect(iterations).toEqual(3);
  });
});
