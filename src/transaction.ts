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
import {BorrowReason, Connection, TransactionOptions} from "./ifaces";
import {Executor, QueryArgs, CONNECTION_IMPL} from "./ifaces";
import {ALLOW_MODIFICATIONS, BORROWED_FOR} from "./ifaces";
import {getUniqueId} from "./utils";
import {ConnectionImpl} from "./client";
import {Set} from "./datatypes/set";

export enum TransactionState {
  NEW = 0,
  STARTED = 1,
  COMMITTED = 2,
  ROLLEDBACK = 3,
  FAILED = 4,
}

export enum IsolationLevel {
  SERIALIZABLE = "serializable",
  REPEATABLE_READ = "repeatable_read",
}

export const START_TRANSACTION_IMPL = Symbol("START_TRANSACTION_IMPL");

export class Transaction implements Executor {
  [ALLOW_MODIFICATIONS]: never;
  _connection: Connection;
  _impl?: ConnectionImpl;
  _deferrable?: boolean;
  _isolation?: IsolationLevel;
  _readonly?: boolean;
  _state: TransactionState;

  constructor(connection: Connection, options?: TransactionOptions) {
    if (options === undefined) {
      options = {};
    }
    this._connection = connection;
    this._deferrable = options.deferrable;
    this._isolation = options.isolation;
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

    let query: string = "START TRANSACTION";

    if (this._isolation === IsolationLevel.REPEATABLE_READ) {
      query = "START TRANSACTION ISOLATION REPEATABLE READ";
    } else if (this._isolation === IsolationLevel.SERIALIZABLE) {
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

    return query;
  }

  protected _makeCommitQuery(): string {
    this._checkState("commit");
    return "COMMIT;";
  }

  protected _makeRollbackQuery(): string {
    this._checkState("rollback");
    return "ROLLBACK;";
  }
  private async _execute(
    query: string,
    successState: TransactionState
  ): Promise<void> {
    try {
      await this.getConn().execute(query);
      this._state = successState;
    } catch (error) {
      this._state = TransactionState.FAILED;
      throw error;
    }
  }

  start(): Promise<void> {
    return this[START_TRANSACTION_IMPL]();
  }

  async [START_TRANSACTION_IMPL](
    singleConnect: boolean = false
  ): Promise<void> {
    this._connection[BORROWED_FOR] = BorrowReason.TRANSACTION;
    this._impl = await this._connection[CONNECTION_IMPL](singleConnect);
    await this._execute(this._makeStartQuery(), TransactionState.STARTED);
  }

  async commit(): Promise<void> {
    this._connection[BORROWED_FOR] = undefined;
    await this._execute(this._makeCommitQuery(), TransactionState.COMMITTED);
  }

  async rollback(): Promise<void> {
    this._connection[BORROWED_FOR] = undefined;
    await this._execute(
      this._makeRollbackQuery(),
      TransactionState.ROLLEDBACK
    );
  }
  private getConn(): ConnectionImpl {
    const conn = this._impl;
    if (!conn) {
      throw new errors.InterfaceError("Transaction is not started");
    } else {
      return conn;
    }
  }

  async execute(query: string): Promise<void> {
    await this.getConn().execute(query);
  }

  async query(query: string, args?: QueryArgs): Promise<Set> {
    return await this.getConn().query(query, args);
  }

  async queryJSON(query: string, args?: QueryArgs): Promise<string> {
    return await this.getConn().queryJSON(query, args);
  }

  async queryOne(query: string, args?: QueryArgs): Promise<any> {
    return await this.getConn().queryOne(query, args);
  }

  async queryOneJSON(query: string, args?: QueryArgs): Promise<string> {
    return await this.getConn().queryOneJSON(query, args);
  }
}
