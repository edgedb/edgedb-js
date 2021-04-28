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
import {
  connectionsInTransaction,
  Transaction,
  TransactionState,
} from "../src/legacy_transaction";
import {Connection} from "../src/ifaces";
import {IsolationLevel} from "../src/options";

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
      await con.transaction(async () => {
        await con.execute(`
          INSERT ${typename} {
            name := 'Test Transaction'
          };
        `);
        await con.execute("SELECT 1 / 0;");
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

test("transaction: nested 01", async () => {
  await run(async (con) => {
    expect(connectionsInTransaction.get(con)).toBeUndefined();

    function assertTransactionIsDefined(connection: Connection): void {
      // @ts-ignore
      const transaction = connectionsInTransaction.get(connection);
      expect(transaction).toBeDefined();
      // @ts-ignore
      expect(transaction?._connection).toBe(connection);
    }

    try {
      await con.transaction(async () => {
        assertTransactionIsDefined(con);

        // internal transaction
        await con.transaction(async () => {
          assertTransactionIsDefined(con);
          await con.execute(`
            INSERT ${typename} {
              name := 'TXTEST 1'
            };
          `);
        });

        assertTransactionIsDefined(con);

        async function faulty(): Promise<void> {
          await con.transaction(async () => {
            assertTransactionIsDefined(con);

            await con.execute(`
              INSERT ${typename} {
                name := 'TXTEST 2'
              };
            `);
            await con.execute("SELECT 1 / 0;");
          });
        }

        await expect(faulty()).rejects.toThrow(
          new errors.DivisionByZeroError().message
        );

        const records2 = await con.query(`
          SELECT ${typename} {
            name
          }
          FILTER .name LIKE 'TXTEST%';
        `);

        expect(records2[0].name).toEqual("TXTEST 1");
        assertTransactionIsDefined(con);

        await con.execute("SELECT 1 / 0;");
      });
    } catch (error) {
      expect(error).toBeInstanceOf(errors.DivisionByZeroError);
    }

    expect(connectionsInTransaction.get(con)).toBeUndefined();

    const records = await con.query(`
      SELECT ${typename} {
        name
      }
      FILTER .name LIKE 'TXTEST%';
    `);

    expect(records).toHaveLength(0);
  });
});

test("transaction_nested_02", async () => {
  await run(async (con) => {
    await con.transaction(
      async () => {
        await con.transaction(async () => {
          // no explicit isolation, OK, because the nested transaction
          // inherits the setting from the top transaction
        });
      },
      {
        isolation: IsolationLevel.RepeatableRead,
      }
    );

    async function faulty1(): Promise<void> {
      await con.transaction(
        async () => {
          await con.transaction(
            async () => {
              // ...
            },
            {
              isolation: IsolationLevel.Serializable,
            }
          );
        },
        {
          isolation: IsolationLevel.RepeatableRead,
        }
      );
    }

    await expect(faulty1()).rejects.toThrowError(
      new errors.InterfaceError(
        "nested transaction has a different isolation level: " +
          "current SERIALIZABLE != outer REPEATABLE READ"
      )
    );

    async function faulty2(): Promise<void> {
      await con.transaction(async () => {
        await con.transaction(
          async () => {
            // ...
          },
          {
            readonly: true,
          }
        );
      });
    }

    await expect(faulty2()).rejects.toThrowError(
      new errors.InterfaceError(
        "nested transaction has a different read-write spec: " +
          "current true != outer undefined"
      )
    );

    async function faulty3(): Promise<void> {
      await con.transaction(async () => {
        await con.transaction(
          async () => {
            // ...
          },
          {
            deferrable: true,
          }
        );
      });
    }

    await expect(faulty3()).rejects.toThrowError(
      new errors.InterfaceError(
        "nested transaction has a different deferrable spec: " +
          "current true != outer undefined"
      )
    );
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
  });
});
