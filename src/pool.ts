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
import {LifoQueue} from "./queues";

import {ConnectionImpl, InnerConnection} from "./client";
import {StandaloneConnection} from "./client";
import {Options, RetryOptions, TransactionOptions} from "./options";

import {CodecsRegistry} from "./codecs/registry";

import {
  ALLOW_MODIFICATIONS,
  INNER,
  OPTIONS,
  QueryArgs,
  Connection,
  Client,
  IClientStats,
} from "./ifaces";
import {Transaction} from "./transaction";

const DETACH = Symbol("detach");
const DETACHED = Symbol("detached");
export const HOLDER = Symbol("holder");

export class Deferred<T> {
  private _promise: Promise<T | undefined>;
  private _resolve?: (value?: T | PromiseLike<T> | undefined) => void;
  private _reject?: (reason?: any) => void;
  private _result: T | PromiseLike<T> | undefined;
  private _done: boolean;

  get promise(): Promise<T | undefined> {
    return this._promise;
  }

  get done(): boolean {
    return this._done;
  }

  get result(): T | PromiseLike<T> | undefined {
    if (!this._done) {
      throw new Error("The deferred is not resolved.");
    }
    return this._result;
  }

  async setResult(value?: T | PromiseLike<T> | undefined): Promise<void> {
    while (!this._resolve) {
      await new Promise<void>((resolve) => process.nextTick(resolve));
    }
    this._resolve(value);
  }

  async setFailed(reason?: any): Promise<void> {
    while (!this._reject) {
      await new Promise<void>((resolve) => process.nextTick(resolve));
    }
    this._reject(reason);
  }

  constructor() {
    this._done = false;
    this._reject = undefined;
    this._resolve = undefined;

    this._promise = new Promise((resolve, reject) => {
      this._reject = reject;

      this._resolve = (value?: T | PromiseLike<T> | undefined) => {
        this._done = true;
        this._result = value;
        resolve(value);
      };
    });
  }
}

class ClientConnectionHolder {
  private _client: ClientImpl;
  private _connection: ClientConnection | null;
  private _generation: number | null;
  private _inUse: Deferred<void> | null;

  constructor(client: ClientImpl) {
    this._client = client;
    this._connection = null;
    this._inUse = null;
    this._generation = null;
  }

  get connection(): Connection | null {
    return this._connection;
  }

  get client(): ClientImpl {
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
    this._connection[INNER][HOLDER] = this;
    this._generation = this._client.generation;
  }

  async acquire(options: Options): Promise<ClientConnection> {
    if (this._connection === null || this._connection.isClosed()) {
      this._connection = null;
      await this.connect();
    } else if (this._generation !== this._client.generation) {
      // Connections have been expired, re-connect the holder.

      // Perform closing in a concurrent task, hence no await:
      this._connection.close();

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

    if (this._connection?.isClosed()) {
      // When closing, pool connections perform the necessary
      // cleanup, so we don't have to do anything else here.
      return;
    }

    if (this._generation !== this._client.generation) {
      // The connection has expired because it belongs to
      // an older generation (Client.expire_connections() has
      // been called).
      await this._connection?.close();
      return;
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

    if (!this._inUse.done) {
      await this._inUse.setResult();
    }

    this._inUse = null;

    this._connection = this._connection![DETACH]();

    // Put ourselves back to the pool queue.
    this._client.enqueue(this);
  }
}

export class ClientInnerConnection extends InnerConnection {
  private [DETACHED]: boolean;
  private [HOLDER]: ClientConnectionHolder | null;
  constructor(config: NormalizedConnectConfig, registry: CodecsRegistry) {
    super(config, registry);
    this[DETACHED] = false;
  }
  async reconnect(singleAttempt: boolean = false): Promise<ConnectionImpl> {
    if (this[DETACHED]) {
      throw new errors.InterfaceError(
        "Connection has been released to a pool"
      );
    }
    return await super.reconnect(singleAttempt);
  }
  detach(): ClientInnerConnection {
    const impl = this.connection;
    this.connection = undefined;
    const result = new ClientInnerConnection(this.config, this.registry);
    result.connection = impl;
    return result;
  }
}

export class ClientConnection extends StandaloneConnection {
  declare [INNER]: ClientInnerConnection;

  protected initInner(
    config: NormalizedConnectConfig,
    registry: CodecsRegistry
  ): void {
    this[INNER] = new ClientInnerConnection(config, registry);
  }

  protected cleanup(): void {
    const holder = this[INNER][HOLDER];
    if (holder) {
      holder._releaseOnClose();
    }
  }

  [DETACH](): ClientConnection | null {
    const result = this.shallowClone();
    const inner = this[INNER];
    const holder = inner[HOLDER];
    const detached = inner[DETACHED];
    inner[HOLDER] = null;
    inner[DETACHED] = true;
    result[INNER] = inner.detach();
    result[INNER][HOLDER] = holder;
    result[INNER][DETACHED] = detached;
    return result;
  }
}

export interface ClientOptions {
  concurrency?: number;
}

export class ClientStats implements IClientStats {
  private _queueLength: number;
  private _openConnections: number;

  constructor(queueLength: number, openConnections: number) {
    this._queueLength = queueLength;
    this._openConnections = openConnections;
  }

  /**
   * Get the length of the queue used to obtain a DB connection.
   * The queue length indicates the count of pending operations, awaiting for
   * an available connection. If your application is receiving more
   * requests than the server can handle, this can be the bottleneck.
   */
  get queueLength(): number {
    return this._queueLength;
  }

  /**
   * Get the length of currently open connections of the client pool.
   */
  get openConnections(): number {
    return this._openConnections;
  }
}

/**
 * A connection pool.
 *
 * Connection pool can be used to manage a set of connections to the database.
 * Connections are first acquired from the pool, then used, and then released
 * back to the pool. Once a connection is released, it's reset to close all
 * open cursors and other resources *except* prepared statements.
 * Pools are created by calling :func:`~edgedb.pool.create`.
 */
export class ClientShell implements Client {
  [ALLOW_MODIFICATIONS]: never;
  private impl: ClientImpl;
  private options: Options;

  protected constructor(dsn?: string, connectOptions: ConnectOptions = {}) {
    this.impl = new ClientImpl(dsn, connectOptions);
    this.options = Options.defaults();
  }

  protected shallowClone(): this {
    const result = Object.create(this.constructor.prototype);
    result.impl = this.impl;
    result.options = this.options;
    return result;
  }

  withTransactionOptions(opt: TransactionOptions): this {
    const result = this.shallowClone();
    result.options = this.options.withTransactionOptions(opt);
    return result;
  }

  withRetryOptions(opt: RetryOptions): this {
    const result = this.shallowClone();
    result.options = this.options.withRetryOptions(opt);
    return result;
  }

  /**
   * Get information about the current state of the client.
   */
  getStats(): ClientStats {
    return this.impl.getStats();
  }

  /** @internal */
  static create(dsn?: string, options?: ConnectOptions | null): ClientShell {
    const client = new ClientShell(dsn, options ?? {});
    client.impl.initialize();
    return client;
  }

  async rawTransaction<T>(
    action: (transaction: Transaction) => Promise<T>
  ): Promise<T> {
    const conn = await this.impl.acquire(this.options);
    try {
      return await conn.rawTransaction(action);
    } finally {
      await this.impl.release(conn);
    }
  }

  async retryingTransaction<T>(
    action: (transaction: Transaction) => Promise<T>
  ): Promise<T> {
    const conn = await this.impl.acquire(this.options);
    try {
      return await conn.retryingTransaction(action);
    } finally {
      await this.impl.release(conn);
    }
  }

  async execute(query: string): Promise<void> {
    const conn = await this.impl.acquire(this.options);
    try {
      return await conn.execute(query);
    } finally {
      await this.impl.release(conn);
    }
  }

  async query<T = unknown>(query: string, args?: QueryArgs): Promise<T[]> {
    const conn = await this.impl.acquire(this.options);
    try {
      return await conn.query(query, args);
    } finally {
      await this.impl.release(conn);
    }
  }

  async queryJSON(query: string, args?: QueryArgs): Promise<string> {
    const conn = await this.impl.acquire(this.options);
    try {
      return await conn.queryJSON(query, args);
    } finally {
      await this.impl.release(conn);
    }
  }

  async querySingle<T = unknown>(query: string, args?: QueryArgs): Promise<T> {
    const conn = await this.impl.acquire(this.options);
    try {
      return await conn.querySingle(query, args);
    } finally {
      await this.impl.release(conn);
    }
  }

  async querySingleJSON(query: string, args?: QueryArgs): Promise<string> {
    const conn = await this.impl.acquire(this.options);
    try {
      return await conn.querySingleJSON(query, args);
    } finally {
      await this.impl.release(conn);
    }
  }

  /**
   * Attempt to gracefully close all connections in the client pool.
   *
   * Waits until all client pool connections are released, closes them and
   * shuts down the client. If any error occurs
   * in ``close()``, the client will terminate by calling ``terminate()``.
   */
  async close(): Promise<void> {
    await this.impl.close();
  }

  isClosed(): boolean {
    return this.impl.isClosed();
  }
  /**
   * Terminate all connections in the client pool. If the client is already
   * closed, it returns without doing anything.
   */
  terminate(): void {
    this.impl.terminate();
  }
}

class ClientImpl {
  private _closed: boolean;
  private _closing: boolean;
  private _queue: LifoQueue<ClientConnectionHolder>;
  private _holders: ClientConnectionHolder[];
  private _initialized: boolean;
  private _userConcurrency: number | null;
  private _suggestedConcurrency: number | null;
  private _generation: number;
  private _connectOptions: NormalizedConnectConfig;
  private _codecsRegistry: CodecsRegistry;

  constructor(dsn?: string, options: ConnectOptions = {}) {
    this.validateClientOptions(options);

    this._codecsRegistry = new CodecsRegistry();

    this._queue = new LifoQueue<ClientConnectionHolder>();
    this._holders = [];
    this._initialized = false;
    this._userConcurrency = options.concurrency ?? null;
    this._suggestedConcurrency = null;
    this._closing = false;
    this._closed = false;
    this._generation = 0;
    this._connectOptions = parseConnectArguments({...options, dsn});
  }

  /**
   * Get information about the current state of the client.
   */
  getStats(): ClientStats {
    return new ClientStats(
      this._queue.pending,
      this._holders.filter(
        (holder) =>
          holder.connection !== null && holder.connection.isClosed() === false
      ).length
    );
  }

  /** @internal */
  get generation(): number {
    return this._generation;
  }

  /** @internal */
  enqueue(holder: ClientConnectionHolder): void {
    this._queue.push(holder);
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

  private get _concurrency() {
    return this._userConcurrency ?? this._suggestedConcurrency ?? 1;
  }

  initialize(): void {
    // Ref: asyncio_pool.py _async__init__
    if (this._initialized) {
      return;
    }
    if (this._closed) {
      throw new errors.InterfaceError("The client is closed");
    }

    this._resizeHolderPool();
    this._initialized = true;
  }

  private _resizeHolderPool() {
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

  /** @internal */
  async getNewConnection(): Promise<ClientConnection> {
    const connection = await ClientConnection.connect(
      this._connectOptions,
      this._codecsRegistry
    );
    const suggestedConcurrency = connection[
      INNER
    ].connection?.serverSettings.get("suggested_pool_concurrency");
    if (suggestedConcurrency) {
      this._suggestedConcurrency = parseInt(suggestedConcurrency);
      this._resizeHolderPool();
    }
    return connection;
  }

  private _checkInit(): void {
    if (!this._initialized) {
      throw new errors.InterfaceError(
        "The client is not initialized. Call the ``initialize`` method " +
          "before using it."
      );
    }

    if (this._closed) {
      throw new errors.InterfaceError("The client is closed");
    }
  }

  async acquire(options: Options): Promise<ClientConnection> {
    if (this._closing) {
      throw new errors.InterfaceError("The client is closing");
    }

    if (this._closed) {
      throw new errors.InterfaceError("The client is closed");
    }

    this._checkInit();
    return await this._acquireConnection(options);
  }

  private async _acquireConnection(
    options: Options
  ): Promise<ClientConnection> {
    // Ref: asyncio_pool _acquire

    // gets the last item from the queue,
    // when we are done with the connection,
    // the connection holder is put back into the queue with push()
    const connectionHolder = await this._queue.get();
    try {
      return await connectionHolder.acquire(options);
    } catch (error) {
      // put back the holder on the queue
      this._queue.push(connectionHolder);

      throw error;
    }
  }

  /**
   * Release a database connection back to the client pool.
   */
  async release(connection: Connection): Promise<void> {
    if (!(connection instanceof ClientConnection)) {
      throw new Error(
        "a connection obtained via client.acquire() was expected"
      );
    }

    const holder = connection[INNER][HOLDER];
    if (holder == null) {
      // Already released, do nothing
      return;
    }
    if (holder.client !== this) {
      throw new errors.InterfaceError(
        "The connection proxy does not belong to this client."
      );
    }

    this._checkInit();

    // Let the connection do its internal housekeeping when it's released.
    return await holder.release();
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

    this._checkInit();

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

    this._checkInit();

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

export type ConnectOptions = ConnectConfig & ClientOptions;

export function createClient(
  dsnOrInstanceName?: string | ConnectOptions | null,
  options?: ConnectOptions | null
): Client {
  if (typeof dsnOrInstanceName === "string") {
    return ClientShell.create(dsnOrInstanceName, options);
  } else {
    if (dsnOrInstanceName != null) {
      // tslint:disable-next-line: no-console
      console.warn(
        "`options` as the first argument to `edgedb.createClient` is " +
          "deprecated, use " +
          "`edgedb.createClient(dsnOrInstanceName, options)`"
      );
    }
    const opts = {...dsnOrInstanceName, ...options};
    return ClientShell.create(undefined, opts);
  }
}
