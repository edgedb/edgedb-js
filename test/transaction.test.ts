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
import {getClient} from "./testbase";
import {Transaction, TransactionState} from "../src/transaction";
import {Connection, Client} from "../src/ifaces";
import {TransactionOptions, IsolationLevel} from "../src/options";

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
  await run(async (con) => {
    await con.execute(`
      CREATE TYPE ${typename} {
        CREATE REQUIRED PROPERTY name -> std::str;
      };
    `);
  });
});

afterAll(async () => {
  await run(async (con) => {
    await con.execute(`DROP TYPE ${typename};`);
  });
});

test("transaction: regular 01", async () => {
  await run(async (con) => {
    const rawTransaction = con.withRetryOptions({attempts: 1}).transaction;

    async function faulty(): Promise<void> {
      await rawTransaction(async (tx) => {
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

test.skip("transaction interface errors", async () => {
  // TODO: use execution context to fix borrowed checks
  await run(async (con) => {
    const rawTransaction = con.withRetryOptions({attempts: 1}).transaction;

    async function borrow1(): Promise<void> {
      await rawTransaction(async (tx) => {
        await con.execute("SELECT 7*9");
      });
    }

    await expect(borrow1()).rejects.toThrowError(
      new errors.InterfaceError(
        "Connection object is borrowed for the transaction. " +
          "Use the methods on transaction object instead."
      )
    );

    async function borrow2(): Promise<void> {
      await rawTransaction(async (tx) => {
        await con.query("SELECT 7*9");
      });
    }
    await expect(borrow2()).rejects.toThrowError(
      new errors.InterfaceError(
        "Connection object is borrowed for the transaction. " +
          "Use the methods on transaction object instead."
      )
    );

    async function borrow3(): Promise<void> {
      await rawTransaction(async (tx) => {
        await con.querySingle("SELECT 7*9");
      });
    }
    await expect(borrow3()).rejects.toThrowError(
      new errors.InterfaceError(
        "Connection object is borrowed for the transaction. " +
          "Use the methods on transaction object instead."
      )
    );

    async function borrow4(): Promise<void> {
      await rawTransaction(async (tx) => {
        await con.queryJSON("SELECT 7*9");
      });
    }
    await expect(borrow4()).rejects.toThrowError(
      new errors.InterfaceError(
        "Connection object is borrowed for the transaction. " +
          "Use the methods on transaction object instead."
      )
    );

    async function borrow5(): Promise<void> {
      await rawTransaction(async (tx) => {
        await con.querySingleJSON("SELECT 7*9");
      });
    }
    await expect(borrow5()).rejects.toThrowError(
      new errors.InterfaceError(
        "Connection object is borrowed for the transaction. " +
          "Use the methods on transaction object instead."
      )
    );
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
  await run(async (con) => {
    for (let [isolation, readonly, defer] of all_options()) {
      let partial = {isolation, readonly, defer};
      let opt = new TransactionOptions(partial); // class api
      await con
        .withTransactionOptions(opt)
        .withRetryOptions({attempts: 1})
        .transaction(async (tx) => {});
      await con.withTransactionOptions(opt).transaction(async (tx) => {});
    }
  });

  await run(async (con) => {
    for (let [isolation, readonly, defer] of all_options()) {
      let opt = {isolation, readonly, defer}; // obj api
      await con
        .withTransactionOptions(opt)
        .withRetryOptions({attempts: 1})
        .transaction(async (tx) => {});
      await con.withTransactionOptions(opt).transaction(async (tx) => {});
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
