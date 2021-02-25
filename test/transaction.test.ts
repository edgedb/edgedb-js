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
import {Connection, IsolationLevel} from "../src/ifaces";

const typename = "TransactionTest";

async function run(test: (con: Connection) => Promise<void>): Promise<void> {
  const connection = await asyncConnect();

  try {
    await test(connection);
  } finally {
    await connection.close();
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
    async function faulty(): Promise<void> {
      await con.tryTransaction(async (tx) => {
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

test("transaction interface errors", async () => {
  await run(async (con) => {
    const transaction = new Transaction(con);

    async function faulty1(): Promise<void> {
      await transaction.start();
      await transaction.start();
    }

    await expect(faulty1()).rejects.toThrowError(
      new errors.InterfaceError(
        "cannot start; the transaction is already started"
      )
    );

    expect(transaction.state === TransactionState.FAILED);

    await transaction.rollback();

    expect(transaction.state === TransactionState.ROLLEDBACK);

    await expect(faulty1()).rejects.toThrowError(
      new errors.InterfaceError(
        "cannot start; the transaction is already rolled back"
      )
    );

    async function borrow1(): Promise<void> {
      await con.tryTransaction(async (tx) => {
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
      await con.tryTransaction(async (tx) => {
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
      await con.tryTransaction(async (tx) => {
        await con.queryOne("SELECT 7*9");
      });
    }
    await expect(borrow3()).rejects.toThrowError(
      new errors.InterfaceError(
        "Connection object is borrowed for the transaction. " +
          "Use the methods on transaction object instead."
      )
    );

    async function borrow4(): Promise<void> {
      await con.tryTransaction(async (tx) => {
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
      await con.tryTransaction(async (tx) => {
        await con.queryOneJSON("SELECT 7*9");
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
