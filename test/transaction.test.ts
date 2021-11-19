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
import {Client} from "../src/index.node";
import {IsolationLevel, TransactionOptions} from "../src/options";
import {sleep} from "../src/utils";
import Event from "../src/primitives/event";
import {getClient} from "./testbase";

const typename = "TransactionTest";

async function run(test: (con: Client) => Promise<void>): Promise<void> {
  const client = getClient();

  try {
    await test(client);
  } finally {
    try {
      await client.close();
    } catch (e) {
      console.error("Error closing connection", e);
    }
  }
}

beforeAll(async () => {
  await run(async con => {
    await con.execute(`
      CREATE TYPE ${typename} {
        CREATE REQUIRED PROPERTY name -> std::str;
      };
    `);
  });
});

afterAll(async () => {
  await run(async con => {
    await con.execute(`DROP TYPE ${typename};`);
  });
});

test("transaction: regular 01", async () => {
  await run(async con => {
    const rawTransaction = con.withRetryOptions({attempts: 1}).transaction;

    async function faulty(): Promise<void> {
      await rawTransaction(async tx => {
        await tx.execute(`
          INSERT ${typename} {
            name := 'Test Transaction'
          };
        `);
        await tx.execute("SELECT 1 / 0;");
      });
    }

    await expect(faulty()).rejects.toThrow(
      new errors.DivisionByZeroError().message
    );

    const items = await con.query(
      `select ${typename} {name} filter .name = 'Test Transaction'`
    );

    expect(items).toHaveLength(0);
  });
});

function* all_options(): Generator<
  [IsolationLevel | undefined, boolean | undefined, boolean | undefined],
  void,
  void
> {
  let levels = [undefined, IsolationLevel.Serializable];
  let booleans = [undefined, true, false];
  for (let isolation of levels) {
    for (let readonly of booleans) {
      for (let deferred of booleans) {
        yield [isolation, readonly, deferred];
      }
    }
  }
}

test("transaction: kinds", async () => {
  await run(async con => {
    for (let [isolation, readonly, defer] of all_options()) {
      let partial = {isolation, readonly, defer};
      let opt = new TransactionOptions(partial); // class api
      await con
        .withTransactionOptions(opt)
        .withRetryOptions({attempts: 1})
        .transaction(async tx => {});
      await con.withTransactionOptions(opt).transaction(async tx => {});
    }
  });

  await run(async con => {
    for (let [isolation, readonly, defer] of all_options()) {
      let opt = {isolation, readonly, defer}; // obj api
      await con
        .withTransactionOptions(opt)
        .withRetryOptions({attempts: 1})
        .transaction(async tx => {});
      await con.withTransactionOptions(opt).transaction(async tx => {});
    }
  });
});

test("no transaction statements", async () => {
  const client = getClient();

  await expect(client.execute("start transaction")).rejects.toThrow(
    errors.CapabilityError
  );

  await expect(client.query("start transaction")).rejects.toThrow(
    errors.CapabilityError
  );

  // This test is broken, first rollback query throws CapabilityError, but
  // then second rollback query doesn't throw any error
  // https://github.com/edgedb/edgedb/issues/3120

  // await client.transaction(async (tx) => {
  //   await expect(tx.execute("rollback")).rejects.toThrow(
  //     errors.CapabilityError
  //   );

  //   await expect(tx.query("rollback")).rejects.toThrow(errors.CapabilityError);
  // });

  await client.close();
});

test("transaction timeout", async () => {
  const client = getClient({concurrency: 1});

  const startTime = Date.now();
  const timedoutQueryDone = new Event();

  try {
    await client.transaction(async tx => {
      await sleep(15_000);

      try {
        await tx.query(`select 123`);
      } catch (err) {
        timedoutQueryDone.setError(err);
      }
    });
  } catch (err) {
    expect(Date.now() - startTime).toBeLessThan(15_000);
    expect(err).toBeInstanceOf(errors.IdleTransactionTimeoutError);
  }

  await expect(client.querySingle(`select 123`)).resolves.toBe(123);

  await expect(timedoutQueryDone.wait()).rejects.toThrow(
    errors.ClientConnectionClosedError
  );

  await client.close();
}, 20_000);

test("transaction deadlocking client pool", async () => {
  const client = getClient({concurrency: 1});

  const innerQueryDone = new Event();
  let innerQueryResult: any;

  await expect(
    client.transaction(async tx => {
      // This query will hang forever waiting on the connection holder
      // held by the transaction, which itself will not return the holder
      // to the pool until the query completes. This deadlock should be
      // resolved by the transaction timeout forcing the transaction to
      // return the holder to the pool.
      innerQueryResult = await client.querySingle(`select 123`);
      innerQueryDone.set();
    })
  ).rejects.toThrow(errors.TransactionTimeoutError);

  await expect(innerQueryDone.wait()).resolves.toBe(undefined);
  expect(innerQueryResult).toBe(123);

  await client.close();
}, 15_000);
