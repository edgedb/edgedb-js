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
import * as errors from "./errors";
import {Executor} from "./ifaces";
import {getUniqueId} from "./utils";
import {TransactionOptions, IsolationLevel} from "./options";

export enum TransactionState {
  NEW = 0,
  STARTED = 1,
  COMMITTED = 2,
  ROLLEDBACK = 3,
  FAILED = 4,
}

export const connectionsInTransaction = new WeakMap<
  Executor,
  BaseTransaction
>();

class BaseTransaction {
  _id: string | null;
  _connection: Executor;
  _deferrable?: boolean;
  _isolation?: IsolationLevel;
  _managed: boolean;
  _nested: boolean;
  _readonly?: boolean;
  _state: TransactionState;

  constructor(connection: Executor, options?: Partial<TransactionOptions>) {
    if (options === undefined) {
      options = {};
    }
    this._connection = connection;
    this._deferrable = options.deferrable;
    this._id = null;
    this._isolation = options.isolation;
    this._managed = false;
    this._nested = false;
    this._readonly = options.readonly;
    this._state = TransactionState.NEW;
  }

  get state(): TransactionState {
    return this._state;
  }

  isActive(): boolean {
    return this._state === TransactionState.STARTED;
  }

  private _checkStateBase(opname: string): void {
    if (this._state === TransactionState.COMMITTED) {
      throw new errors.InterfaceError(
        `cannot ${opname}; the transaction is already committed`
      );
    }
    if (this._state === TransactionState.ROLLEDBACK) {
      throw new errors.InterfaceError(
        `cannot ${opname}; the transaction is already rolled back`
      );
    }
    if (this._state === TransactionState.FAILED) {
      throw new errors.InterfaceError(
        `cannot ${opname}; the transaction is in error state`
      );
    }
  }

  private _checkState(opname: string): void {
    if (this._state !== TransactionState.STARTED) {
      if (this._state === TransactionState.NEW) {
        throw new errors.InterfaceError(
          `cannot ${opname}; the transaction is not yet started`
        );
      }
      this._checkStateBase(opname);
    }
  }

  protected _makeStartQuery(): string {
    this._checkStateBase("start");

    if (this._state === TransactionState.STARTED) {
      throw new errors.InterfaceError(
        "cannot start; the transaction is already started"
      );
    }

    this._checkIfNested();

    let query: string;

    if (this._nested) {
      this._id = getUniqueId("savepoint");
      query = `DECLARE SAVEPOINT ${this._id};`;
    } else {
      query = "START TRANSACTION";

      if (this._isolation === IsolationLevel.RepeatableRead) {
        query = "START TRANSACTION ISOLATION REPEATABLE READ";
      } else if (this._isolation === IsolationLevel.Serializable) {
        query = "START TRANSACTION ISOLATION SERIALIZABLE";
      }

      if (this._readonly) {
        query += " READ ONLY";
      } else if (this._readonly !== undefined) {
        query += " READ WRITE";
      }

      if (this._deferrable) {
        query += " DEFERRABLE";
      } else if (this._deferrable !== undefined) {
        query += " NOT DEFERRABLE";
      }

      query += ";";
    }

    return query;
  }

  private _checkIfNested(): void {
    const connection = this._connection;
    const topTransaction = connectionsInTransaction.get(connection);

    if (!topTransaction) {
      connectionsInTransaction.set(connection, this);
    } else {
      // Nested transaction block
      if (this._isolation === undefined) {
        this._isolation = topTransaction._isolation;
      }
      if (this._readonly === undefined) {
        this._readonly = topTransaction._readonly;
      }
      if (this._deferrable === undefined) {
        this._deferrable = topTransaction._deferrable;
      }

      if (this._isolation !== topTransaction._isolation) {
        throw new errors.InterfaceError(
          `nested transaction has a different isolation level: ` +
            `current ${this._isolation} != outer ${topTransaction._isolation}`
        );
      }
      if (this._readonly !== topTransaction._readonly) {
        throw new errors.InterfaceError(
          `nested transaction has a different read-write spec: ` +
            `current ${this._readonly} != outer ${topTransaction._readonly}`
        );
      }
      if (this._deferrable !== topTransaction._deferrable) {
        throw new errors.InterfaceError(
          `nested transaction has a different deferrable spec: ` +
            `current ${this._deferrable} != outer ${topTransaction._deferrable}`
        );
      }

      this._nested = true;
    }
  }

  protected _removeMapReference(): void {
    if (connectionsInTransaction.get(this._connection) === this) {
      connectionsInTransaction.delete(this._connection);
    }
  }

  protected _makeCommitQuery(): string {
    this._checkState("commit");

    this._removeMapReference();

    if (this._nested) {
      return `RELEASE SAVEPOINT ${this._id};`;
    }

    return "COMMIT;";
  }

  protected _makeRollbackQuery(): string {
    this._checkState("rollback");

    this._removeMapReference();

    if (this._nested) {
      return `ROLLBACK TO SAVEPOINT ${this._id};`;
    }

    return "ROLLBACK;";
  }
}

export class Transaction extends BaseTransaction {
  private async _execute(
    query: string,
    successState: TransactionState
  ): Promise<void> {
    try {
      await this._connection.query(query);

      this._state = successState;
    } catch (error) {
      this._state = TransactionState.FAILED;
      throw error;
    }
  }

  async start(): Promise<void> {
    await this._execute(this._makeStartQuery(), TransactionState.STARTED);
  }

  async commit(): Promise<void> {
    await this._execute(this._makeCommitQuery(), TransactionState.COMMITTED);
  }

  async rollback(): Promise<void> {
    await this._execute(
      this._makeRollbackQuery(),
      TransactionState.ROLLEDBACK
    );
  }
}
