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

import type {Duration} from "./datatypes/datetime";
import {CodecsRegistry} from "./codecs/registry";
import {
  ConnectArgumentsParser,
  ConnectConfig,
  NormalizedConnectConfig
} from "./conUtils";
import * as errors from "./errors";
import {Cardinality, Executor, OutputFormat, QueryArgs} from "./ifaces";
import {
  Options,
  RetryOptions,
  Session,
  SimpleRetryOptions,
  SimpleTransactionOptions,
  TransactionOptions
} from "./options";
import Event from "./primitives/event";
import {LifoQueue} from "./primitives/queues";
import {BaseRawConnection} from "./baseConn";
import {ConnectWithTimeout, retryingConnect} from "./retry";
import {Transaction} from "./transaction";
import {sleep} from "./utils";

export class ClientConnectionHolder {
  private _pool: BaseClientPool;
  private _connection: BaseRawConnection | null;
  private _options: Options | null;
  private _inUse: Event | null;

  constructor(pool: BaseClientPool) {
    this._pool = pool;
    this._connection = null;
    this._options = null;
    this._inUse = null;
  }

  get options(): Options {
    return this._options ?? Options.defaults();
  }

  async _getConnection(): Promise<BaseRawConnection> {
    if (!this._connection || this._connection.isClosed()) {
      this._connection = await this._pool.getNewConnection();
    }
    return this._connection;
  }

  get connectionOpen(): boolean {
    return this._connection !== null && !this._connection.isClosed();
  }

  async acquire(options: Options): Promise<ClientConnectionHolder> {
    if (this._inUse) {
      throw new errors.InternalClientError(
        "ClientConnectionHolder cannot be acquired, already in use"
      );
    }

    this._options = options;
    this._inUse = new Event();

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

    await this._connection?.resetState();

    if (!this._inUse.done) {
      this._inUse.set();
    }

    this._inUse = null;

    // Put ourselves back to the pool queue.
    this._pool.enqueue(this);
  }

  /** @internal */
  async _waitUntilReleasedAndClose(): Promise<void> {
    if (this._inUse) {
      await this._inUse.wait();
    }
    await this._connection?.close();
  }

  terminate(): void {
    this._connection?.close();
  }

  async transaction<T>(
    action: (transaction: Transaction) => Promise<T>
  ): Promise<T> {
    let result: T | void;
    for (let iteration = 0; true; ++iteration) {
      const transaction = await Transaction._startTransaction(this);

      let commitFailed = false;
      try {
        result = await Promise.race([
          action(transaction),
          transaction._waitForConnAbort()
        ]);
        try {
          await transaction._commit();
        } catch (err) {
          commitFailed = true;
          throw err;
        }
      } catch (err) {
        try {
          if (!commitFailed) {
            await transaction._rollback();
          }
        } catch (rollback_err) {
          if (!(rollback_err instanceof errors.EdgeDBError)) {
            // We ignore EdgeDBError errors on rollback, retrying
            // if possible. All other errors are propagated.
            throw rollback_err;
          }
        }
        if (
          err instanceof errors.EdgeDBError &&
          err.hasTag(errors.SHOULD_RETRY) &&
          !(commitFailed && err instanceof errors.ClientConnectionError)
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
      return result as T;
    }
  }

  private async retryingFetch(
    query: string,
    args: QueryArgs | undefined,
    outputFormat: OutputFormat,
    expectedCardinality: Cardinality
  ): Promise<any> {
    let result: any;
    for (let iteration = 0; true; ++iteration) {
      const conn = await this._getConnection();
      try {
        result = await conn.fetch(
          query,
          args,
          outputFormat,
          expectedCardinality,
          this.options.session
        );
      } catch (err) {
        if (
          err instanceof errors.EdgeDBError &&
          err.hasTag(errors.SHOULD_RETRY) &&
          // query is readonly or it's a transaction serialization error
          (conn.getQueryCapabilities(
            query,
            outputFormat,
            expectedCardinality
          ) === 0 ||
            err instanceof errors.TransactionConflictError)
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
      return result;
    }
  }

  async execute(query: string, args?: QueryArgs): Promise<void> {
    return this.retryingFetch(
      query,
      args,
      OutputFormat.NONE,
      Cardinality.NO_RESULT
    );
  }

  async query(query: string, args?: QueryArgs): Promise<any> {
    return this.retryingFetch(
      query,
      args,
      OutputFormat.BINARY,
      Cardinality.MANY
    );
  }

  async queryJSON(query: string, args?: QueryArgs): Promise<string> {
    return this.retryingFetch(
      query,
      args,
      OutputFormat.JSON,
      Cardinality.MANY
    );
  }

  async querySingle(query: string, args?: QueryArgs): Promise<any> {
    return this.retryingFetch(
      query,
      args,
      OutputFormat.BINARY,
      Cardinality.AT_MOST_ONE
    );
  }

  async querySingleJSON(query: string, args?: QueryArgs): Promise<string> {
    return this.retryingFetch(
      query,
      args,
      OutputFormat.JSON,
      Cardinality.AT_MOST_ONE
    );
  }

  async queryRequiredSingle(query: string, args?: QueryArgs): Promise<any> {
    return this.retryingFetch(
      query,
      args,
      OutputFormat.BINARY,
      Cardinality.ONE
    );
  }

  async queryRequiredSingleJSON(
    query: string,
    args?: QueryArgs
  ): Promise<string> {
    return this.retryingFetch(query, args, OutputFormat.JSON, Cardinality.ONE);
  }
}

export abstract class BaseClientPool {
  protected abstract _connectWithTimeout: ConnectWithTimeout;
  abstract isStateless: boolean;

  private _closing: Event | null;
  private _queue: LifoQueue<ClientConnectionHolder>;
  private _holders: ClientConnectionHolder[];
  private _userConcurrency: number | null;
  private _suggestedConcurrency: number | null;
  private _connectConfig: ConnectConfig;
  private _codecsRegistry: CodecsRegistry;

  constructor(
    private _parseConnectArguments: ConnectArgumentsParser,
    options: ConnectOptions
  ) {
    this.validateClientOptions(options);

    this._codecsRegistry = new CodecsRegistry();

    this._queue = new LifoQueue<ClientConnectionHolder>();
    this._holders = [];
    this._userConcurrency = options.concurrency ?? null;
    this._suggestedConcurrency = null;
    this._closing = null;
    this._connectConfig = {...options};

    this._resizeHolderPool();
  }

  private validateClientOptions(opts: ClientOptions): void {
    if (
      opts.concurrency != null &&
      (typeof opts.concurrency !== "number" ||
        !Number.isInteger(opts.concurrency) ||
        opts.concurrency < 0)
    ) {
      throw new errors.InterfaceError(
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
      openConnections: this._holders.filter(holder => holder.connectionOpen)
        .length
    };
  }

  async ensureConnected(): Promise<void> {
    if (this._closing) {
      throw new errors.InterfaceError(
        this._closing.done ? "The client is closed" : "The client is closing"
      );
    }

    if (this._getStats().openConnections > 0) {
      return;
    }
    const connHolder = await this._queue.get();
    try {
      await connHolder._getConnection();
    } finally {
      this._queue.push(connHolder);
    }
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
      (this.__normalizedConnectConfig = this._parseConnectArguments(
        this._connectConfig
      ))
    );
  }

  async getNewConnection(): Promise<BaseRawConnection> {
    if (this._closing?.done) {
      throw new errors.InterfaceError("The client is closed");
    }

    const config = await this._getNormalizedConnectConfig();
    const connection = await retryingConnect(
      this._connectWithTimeout,
      config,
      this._codecsRegistry
    );

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

  async acquireHolder(options: Options): Promise<ClientConnectionHolder> {
    if (this._closing) {
      throw new errors.InterfaceError(
        this._closing.done ? "The client is closed" : "The client is closing"
      );
    }

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
    if (this._closing) {
      return await this._closing.wait();
    }

    this._closing = new Event();

    this._queue.cancelAllPending(
      new errors.InterfaceError(`The client is closing`)
    );

    const warningTimeoutId = setTimeout(() => {
      // tslint:disable-next-line: no-console
      console.warn(
        "Client.close() is taking over 60 seconds to complete. " +
          "Check if you have any unreleased connections left."
      );
    }, 60e3);

    try {
      await Promise.all(
        this._holders.map(connectionHolder =>
          connectionHolder._waitUntilReleasedAndClose()
        )
      );
    } catch (err) {
      this._terminate();
      this._closing.setError(err);
      throw err;
    } finally {
      clearTimeout(warningTimeoutId);
    }

    this._closing.set();
  }

  private _terminate(): void {
    for (const connectionHolder of this._holders) {
      connectionHolder.terminate();
    }
  }

  /**
   * Terminate all connections in the client pool. If the client is already
   * closed, it returns without doing anything.
   */
  terminate(): void {
    if (this._closing?.done) {
      return;
    }

    this._queue.cancelAllPending(
      new errors.InterfaceError(`The client is closed`)
    );

    this._terminate();

    if (!this._closing) {
      this._closing = new Event();
      this._closing.set();
    }
  }

  isClosed(): boolean {
    return !!this._closing;
  }
}

export interface ClientOptions {
  concurrency?: number;
}

export type ConnectOptions = ConnectConfig & ClientOptions;

type SimpleConfig = Partial<{
  session_idle_transaction_timeout: Duration;
  query_execution_timeout: Duration;
  allow_bare_ddl: "AlwaysAllow" | "NeverAllow";
  allow_dml_in_functions: boolean;
  allow_user_specified_id: boolean;
  apply_access_policies: boolean;
  [k: string]: unknown;
}>;

export class Client implements Executor {
  private pool: BaseClientPool;
  private options: Options;

  /** @internal */
  constructor(pool: BaseClientPool, options: Options) {
    this.pool = pool;
    this.options = options;
  }

  withTransactionOptions(
    opts: TransactionOptions | SimpleTransactionOptions
  ): Client {
    return new Client(this.pool, this.options.withTransactionOptions(opts));
  }

  withRetryOptions(opts: RetryOptions | SimpleRetryOptions): Client {
    return new Client(this.pool, this.options.withRetryOptions(opts));
  }

  withSession(session: Session): Client {
    return new Client(this.pool, this.options.withSession(session));
  }

  withModuleAliases(aliases: {[name: string]: string}) {
    return new Client(
      this.pool,
      this.options.withSession(this.options.session.withModuleAliases(aliases))
    );
  }

  withConfig(config: SimpleConfig): Client {
    const newConfig = this.options.session.withConfig(config);
    return new Client(this.pool, this.options.withSession(newConfig));
  }

  withGlobals(globals: {[name: string]: any}): Client {
    return new Client(
      this.pool,
      this.options.withSession(this.options.session.withGlobals(globals))
    );
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
    if (this.pool.isStateless) {
      throw new errors.EdgeDBError(
        `cannot use 'transaction()' API on HTTP client`
      );
    }
    const holder = await this.pool.acquireHolder(this.options);
    try {
      return await holder.transaction(action);
    } finally {
      await holder.release();
    }
  }

  async execute(query: string, args?: QueryArgs): Promise<void> {
    const holder = await this.pool.acquireHolder(this.options);
    try {
      return await holder.execute(query, args);
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
