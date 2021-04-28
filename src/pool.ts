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
import {Set} from "./datatypes/set";

import {ConnectionImpl, InnerConnection} from "./client";
import {StandaloneConnection} from "./client";
import {Options, RetryOptions, TransactionOptions} from "./options";
import {PartialRetryRule} from "./options";

import {
  ALLOW_MODIFICATIONS,
  INNER,
  OPTIONS,
  QueryArgs,
  Connection,
  IConnectionProxied,
  Pool,
  IPoolStats,
  onConnectionClose,
} from "./ifaces";
import {Transaction} from "./transaction";

const DETACH = Symbol("detach");
const DETACHED = Symbol("detached");
export const HOLDER = Symbol("holder");

export class Deferred<T> {
  private _promise: Promise<T>;
  private _resolve?: (value?: T | PromiseLike<T> | undefined) => void;
  private _reject?: (reason?: any) => void;
  private _result: T | PromiseLike<T> | undefined;
  private _done: boolean;

  get promise(): Promise<T> {
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
      await new Promise((resolve) => process.nextTick(resolve));
    }
    this._resolve(value);
  }

  async setFailed(reason?: any): Promise<void> {
    while (!this._reject) {
      await new Promise((resolve) => process.nextTick(resolve));
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

class PoolConnectionHolder {
  private _pool: PoolImpl;
  private _onAcquire?: (proxy: Connection) => Promise<void>;
  private _onRelease?: (proxy: Connection) => Promise<void>;
  private _connection: PoolConnection | null;
  private _generation: number | null;
  private _inUse: Deferred<void> | null;

  constructor(
    pool: PoolImpl,
    onAcquire?: (proxy: Connection) => Promise<void>,
    onRelease?: (proxy: Connection) => Promise<void>
  ) {
    this._pool = pool;
    this._onAcquire = onAcquire;
    this._onRelease = onRelease;
    this._connection = null;
    this._inUse = null;
    this._generation = null;
  }

  get connection(): Connection | null {
    return this._connection;
  }

  get pool(): PoolImpl {
    return this._pool;
  }

  private getConnectionOrThrow(): Connection {
    if (this._connection === null) {
      throw new TypeError("The connection is not open");
    }
    return this._connection;
  }

  terminate(): void {
    if (this._connection !== null) {
      this._connection.close();
    }
  }

  async connect(): Promise<void> {
    if (this._connection !== null) {
      throw new errors.ClientError(
        "PoolConnectionHolder.connect() called while another " +
          "connection already exists"
      );
    }

    this._connection = await this._pool.getNewConnection();
    this._connection[INNER][HOLDER] = this;
    this._generation = this._pool.generation;
  }

  async acquire(options: Options): Promise<PoolConnection> {
    if (this._connection === null || this._connection.isClosed()) {
      this._connection = null;
      await this.connect();
    } else if (this._generation !== this._pool.generation) {
      // Connections have been expired, re-connect the holder.

      // Do closure in aconcurrent task, hence no await
      this._connection.close();

      this._connection = null;
      await this.connect();
    }
    this._connection![OPTIONS] = options;

    if (this._onAcquire) {
      try {
        await this._onAcquire(this._connection!);
      } catch (error) {
        // If a user-defined `onAcquire` function fails, we don't
        // know if the connection is safe for re-use, hence
        // we close it.  A new connection will be created
        // when `acquire` is called again.

        // Use `close()` to close the connection gracefully.
        // An exception in `onAcquire` isn't necessarily caused
        // by an IO or a protocol error.  close() will
        // do the necessary cleanup via _cleanup().

        await this._connection?.close();
        throw error;
      }
    }

    this._inUse = new Deferred<void>();
    return this._connection!;
  }

  async release(): Promise<void> {
    if (this._inUse === null) {
      throw new errors.ClientError(
        "PoolConnectionHolder.release() called on " +
          "a free connection holder"
      );
    }

    if (this._connection?.isClosed()) {
      // When closing, pool connections perform the necessary
      // cleanup, so we don't have to do anything else here.
      return;
    }

    if (this._generation !== this._pool.generation) {
      // The connection has expired because it belongs to
      // an older generation (Pool.expire_connections() has
      // been called).
      await this._connection?.close();
      return;
    }

    if (this._onRelease && this._connection) {
      try {
        await this._onRelease(this._connection);
      } catch (error) {
        try {
          // If a user-defined `onRelease` function fails, we don't
          // know if the connection is safe for re-use, hence
          // we close it.  A new connection will be created
          // when `acquire` is called again.
          await this._connection?.close();
          // Use `close()` to close the connection gracefully.
          // An exception in `setup` isn't necessarily caused
          // by an IO or a protocol error.  close() will
          // do the necessary cleanup via releaseOnClose().
        } catch (e) {
          // silence this error so original one is visible
        }
        throw error;
      }
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
  _releaseOnClose(): void {
    this._release();
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
    this._pool.enqueue(this);
  }
}

export class PoolInnerConnection extends InnerConnection {
  private [DETACHED]: boolean;
  private [HOLDER]: PoolConnectionHolder;
  constructor(config: NormalizedConnectConfig) {
    super(config);
    this[DETACHED] = false;
  }
  detach(): PoolInnerConnection {
    const impl = this.connection;
    this.connection = undefined;
    const cls = this.constructor;
    const result = new PoolInnerConnection(this.config);
    result.connection = impl;
    return result;
  }
}

export class PoolConnection extends StandaloneConnection {
  [INNER]: PoolInnerConnection;

  protected initInner(config: NormalizedConnectConfig): void {
    this[INNER] = new PoolInnerConnection(config);
  }

  protected cleanup(): void {
    if (this[INNER][HOLDER]) {
      this[INNER][HOLDER]._releaseOnClose();
    }
  }

  [DETACH](): PoolConnection | null {
    const result = this.shallowClone();
    const inner = this[INNER];
    const holder = inner[HOLDER];
    const detached = inner[DETACHED];
    inner[HOLDER] = holder;
    inner[DETACHED] = detached;
    result[INNER] = inner.detach();
    result[INNER][HOLDER] = holder;
    result[INNER][DETACHED] = detached;
    return result;
  }
}

const DefaultMinPoolSize = 0;
const DefaultMaxPoolSize = 100;

export interface PoolOptions {
  connectOptions?: ConnectConfig | null;
  minSize?: number;
  maxSize?: number;
  onAcquire?: (proxy: Connection) => Promise<void>;
  onRelease?: (proxy: Connection) => Promise<void>;
  onConnect?: (connection: Connection) => Promise<void>;
  connectionFactory?: (
    options: NormalizedConnectConfig
  ) => Promise<PoolConnection>;
}

export class PoolStats implements IPoolStats {
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
   * Get the length of currently open connections of the connection pool.
   */
  get openConnections(): number {
    return this._openConnections;
  }
}

export function connect(
  config: NormalizedConnectConfig
): Promise<PoolConnection> {
  return PoolConnection.connect(config);
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
class PoolShell implements Pool {
  [ALLOW_MODIFICATIONS]: never;
  impl: PoolImpl;
  options: Options;
  protected constructor(dsn?: string, options: PoolOptions = {}) {
    this.impl = new PoolImpl(dsn, options);
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
   * Get information about the current state of the pool.
   */
  getStats(): PoolStats {
    return this.impl.getStats();
  }

  /** @internal */
  static async create(
    dsn?: string,
    options?: PoolOptions | null
  ): Promise<PoolShell> {
    const pool = new PoolShell(dsn, options || {});
    await pool.impl.initialize();
    return pool;
  }

  /**
   * Expires all currently open connections.
   *
   * All currently open connections will get replaced on the
   * next Pool.acquire() call.
   */
  expireConnections(): void {
    this.impl.expireConnections();
  }

  async acquire(): Promise<PoolConnection> {
    return await this.impl.acquire(this.options);
  }
  /**
   * Release a database connection back to the pool.
   */
  async release(connection: Connection): Promise<void> {
    await this.impl.release(connection);
  }

  /**
   * Acquire a connection and executes a given function, returning its return
   * value. The connection is released once done.
   */
  async run<T>(action: (connection: Connection) => Promise<T>): Promise<T> {
    const conn = await this.acquire();

    try {
      return await action(conn);
    } finally {
      await this.release(conn);
    }
  }

  async transaction<T>(
    action: () => Promise<T>,
    options?: TransactionOptions
  ): Promise<T> {
    throw new errors.InterfaceError(
      "Operation not supported. Use a `rawTransaction()` or " +
        "`retryingTransaction()`"
    );
  }

  async rawTransaction<T>(
    action: (transaction: Transaction) => Promise<T>
  ): Promise<T> {
    return await this.run(async (connection) => {
      return await connection.rawTransaction(action);
    });
  }

  async retryingTransaction<T>(
    action: (transaction: Transaction) => Promise<T>
  ): Promise<T> {
    return await this.run(async (connection) => {
      return await connection.retryingTransaction(action);
    });
  }

  async execute(query: string): Promise<void> {
    return await this.run(async (connection) => {
      return await connection.execute(query);
    });
  }

  async query(query: string, args?: QueryArgs): Promise<Set> {
    return await this.run(async (connection) => {
      return await connection.query(query, args);
    });
  }

  async queryJSON(query: string, args?: QueryArgs): Promise<string> {
    return await this.run(async (connection) => {
      return await connection.queryJSON(query, args);
    });
  }

  async queryOne(query: string, args?: QueryArgs): Promise<any> {
    return await this.run(async (connection) => {
      return await connection.queryOne(query, args);
    });
  }

  async queryOneJSON(query: string, args?: QueryArgs): Promise<string> {
    return await this.run(async (connection) => {
      return await connection.queryOneJSON(query, args);
    });
  }

  /**
   * Attempt to gracefully close all connections in the pool.
   *
   * Waits until all pool connections are released, closes them and
   * shuts down the pool. If any error occurs
   * in ``close()``, the pool will terminate by calling ``terminate()``.
   */
  async close(): Promise<void> {
    await this.impl.close();
  }

  isClosed(): boolean {
    return this.impl.isClosed();
  }
  /**
   * Terminate all connections in the pool. If the pool is already closed,
   * it returns without doing anything.
   */
  terminate(): void {
    this.impl.terminate();
  }
}

class PoolImpl {
  private _closed: boolean;
  private _closing: boolean;
  private _queue: LifoQueue<PoolConnectionHolder>;
  private _holders: PoolConnectionHolder[];
  private _initialized: boolean;
  private _initializing: boolean;
  private _minSize: number;
  private _maxSize: number;
  private _onAcquire?: (proxy: Connection) => Promise<void>;
  private _onRelease?: (proxy: Connection) => Promise<void>;
  private _onConnect?: (connection: Connection) => Promise<void>;
  private _connectionFactory: (
    options: NormalizedConnectConfig
  ) => Promise<PoolConnection>;
  private _generation: number;
  private _connectOptions: NormalizedConnectConfig;

  constructor(dsn?: string, options: PoolOptions = {}) {
    const {onAcquire, onRelease, onConnect, connectOptions} = options;
    const minSize =
      options.minSize === undefined ? DefaultMinPoolSize : options.minSize;
    const maxSize =
      options.maxSize === undefined ? DefaultMaxPoolSize : options.maxSize;

    this.validateSizeParameters(minSize, maxSize);

    this._queue = new LifoQueue<PoolConnectionHolder>();
    this._holders = [];
    this._initialized = false;
    this._initializing = false;
    this._minSize = minSize;
    this._maxSize = maxSize;
    this._onAcquire = onAcquire;
    this._onRelease = onRelease;
    this._onConnect = onConnect;
    this._closing = false;
    this._closed = false;
    this._generation = 0;
    this._connectOptions = parseConnectArguments({...connectOptions, dsn});
    this._connectionFactory = options.connectionFactory ?? connect;
  }

  /**
   * Get information about the current state of the pool.
   */
  getStats(): PoolStats {
    return new PoolStats(
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
  enqueue(holder: PoolConnectionHolder): void {
    this._queue.push(holder);
  }

  private validateSizeParameters(minSize: number, maxSize: number): void {
    if (maxSize <= 0) {
      throw new errors.InterfaceError(
        "maxSize is expected to be greater than zero"
      );
    }

    if (minSize < 0) {
      throw new errors.InterfaceError(
        "minSize is expected to be greater or equal to zero"
      );
    }

    if (minSize > maxSize) {
      throw new errors.InterfaceError("minSize is greater than maxSize");
    }
  }

  async initialize(): Promise<void> {
    // Ref: asyncio_pool.py _async__init__
    if (this._initialized) {
      return;
    }
    if (this._initializing) {
      throw new errors.InterfaceError("The pool is already being initialized");
    }
    if (this._closed) {
      throw new errors.InterfaceError("The pool is closed");
    }

    this._initializing = true;

    for (let i = 0; i < this._maxSize; i++) {
      const connectionHolder = new PoolConnectionHolder(
        this,
        this._onAcquire,
        this._onRelease
      );

      this._holders.push(connectionHolder);
      this._queue.push(connectionHolder);
    }

    try {
      await this._initializeHolders();
    } finally {
      this._initialized = true;
      this._initializing = false;
    }
  }

  /**
   * Expires all currently open connections.
   *
   * All currently open connections will get replaced on the
   * next Pool.acquire() call.
   */
  expireConnections(): void {
    // Expire all currently open connections
    this._generation += 1;
  }

  private async _initializeHolders(): Promise<void> {
    if (!this._minSize) {
      return;
    }

    // Since we use a LIFO queue, the first items in the queue will be
    // the last ones in `self._holders`.  We want to pre-connect the
    // first few connections in the queue, therefore we want to walk
    // `self._holders` in reverse.

    const tasks: Array<Promise<void>> = [];

    let count = 0;
    for (let i = this._holders.length - 1; i >= 0; i--) {
      if (count >= this._minSize) {
        break;
      }

      const connectionHolder = this._holders[i];
      tasks.push(connectionHolder.connect());
      count += 1;
    }

    await Promise.all(tasks);
  }

  /** @internal */
  async getNewConnection(): Promise<PoolConnection> {
    const connection = await this._connectionFactory(this._connectOptions);

    if (this._onConnect) {
      try {
        await this._onConnect(connection);
      } catch (error) {
        // If a user-defined `connect` function fails, we don't
        // know if the connection is safe for re-use, hence
        // we close it.  A new connection will be created
        // when `acquire` is called again.
        await connection.close();
        throw error;
      }
    }

    return connection;
  }

  private _checkInit(): void {
    if (!this._initialized) {
      if (this._initializing) {
        throw new errors.InterfaceError(
          "The pool is being initialized, but not yet ready: " +
            "likely there is a race between creating a pool and " +
            "using it"
        );
      }

      throw new errors.InterfaceError(
        "The pool is not initialized. Call the ``initialize`` method " +
          "before using it."
      );
    }

    if (this._closed) {
      throw new errors.InterfaceError("The pool is closed");
    }
  }

  async acquire(options: Options): Promise<PoolConnection> {
    if (this._closing) {
      throw new errors.InterfaceError("The pool is closing");
    }

    if (this._closed) {
      throw new errors.InterfaceError("The pool is closed");
    }

    this._checkInit();
    return await this._acquireConnection(options);
  }

  private async _acquireConnection(options: Options): Promise<PoolConnection> {
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
   * Release a database connection back to the pool.
   */
  async release(connection: Connection): Promise<void> {
    if (!(connection instanceof PoolConnection)) {
      throw new Error("a connection obtained via pool.acquire() was expected");
    }

    const holder = connection[INNER][HOLDER];
    if (holder == null) {
      // Already released, do nothing
      return;
    }
    if (holder.pool !== this) {
      throw new errors.InterfaceError(
        "The connection proxy does not belong to this pool."
      );
    }

    this._checkInit();

    // Let the connection do its internal housekeeping when it's released.
    return await holder.release();
  }

  /**
   * Attempt to gracefully close all connections in the pool.
   *
   * Waits until all pool connections are released, closes them and
   * shuts down the pool. If any error occurs
   * in ``close()``, the pool will terminate by calling ``terminate()``.
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
   * Terminate all connections in the pool. If the pool is already closed,
   * it returns without doing anything.
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
      "Pool.close() is taking over 60 seconds to complete. " +
        "Check if you have any unreleased connections left."
    );
  }
}

export function createPool(
  dsn?: string | PoolOptions | null,
  options?: PoolOptions | null
): Promise<Pool> {
  if (typeof dsn === "string") {
    return PoolShell.create(dsn, options);
  } else {
    if (dsn != null) {
      // tslint:disable-next-line: no-console
      console.warn(
        "`options` as the first argument to `edgedb.connect` is " +
          "deprecated, use " +
          "`edgedb.connect('instance_name_or_dsn', options)`"
      );
    }
    return PoolShell.create(undefined, {...dsn, ...options});
  }
}
