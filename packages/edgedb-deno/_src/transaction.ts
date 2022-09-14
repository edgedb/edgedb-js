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
import {ClientConnectionHolder} from "./client.ts";
import * as errors from "./errors/index.ts";
import {Cardinality, Executor, OutputFormat, QueryArgs} from "./ifaces.ts";
import {RawConnection} from "./rawConn.ts";

export enum TransactionState {
  ACTIVE = 0,
  COMMITTED = 1,
  ROLLEDBACK = 2,
  FAILED = 3,
}

export class Transaction implements Executor {
  protected _holder: ClientConnectionHolder;
  private _rawConn: RawConnection;

  private _state: TransactionState;
  private _opInProgress: boolean;

  private constructor(holder: ClientConnectionHolder, rawConn: RawConnection) {
    this._holder = holder;
    this._rawConn = rawConn;

    this._state = TransactionState.ACTIVE;
    this._opInProgress = false;
  }

  /** @internal */
  static async _startTransaction(
    holder: ClientConnectionHolder
  ): Promise<Transaction> {
    const rawConn = await holder._getConnection();

    await rawConn.resetState();

    const options = holder.options.transactionOptions;
    await rawConn.fetch(
      `START TRANSACTION ISOLATION ${options.isolation}, ${
        options.readonly ? "READ ONLY" : "READ WRITE"
      }, ${options.deferrable ? "" : "NOT "}DEFERRABLE;`,
      undefined,
      OutputFormat.NONE,
      Cardinality.NO_RESULT,
      holder.options.session,
      true
    );

    return new Transaction(holder, rawConn);
  }

  /** @internal */
  async _waitForConnAbort(): Promise<void> {
    await this._rawConn.connAbortWaiter.wait();

    const abortError = this._rawConn.getConnAbortError();
    if (
      abortError instanceof errors.EdgeDBError &&
      abortError.source instanceof errors.TransactionTimeoutError
    ) {
      throw abortError.source;
    } else {
      throw abortError;
    }
  }

  private async _runOp<T>(
    opname: string,
    op: () => Promise<T>,
    errMessage?: string
  ): Promise<T> {
    if (this._opInProgress) {
      throw new errors.InterfaceError(
        errMessage ??
          "Another query is in progress. Use the query methods " +
            "on 'Client' to run queries concurrently."
      );
    }
    if (this._state !== TransactionState.ACTIVE) {
      throw new errors.InterfaceError(
        `cannot ${opname}; the transaction is ${
          this._state === TransactionState.COMMITTED
            ? "already committed"
            : this._state === TransactionState.ROLLEDBACK
            ? "already rolled back"
            : "in error state"
        }`
      );
    }
    this._opInProgress = true;
    try {
      return await op();
    } finally {
      this._opInProgress = false;
    }
  }

  /** @internal */
  async _commit(): Promise<void> {
    await this._runOp(
      "commit",
      async () => {
        await this._rawConn.fetch(
          "COMMIT",
          undefined,
          OutputFormat.NONE,
          Cardinality.NO_RESULT,
          this._holder.options.session,
          true
        );
        this._state = TransactionState.COMMITTED;
      },
      "A query is still in progress after transaction block has returned."
    );
  }

  /** @internal */
  async _rollback(): Promise<void> {
    await this._runOp(
      "rollback",
      async () => {
        await this._rawConn.fetch(
          "ROLLBACK",
          undefined,
          OutputFormat.NONE,
          Cardinality.NO_RESULT,
          this._holder.options.session,
          true
        );
        this._state = TransactionState.ROLLEDBACK;
      },
      "A query is still in progress after transaction block has returned."
    );
  }

  async execute(query: string, args?: QueryArgs): Promise<void> {
    return this._runOp("execute", () =>
      this._rawConn.fetch(
        query,
        args,
        OutputFormat.NONE,
        Cardinality.NO_RESULT,
        this._holder.options.session
      )
    );
  }

  async query<T = unknown>(query: string, args?: QueryArgs): Promise<T[]> {
    return this._runOp("query", () =>
      this._rawConn.fetch(
        query,
        args,
        OutputFormat.BINARY,
        Cardinality.MANY,
        this._holder.options.session
      )
    );
  }

  async queryJSON(query: string, args?: QueryArgs): Promise<string> {
    return this._runOp("queryJSON", () =>
      this._rawConn.fetch(
        query,
        args,
        OutputFormat.JSON,
        Cardinality.MANY,
        this._holder.options.session
      )
    );
  }

  async querySingle<T = unknown>(
    query: string,
    args?: QueryArgs
  ): Promise<T | null> {
    return this._runOp("querySingle", () =>
      this._rawConn.fetch(
        query,
        args,
        OutputFormat.BINARY,
        Cardinality.AT_MOST_ONE,
        this._holder.options.session
      )
    );
  }

  async querySingleJSON(query: string, args?: QueryArgs): Promise<string> {
    return this._runOp("querySingleJSON", () =>
      this._rawConn.fetch(
        query,
        args,
        OutputFormat.JSON,
        Cardinality.AT_MOST_ONE,
        this._holder.options.session
      )
    );
  }

  async queryRequiredSingle<T = unknown>(
    query: string,
    args?: QueryArgs
  ): Promise<T> {
    return this._runOp("queryRequiredSingle", () =>
      this._rawConn.fetch(
        query,
        args,
        OutputFormat.BINARY,
        Cardinality.ONE,
        this._holder.options.session
      )
    );
  }

  async queryRequiredSingleJSON(
    query: string,
    args?: QueryArgs
  ): Promise<string> {
    return this._runOp("queryRequiredSingleJSON", () =>
      this._rawConn.fetch(
        query,
        args,
        OutputFormat.JSON,
        Cardinality.ONE,
        this._holder.options.session
      )
    );
  }
}
