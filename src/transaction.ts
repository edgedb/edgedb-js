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
import {BorrowReason, Connection} from "./ifaces";
import {Executor, QueryArgs} from "./ifaces";
import {INNER} from "./ifaces";
import {getUniqueId} from "./utils";
import {ConnectionImpl, borrowError, ClientInnerConnection} from "./client";
import {ClientConnection} from "./client";
import {Set} from "./datatypes/set";
import {TransactionOptions, IsolationLevel} from "./options";

export enum TransactionState {
  NEW = 0,
  STARTED = 1,
  COMMITTED = 2,
  ROLLEDBACK = 3,
  FAILED = 4,
}

export const START_TRANSACTION_IMPL = Symbol("START_TRANSACTION_IMPL");

export class Transaction implements Executor {
  _connection: ClientConnection;
  _inner?: ClientInnerConnection;
  _impl?: ConnectionImpl;
  _deferrable: boolean;
  _isolation: IsolationLevel;
  _readonly: boolean;
  _state: TransactionState;
  _opInProgress: boolean;

  constructor(
    connection: Connection,
    options: TransactionOptions = TransactionOptions.defaults()
  ) {
    if (!(connection instanceof ClientConnection)) {
      throw new errors.InterfaceError(
        "connection is of unknown type for transaction"
      );
    }
    this._connection = connection as ClientConnection;
    this._deferrable = options.deferrable;
    this._isolation = options.isolation;
    this._readonly = options.readonly;
    this._state = TransactionState.NEW;
    this._opInProgress = false;
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

    const isolation = this._isolation;

    let mode;
    if (this._readonly) {
      mode = "READ ONLY";
    } else if (this._readonly !== undefined) {
      mode = "READ WRITE";
    }

    let defer;
    if (this._deferrable) {
      defer = "DEFERRABLE";
    } else if (this._deferrable !== undefined) {
      defer = "NOT DEFERRABLE";
    }

    return `START TRANSACTION ISOLATION ${isolation}, ${mode}, ${defer};`;
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
      await this.getConn().execute(query, true);
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
    const start_query = this._makeStartQuery();
    if (this._opInProgress) {
      throw borrowError(BorrowReason.QUERY);
    }
    this._opInProgress = true;
    try {
      const inner = this._connection[INNER];
      if (inner.borrowedFor) {
        throw borrowError(BorrowReason.QUERY);
      }
      inner.borrowedFor = BorrowReason.TRANSACTION;
      this._inner = inner;
      this._impl = await inner.getImpl(singleConnect);
      await this._execute(start_query, TransactionState.STARTED);
    } finally {
      this._opInProgress = false;
    }
  }

  async commit(): Promise<void> {
    if (this._opInProgress) {
      throw borrowError(BorrowReason.QUERY);
    }
    this._opInProgress = true;
    try {
      this._inner!.borrowedFor = undefined;
      await this._execute(this._makeCommitQuery(), TransactionState.COMMITTED);
    } finally {
      this._opInProgress = false;
    }
  }

  async rollback(): Promise<void> {
    if (this._opInProgress) {
      throw borrowError(BorrowReason.QUERY);
    }
    this._opInProgress = true;
    try {
      this._inner!.borrowedFor = undefined;
      await this._execute(
        this._makeRollbackQuery(),
        TransactionState.ROLLEDBACK
      );
    } finally {
      this._opInProgress = false;
    }
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
    if (this._opInProgress) {
      throw borrowError(BorrowReason.QUERY);
    }
    this._opInProgress = true;
    try {
      await this.getConn().execute(query);
    } finally {
      this._opInProgress = false;
    }
  }

  async query<T = unknown>(query: string, args?: QueryArgs): Promise<T[]> {
    if (this._opInProgress) {
      throw borrowError(BorrowReason.QUERY);
    }
    this._opInProgress = true;
    try {
      return await this.getConn().fetch(query, args, false, false);
    } finally {
      this._opInProgress = false;
    }
  }

  async queryJSON(query: string, args?: QueryArgs): Promise<string> {
    if (this._opInProgress) {
      throw borrowError(BorrowReason.QUERY);
    }
    this._opInProgress = true;
    try {
      return await this.getConn().fetch(query, args, true, false);
    } finally {
      this._opInProgress = false;
    }
  }

  async querySingle<T = unknown>(
    query: string,
    args?: QueryArgs
  ): Promise<T | null> {
    if (this._opInProgress) {
      throw borrowError(BorrowReason.QUERY);
    }
    this._opInProgress = true;
    try {
      return await this.getConn().fetch(query, args, false, true);
    } finally {
      this._opInProgress = false;
    }
  }

  async querySingleJSON(query: string, args?: QueryArgs): Promise<string> {
    if (this._opInProgress) {
      throw borrowError(BorrowReason.QUERY);
    }
    this._opInProgress = true;
    try {
      return await this.getConn().fetch(query, args, true, true);
    } finally {
      this._opInProgress = false;
    }
  }

  async queryRequiredSingle<T = unknown>(
    query: string,
    args?: QueryArgs
  ): Promise<T> {
    if (this._opInProgress) {
      throw borrowError(BorrowReason.QUERY);
    }
    this._opInProgress = true;
    try {
      return await this.getConn().fetch(query, args, false, true, true);
    } finally {
      this._opInProgress = false;
    }
  }

  async queryRequiredSingleJSON(
    query: string,
    args?: QueryArgs
  ): Promise<string> {
    if (this._opInProgress) {
      throw borrowError(BorrowReason.QUERY);
    }
    this._opInProgress = true;
    try {
      return await this.getConn().fetch(query, args, true, true, true);
    } finally {
      this._opInProgress = false;
    }
  }
}
