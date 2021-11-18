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

import {ClientConnection, HOLDER} from "./client";
import {
  Options,
  RetryOptions,
  SimpleRetryOptions,
  SimpleTransactionOptions,
  TransactionOptions,
} from "./options";

import {CodecsRegistry} from "./codecs/registry";

import {OPTIONS, QueryArgs, Connection, Executor} from "./ifaces";
import {Transaction} from "./transaction";
import {Deferred} from "./primitives/deferred";

export class ClientConnectionHolder {
  private _client: ClientPool;
  private _connection: ClientConnection | null;
  private _inUse: Deferred<void> | null;

  constructor(client: ClientPool) {
    this._client = client;
    this._connection = null;
    this._inUse = null;
  }

  get connection(): Connection | null {
    return this._connection;
  }

  get client(): ClientPool {
    return this._client;
  }

  terminate(): void {
    if (this._connection !== null) {
      this._connection.close();
    }
  }

  async connect(): Promise<void> {
    if (this._connection !== null) {
      throw new errors.ClientError(
        "ClientConnectionHolder.connect() called while another " +
          "connection already exists"
      );
    }

    this._connection = await this._client.getNewConnection();
    this._connection[HOLDER] = this;
  }

  async acquire(options: Options): Promise<ClientConnection> {
    if (this._connection === null || this._connection.isClosed()) {
      this._connection = null;
      await this.connect();
    }
    this._connection![OPTIONS] = options;

    this._inUse = new Deferred<void>();
    return this._connection!;
  }

  async release(): Promise<void> {
    if (this._inUse === null) {
      throw new errors.ClientError(
        "ClientConnectionHolder.release() called on " +
          "a free connection holder"
      );
    }

    // Free this connection holder and invalidate the
    // connection proxy.
    await this._release();
  }

  /** @internal */
  async _waitUntilReleased(): Promise<void> {
    if (this._inUse === null) {
      return;
    }
    await this._inUse.promise;
  }

  async close(): Promise<void> {
    if (this._connection !== null) {
      // AsyncIOConnection.aclose() will call releaseOnClose() to
      // finish holder cleanup.
      await this._connection.close();
    }
  }

  /** @internal */
  async _releaseOnClose(): Promise<void> {
    await this._release();
    this._connection = null;
  }

  private async _release(): Promise<void> {
    // Release this connection holder.
    if (this._inUse === null) {
      // The holder is not checked out.
      return;
    }

    await this._connection?.connection?.resetState();

    if (!this._inUse.done) {
      await this._inUse.setResult();
    }

    this._inUse = null;

    // Put ourselves back to the pool queue.
    this._client.enqueue(this);
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
      openConnections: this._holders.filter(
        (holder) =>
          holder.connection !== null && holder.connection.isClosed() === false
      ).length,
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
    await connHolder.connect();
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
  private get _normalizedConnectConfig(): Promise<NormalizedConnectConfig> {
    return (
      this.__normalizedConnectConfig ??
      (this.__normalizedConnectConfig = parseConnectArguments(
        this._connectConfig
      ))
    );
  }

  async getNewConnection(): Promise<ClientConnection> {
    const connection = await ClientConnection.connect(
      await this._normalizedConnectConfig,
      this._codecsRegistry
    );
    const suggestedConcurrency =
      connection.connection?.serverSettings.suggested_pool_concurrency;
    if (suggestedConcurrency) {
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

  async acquire(options: Options): Promise<ClientConnection> {
    this._checkState();

    const connectionHolder = await this._queue.get();
    try {
      return await connectionHolder.acquire(options);
    } catch (error) {
      this._queue.push(connectionHolder);

      throw error;
    }
  }

  async release(connection: Connection): Promise<void> {
    if (!(connection instanceof ClientConnection)) {
      throw new Error(
        "a connection obtained via client.acquire() was expected"
      );
    }

    const holder = connection[HOLDER];
    if (holder == null) {
      // Already released, do nothing
      return;
    }
    if (holder.client !== this) {
      throw new errors.InterfaceError(
        "The connection proxy does not belong to this client."
      );
    }

    this._checkState();

    // Let the connection do its internal housekeeping when it's released.
    return await holder.release();
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
          connectionHolder._waitUntilReleased()
        )
      );

      await Promise.all(
        this._holders.map((connectionHolder) => connectionHolder.close())
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
    const conn = await this.pool.acquire(this.options);
    try {
      return await conn.transaction(action);
    } finally {
      await this.pool.release(conn);
    }
  }

  async execute(query: string): Promise<void> {
    const conn = await this.pool.acquire(this.options);
    try {
      return await conn.execute(query);
    } finally {
      await this.pool.release(conn);
    }
  }

  async query<T = unknown>(query: string, args?: QueryArgs): Promise<T[]> {
    const conn = await this.pool.acquire(this.options);
    try {
      return await conn.query(query, args);
    } finally {
      await this.pool.release(conn);
    }
  }

  async queryJSON(query: string, args?: QueryArgs): Promise<string> {
    const conn = await this.pool.acquire(this.options);
    try {
      return await conn.queryJSON(query, args);
    } finally {
      await this.pool.release(conn);
    }
  }

  async querySingle<T = unknown>(
    query: string,
    args?: QueryArgs
  ): Promise<T | null> {
    const conn = await this.pool.acquire(this.options);
    try {
      return await conn.querySingle(query, args);
    } finally {
      await this.pool.release(conn);
    }
  }

  async querySingleJSON(query: string, args?: QueryArgs): Promise<string> {
    const conn = await this.pool.acquire(this.options);
    try {
      return await conn.querySingleJSON(query, args);
    } finally {
      await this.pool.release(conn);
    }
  }

  async queryRequiredSingle<T = unknown>(
    query: string,
    args?: QueryArgs
  ): Promise<T> {
    const conn = await this.pool.acquire(this.options);
    try {
      return await conn.queryRequiredSingle(query, args);
    } finally {
      await this.pool.release(conn);
    }
  }

  async queryRequiredSingleJSON(
    query: string,
    args?: QueryArgs
  ): Promise<string> {
    const conn = await this.pool.acquire(this.options);
    try {
      return await conn.queryRequiredSingleJSON(query, args);
    } finally {
      await this.pool.release(conn);
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
