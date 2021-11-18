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
import {ConnectConfig} from "./con_utils";
import {parseConnectArguments, NormalizedConnectConfig} from "./con_utils";
import {LifoQueue} from "./primitives/queues";

import {retryingConnect} from "./client";
import {
  Options,
  RetryOptions,
  SimpleRetryOptions,
  SimpleTransactionOptions,
  TransactionOptions,
} from "./options";

import {CodecsRegistry} from "./codecs/registry";

import {QueryArgs, Executor} from "./ifaces";
import {START_TRANSACTION_IMPL, Transaction} from "./transaction";
import {Deferred} from "./primitives/deferred";
import {RawConnection} from "./rawConn";
import {sleep} from "./utils";

export class ClientConnectionHolder {
  private _pool: ClientPool;
  private _connection: RawConnection | null;
  private _options: Options | null;
  private _inUse: Deferred<void> | null;

  constructor(pool: ClientPool) {
    this._pool = pool;
    this._connection = null;
    this._options = null;
    this._inUse = null;
  }

  get options(): Options {
    return this._options ?? Options.defaults();
  }

  async _getConnection(
    singleConnect: boolean = false
  ): Promise<RawConnection> {
    if (!this._connection || this._connection.isClosed()) {
      this._connection = await this._pool.getNewConnection(singleConnect);
    }
    return this._connection;
  }

  get connectionOpen(): boolean {
    return this._connection !== null && !this._connection.isClosed();
  }

  async acquire(options: Options): Promise<ClientConnectionHolder> {
    if (this._inUse) {
      throw new Error(
        "ClientConnectionHolder cannot be acquired, already in use"
      );
    }

    this._options = options;
    this._inUse = new Deferred<void>();

    return this;
  }

  async release(): Promise<void> {
    if (this._inUse === null) {
      throw new errors.ClientError(
        "ClientConnectionHolder.release() called on " +
          "a free connection holder"
      );
    }

    this._options = null;
    await this._release();
  }

  private async _release(): Promise<void> {
    if (this._inUse === null) {
      return;
    }

    await this._connection?.resetState();

    if (!this._inUse.done) {
      await this._inUse.setResult();
    }

    this._inUse = null;

    // Put ourselves back to the pool queue.
    this._pool.enqueue(this);
  }

  /** @internal */
  async _waitUntilReleasedAndClose(): Promise<void> {
    if (this._inUse) {
      await this._inUse.promise;
    }
    await this._connection?.close();
  }

  terminate(): void {
    this._connection?.close();
  }

  async transaction<T>(
    action: (transaction: Transaction) => Promise<T>
  ): Promise<T> {
    let result: T;
    for (let iteration = 0; iteration >= 0; ++iteration) {
      const transaction = new Transaction(this);
      await transaction[START_TRANSACTION_IMPL](iteration !== 0);
      try {
        result = await action(transaction);
      } catch (err) {
        try {
          await transaction.rollback();
        } catch (rollback_err) {
          if (!(rollback_err instanceof errors.EdgeDBError)) {
            // We ignore EdgeDBError errors on rollback, retrying
            // if possible. All other errors are propagated.
            throw rollback_err;
          }
        }
        if (
          err instanceof errors.EdgeDBError &&
          err.hasTag(errors.SHOULD_RETRY)
        ) {
          const rule = this.options.retryOptions.getRuleForException(err);
          if (iteration + 1 >= rule.attempts) {
            throw err;
          }
          await sleep(rule.backoff(iteration + 1));
          continue;
        }
        throw err;
      }
      // TODO(tailhook) sort out errors on commit, early network errors
      // and some other errors could be retried
      // NOTE: we can't retry on all the same errors as we don't know if
      // commit is succeeded before the database have received it or after
      // it have been done but network is dropped before we were able
      // to receive a response
      await transaction.commit();
      return result;
    }
    throw Error("unreachable");
  }

  async execute(query: string): Promise<void> {
    const conn = await this._getConnection();
    return await conn.execute(query);
  }

  async query(query: string, args?: QueryArgs): Promise<any> {
    const conn = await this._getConnection();
    return await conn.fetch(query, args, false, false);
  }

  async queryJSON(query: string, args?: QueryArgs): Promise<string> {
    const conn = await this._getConnection();
    return await conn.fetch(query, args, true, false);
  }

  async querySingle(query: string, args?: QueryArgs): Promise<any> {
    const conn = await this._getConnection();
    return await conn.fetch(query, args, false, true);
  }

  async querySingleJSON(query: string, args?: QueryArgs): Promise<string> {
    const conn = await this._getConnection();
    return await conn.fetch(query, args, true, true);
  }

  async queryRequiredSingle(query: string, args?: QueryArgs): Promise<any> {
    const conn = await this._getConnection();
    return await conn.fetch(query, args, false, true, true);
  }

  async queryRequiredSingleJSON(
    query: string,
    args?: QueryArgs
  ): Promise<string> {
    const conn = await this._getConnection();
    return await conn.fetch(query, args, true, true, true);
  }
}

class ClientPool {
  private _closed: boolean;
  private _closing: boolean;
  private _queue: LifoQueue<ClientConnectionHolder>;
  private _holders: ClientConnectionHolder[];
  private _userConcurrency: number | null;
  private _suggestedConcurrency: number | null;
  private _connectConfig: ConnectConfig;
  private _codecsRegistry: CodecsRegistry;

  constructor(dsn?: string, options: ConnectOptions = {}) {
    this.validateClientOptions(options);

    this._codecsRegistry = new CodecsRegistry();

    this._queue = new LifoQueue<ClientConnectionHolder>();
    this._holders = [];
    this._userConcurrency = options.concurrency ?? null;
    this._suggestedConcurrency = null;
    this._closing = false;
    this._closed = false;
    this._connectConfig = {...options, ...(dsn !== undefined ? {dsn} : {})};

    this._resizeHolderPool();
  }

  private validateClientOptions(opts: ClientOptions): void {
    if (
      opts.concurrency != null &&
      (typeof opts.concurrency !== "number" ||
        !Number.isInteger(opts.concurrency) ||
        opts.concurrency < 0)
    ) {
      throw new Error(
        `invalid 'concurrency' value: ` +
          `expected integer greater than 0 (got ${JSON.stringify(
            opts.concurrency
          )})`
      );
    }
  }

  _getStats(): {openConnections: number; queueLength: number} {
    return {
      queueLength: this._queue.pending,
      openConnections: this._holders.filter((holder) => holder.connectionOpen)
        .length,
    };
  }

  async ensureConnected(): Promise<void> {
    if (this._getStats().openConnections > 0) {
      return;
    }
    const connHolder = this._holders[0];
    if (!connHolder) {
      throw new Error("Client pool is empty");
    }
    await connHolder._getConnection();
  }

  private get _concurrency(): number {
    return this._userConcurrency ?? this._suggestedConcurrency ?? 1;
  }

  private _resizeHolderPool(): void {
    const holdersDiff = this._concurrency - this._holders.length;
    if (holdersDiff > 0) {
      for (let i = 0; i < holdersDiff; i++) {
        const connectionHolder = new ClientConnectionHolder(this);

        this._holders.push(connectionHolder);
        this._queue.push(connectionHolder);
      }
    } else if (holdersDiff < 0) {
      // TODO: remove unconnected holders, followed by idle connection holders
      // until pool reduced to concurrency setting
      // (Also need to way to drop currently in use holders once they're
      // returned to the pool)
    }
  }

  private __normalizedConnectConfig: Promise<NormalizedConnectConfig> | null =
    null;
  private _getNormalizedConnectConfig(): Promise<NormalizedConnectConfig> {
    return (
      this.__normalizedConnectConfig ??
      (this.__normalizedConnectConfig = parseConnectArguments(
        this._connectConfig
      ))
    );
  }

  async getNewConnection(
    singleConnect: boolean = false
  ): Promise<RawConnection> {
    const config = await this._getNormalizedConnectConfig();
    const connection = singleConnect
      ? await RawConnection.connectWithTimeout(
          config.connectionParams.address,
          config,
          this._codecsRegistry
        )
      : await retryingConnect(config, this._codecsRegistry);
    const suggestedConcurrency =
      connection.serverSettings.suggested_pool_concurrency;
    if (
      suggestedConcurrency &&
      suggestedConcurrency !== this._suggestedConcurrency
    ) {
      this._suggestedConcurrency = suggestedConcurrency;
      this._resizeHolderPool();
    }
    return connection;
  }

  private _checkState(): void {
    if (this._closing) {
      throw new errors.InterfaceError("The client is closing");
    }

    if (this._closed) {
      throw new errors.InterfaceError("The client is closed");
    }
  }

  async acquireHolder(options: Options): Promise<ClientConnectionHolder> {
    this._checkState();

    const connectionHolder = await this._queue.get();
    try {
      return await connectionHolder.acquire(options);
    } catch (error) {
      this._queue.push(connectionHolder);

      throw error;
    }
  }

  enqueue(holder: ClientConnectionHolder): void {
    this._queue.push(holder);
  }

  /**
   * Attempt to gracefully close all connections in the client pool.
   *
   * Waits until all client pool connections are released, closes them and
   * shuts down the client. If any error occurs
   * in ``close()``, the client will terminate by calling ``terminate()``.
   */
  async close(): Promise<void> {
    // Ref. asyncio_pool aclose
    if (this._closed) {
      return;
    }

    this._checkState();

    this._closing = true;

    const warningTimeoutId = setTimeout(() => {
      this._warn_on_long_close();
    }, 60e3);

    try {
      await Promise.all(
        this._holders.map((connectionHolder) =>
          connectionHolder._waitUntilReleasedAndClose()
        )
      );
    } catch (error) {
      this.terminate();
      throw error;
    } finally {
      clearTimeout(warningTimeoutId);
      this._closed = true;
      this._closing = false;
    }
  }

  isClosed(): boolean {
    return this._closed;
  }

  /**
   * Terminate all connections in the client pool. If the client is already
   * closed, it returns without doing anything.
   */
  terminate(): void {
    if (this._closed) {
      return;
    }

    this._checkState();

    for (const connectionHolder of this._holders) {
      connectionHolder.terminate();
    }

    this._closed = true;
  }

  private _warn_on_long_close(): void {
    // tslint:disable-next-line: no-console
    console.warn(
      "Client.close() is taking over 60 seconds to complete. " +
        "Check if you have any unreleased connections left."
    );
  }
}

export interface ClientOptions {
  concurrency?: number;
}

export class Client implements Executor {
  private pool: ClientPool;
  private options: Options;

  private constructor(pool: ClientPool, options: Options) {
    this.pool = pool;
    this.options = options;
  }

  /** @internal */
  static create(dsn?: string, options?: ConnectOptions | null): Client {
    return new Client(new ClientPool(dsn, options ?? {}), Options.defaults());
  }

  withTransactionOptions(
    opts: TransactionOptions | SimpleTransactionOptions
  ): Client {
    return new Client(this.pool, this.options.withTransactionOptions(opts));
  }

  withRetryOptions(opts: RetryOptions | SimpleRetryOptions): Client {
    return new Client(this.pool, this.options.withRetryOptions(opts));
  }

  async ensureConnected(): Promise<this> {
    await this.pool.ensureConnected();
    return this;
  }

  isClosed(): boolean {
    return this.pool.isClosed();
  }

  async close(): Promise<void> {
    await this.pool.close();
  }

  terminate(): void {
    this.pool.terminate();
  }

  async transaction<T>(
    action: (transaction: Transaction) => Promise<T>
  ): Promise<T> {
    const holder = await this.pool.acquireHolder(this.options);
    try {
      return await holder.transaction(action);
    } finally {
      await holder.release();
    }
  }

  async execute(query: string): Promise<void> {
    const holder = await this.pool.acquireHolder(this.options);
    try {
      return await holder.execute(query);
    } finally {
      await holder.release();
    }
  }

  async query<T = unknown>(query: string, args?: QueryArgs): Promise<T[]> {
    const holder = await this.pool.acquireHolder(this.options);
    try {
      return await holder.query(query, args);
    } finally {
      await holder.release();
    }
  }

  async queryJSON(query: string, args?: QueryArgs): Promise<string> {
    const holder = await this.pool.acquireHolder(this.options);
    try {
      return await holder.queryJSON(query, args);
    } finally {
      await holder.release();
    }
  }

  async querySingle<T = unknown>(
    query: string,
    args?: QueryArgs
  ): Promise<T | null> {
    const holder = await this.pool.acquireHolder(this.options);
    try {
      return await holder.querySingle(query, args);
    } finally {
      await holder.release();
    }
  }

  async querySingleJSON(query: string, args?: QueryArgs): Promise<string> {
    const holder = await this.pool.acquireHolder(this.options);
    try {
      return await holder.querySingleJSON(query, args);
    } finally {
      await holder.release();
    }
  }

  async queryRequiredSingle<T = unknown>(
    query: string,
    args?: QueryArgs
  ): Promise<T> {
    const holder = await this.pool.acquireHolder(this.options);
    try {
      return await holder.queryRequiredSingle(query, args);
    } finally {
      await holder.release();
    }
  }

  async queryRequiredSingleJSON(
    query: string,
    args?: QueryArgs
  ): Promise<string> {
    const holder = await this.pool.acquireHolder(this.options);
    try {
      return await holder.queryRequiredSingleJSON(query, args);
    } finally {
      await holder.release();
    }
  }
}

export type ConnectOptions = ConnectConfig & ClientOptions;

export function createClient(
  options?: string | ConnectOptions | null
): Client {
  if (typeof options === "string") {
    return Client.create(options);
  } else {
    return Client.create(undefined, options);
  }
}
