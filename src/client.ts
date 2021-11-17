/*!
 * This source file is part of the EdgeDB open source project.
 *
 * Copyright 2019-present MagicStack Inc. and the EdgeDB authors.
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

import {net, hrTime, tls} from "./adapter.node";

import * as errors from "./errors";
import {sleep} from "./utils";
import {CodecsRegistry} from "./codecs/registry";
import {
  INNER,
  OPTIONS,
  Executor,
  QueryArgs,
  Connection,
  BorrowReason,
  ParseOptions,
  PrepareMessageHeaders,
  ProtocolVersion,
  ServerSettings,
} from "./ifaces";
import {
  Options,
  RetryOptions,
  SimpleRetryOptions,
  SimpleTransactionOptions,
  TransactionOptions,
} from "./options";

import {Address, NormalizedConnectConfig} from "./con_utils";
import {Transaction, START_TRANSACTION_IMPL} from "./transaction";
import {RawConnection} from "./rawConn";
import {ClientConnectionHolder} from "./pool";

export const DETACH = Symbol("detach");
export const DETACHED = Symbol("detached");
export const HOLDER = Symbol("holder");

export function borrowError(reason: BorrowReason): errors.EdgeDBError {
  let text;
  switch (reason) {
    case BorrowReason.TRANSACTION:
      text =
        "Connection object is borrowed for the transaction. " +
        "Use the methods on transaction object instead.";
      break;
    case BorrowReason.QUERY:
      text =
        "Another operation is in progress. Use multiple separate " +
        "connections to run operations concurrently.";
      break;
    case BorrowReason.CLOSE:
      text =
        "Connection is being closed. Use multiple separate " +
        "connections to run operations concurrently.";
      break;
  }
  throw new errors.InterfaceError(text);
}

export class ClientConnection implements Connection {
  declare [INNER]: ClientInnerConnection;
  [OPTIONS]: Options;

  /** @internal */
  constructor(config: NormalizedConnectConfig, registry: CodecsRegistry) {
    this.initInner(config, registry);
    this[OPTIONS] = Options.defaults();
  }

  protected initInner(
    config: NormalizedConnectConfig,
    registry: CodecsRegistry
  ): void {
    this[INNER] = new ClientInnerConnection(config, registry);
  }

  protected shallowClone(): this {
    const result = Object.create(this.constructor.prototype);
    result[INNER] = this[INNER];
    result[OPTIONS] = this[OPTIONS];
    return result;
  }

  withTransactionOptions(
    opt: TransactionOptions | SimpleTransactionOptions
  ): this {
    const result = this.shallowClone();
    result[OPTIONS] = this[OPTIONS].withTransactionOptions(opt);
    return result;
  }

  withRetryOptions(opt: RetryOptions | SimpleRetryOptions): this {
    const result = this.shallowClone();
    result[OPTIONS] = this[OPTIONS].withRetryOptions(opt);
    return result;
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
          const rule = this[OPTIONS].retryOptions.getRuleForException(err);
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

  async close(): Promise<void> {
    const borrowed_for = this[INNER].borrowedFor;
    if (borrowed_for) {
      throw borrowError(borrowed_for);
    }
    this[INNER].borrowedFor = BorrowReason.CLOSE;
    try {
      try {
        const conn = this[INNER].connection;
        if (conn) {
          await conn.close();
        }
        this[INNER].connection = undefined;
      } finally {
        this.cleanup();
      }
    } finally {
      this[INNER].borrowedFor = undefined;
    }
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

  isClosed(): boolean {
    return this[INNER]._isClosed;
  }

  async execute(query: string): Promise<void> {
    const inner = this[INNER];
    const borrowed_for = inner.borrowedFor;
    if (borrowed_for) {
      throw borrowError(borrowed_for);
    }
    inner.borrowedFor = BorrowReason.QUERY;
    let connection = inner.connection;
    if (!connection || connection.isClosed()) {
      connection = await inner.reconnect();
    }
    try {
      return await connection.execute(query);
    } finally {
      inner.borrowedFor = undefined;
    }
  }

  async query<T = unknown>(query: string, args?: QueryArgs): Promise<T[]> {
    const inner = this[INNER];
    const borrowed_for = inner.borrowedFor;
    if (borrowed_for) {
      throw borrowError(borrowed_for);
    }
    inner.borrowedFor = BorrowReason.QUERY;
    let connection = inner.connection;
    if (!connection || connection.isClosed()) {
      connection = await inner.reconnect();
    }
    try {
      return await connection.fetch(query, args, false, false);
    } finally {
      inner.borrowedFor = undefined;
    }
  }

  async queryJSON(query: string, args?: QueryArgs): Promise<string> {
    const inner = this[INNER];
    const borrowed_for = inner.borrowedFor;
    if (borrowed_for) {
      throw borrowError(borrowed_for);
    }
    inner.borrowedFor = BorrowReason.QUERY;
    let connection = inner.connection;
    if (!connection || connection.isClosed()) {
      connection = await inner.reconnect();
    }
    try {
      return await connection.fetch(query, args, true, false);
    } finally {
      inner.borrowedFor = undefined;
    }
  }

  async querySingle<T = unknown>(
    query: string,
    args?: QueryArgs
  ): Promise<T | null> {
    const inner = this[INNER];
    const borrowed_for = inner.borrowedFor;
    if (borrowed_for) {
      throw borrowError(borrowed_for);
    }
    inner.borrowedFor = BorrowReason.QUERY;
    let connection = inner.connection;
    if (!connection || connection.isClosed()) {
      connection = await inner.reconnect();
    }
    try {
      return await connection.fetch(query, args, false, true);
    } finally {
      inner.borrowedFor = undefined;
    }
  }

  async querySingleJSON(query: string, args?: QueryArgs): Promise<string> {
    const inner = this[INNER];
    const borrowed_for = inner.borrowedFor;
    if (borrowed_for) {
      throw borrowError(borrowed_for);
    }
    inner.borrowedFor = BorrowReason.QUERY;
    let connection = inner.connection;
    if (!connection || connection.isClosed()) {
      connection = await inner.reconnect();
    }
    try {
      return await connection.fetch(query, args, true, true);
    } finally {
      inner.borrowedFor = undefined;
    }
  }

  async queryRequiredSingle<T = unknown>(
    query: string,
    args?: QueryArgs
  ): Promise<T> {
    const inner = this[INNER];
    const borrowed_for = inner.borrowedFor;
    if (borrowed_for) {
      throw borrowError(borrowed_for);
    }
    inner.borrowedFor = BorrowReason.QUERY;
    let connection = inner.connection;
    if (!connection || connection.isClosed()) {
      connection = await inner.reconnect();
    }
    try {
      return await connection.fetch(query, args, false, true, true);
    } finally {
      inner.borrowedFor = undefined;
    }
  }

  async queryRequiredSingleJSON(
    query: string,
    args?: QueryArgs
  ): Promise<string> {
    const inner = this[INNER];
    const borrowed_for = inner.borrowedFor;
    if (borrowed_for) {
      throw borrowError(borrowed_for);
    }
    inner.borrowedFor = BorrowReason.QUERY;
    let connection = inner.connection;
    if (!connection || connection.isClosed()) {
      connection = await inner.reconnect();
    }
    try {
      return await connection.fetch(query, args, true, true, true);
    } finally {
      inner.borrowedFor = undefined;
    }
  }

  /** @internal */
  static async connect<S extends ClientConnection>(
    this: new (config: NormalizedConnectConfig, registry: CodecsRegistry) => S,
    config: NormalizedConnectConfig,
    registry: CodecsRegistry
  ): Promise<S> {
    const conn = new this(config, registry);
    await conn[INNER].reconnect();
    return conn;
  }
}

export class ClientInnerConnection {
  private [DETACHED]: boolean;
  private [HOLDER]: ClientConnectionHolder | null;

  borrowedFor?: BorrowReason;
  config: NormalizedConnectConfig;
  connection?: RawConnection;
  registry: CodecsRegistry;

  constructor(config: NormalizedConnectConfig, registry: CodecsRegistry) {
    this.config = config;
    this.registry = registry;
    this[DETACHED] = false;
  }

  async getImpl(singleAttempt: boolean = false): Promise<RawConnection> {
    let connection = this.connection;
    if (!connection || connection.isClosed()) {
      connection = await this.reconnect(singleAttempt);
    }
    return connection;
  }

  get _isClosed(): boolean {
    return this.connection?.isClosed() ?? false;
  }

  logConnectionError(...args: any): void {
    if (!this.config.logging) {
      return;
    }
    if (
      this.config.inProject &&
      !this.config.fromProject &&
      !this.config.fromEnv
    ) {
      args.push(
        `\n\n\n` +
          `Hint: it looks like the program is running from a ` +
          `directory initialized with "edgedb project init". ` +
          `Consider calling "edgedb.connect()" without arguments.` +
          `\n`
      );
    }
    // tslint:disable-next-line: no-console
    console.warn(...args);
  }

  async reconnect(singleAttempt: boolean = false): Promise<RawConnection> {
    if (this[DETACHED]) {
      throw new errors.InterfaceError(
        "Connection has been released to a pool"
      );
    }

    let maxTime: number;
    if (singleAttempt || this.config.waitUntilAvailable === 0) {
      maxTime = 0;
    } else {
      maxTime = hrTime() + (this.config.waitUntilAvailable || 0);
    }
    let iteration = 1;
    let lastLoggingAt = 0;
    while (true) {
      for (const addr of [this.config.connectionParams.address]) {
        try {
          this.connection = await RawConnection.connectWithTimeout(
            addr,
            this.config,
            this.registry
          );
          return this.connection;
        } catch (e) {
          if (e instanceof errors.ClientConnectionError) {
            if (e.hasTag(errors.SHOULD_RECONNECT)) {
              const now = hrTime();
              if (iteration > 1 && now > maxTime) {
                // We check here for `iteration > 1` to make sure that all of
                // `this.configs.addrs` were attempted to be connected.
                throw e;
              }
              if (
                iteration > 1 &&
                (!lastLoggingAt || now - lastLoggingAt > 5_000)
              ) {
                // We check here for `iteration > 1` to only log
                // when all addrs of `this.configs.addrs` were attempted to
                // be connected and we're starting to wait for the DB to
                // become available.
                lastLoggingAt = now;
                this.logConnectionError(
                  `A client connection error occurred; reconnecting because ` +
                    `of "waitUntilAvailable=${this.config.waitUntilAvailable}".`,
                  e
                );
              }
              continue;
            } else {
              throw e;
            }
          } else {
            // tslint:disable-next-line: no-console
            console.error("Unexpected connection error:", e);
            throw e; // this shouldn't happen
          }
        }
      }

      iteration += 1;
      await sleep(Math.trunc(10 + Math.random() * 200));
    }
  }

  detach(): ClientInnerConnection {
    const impl = this.connection;
    this.connection = undefined;
    const result = new ClientInnerConnection(this.config, this.registry);
    result.connection = impl;
    return result;
  }
}

// export class RawConnection extends ConnectionImpl {
//   // Note that this class, while exported, is not documented.
//   // Its API is subject to change.

//   static async connectWithTimeout(
//     addr: Address,
//     config: NormalizedConnectConfig
//   ): Promise<RawConnection> {
//     const registry = new CodecsRegistry();
//     return ConnectionImpl.connectWithTimeout.call(
//       RawConnection,
//       addr,
//       config,
//       registry
//     ) as unknown as RawConnection;
//   }

//   public async rawParse(
//     query: string,
//     headers?: PrepareMessageHeaders
//   ): Promise<[Buffer, Buffer, ProtocolVersion]> {
//     const result = await this._parse(query, false, false, true, {headers});
//     return [result[3]!, result[4]!, this.protocolVersion];
//   }

//   public async rawExecute(encodedArgs: Buffer | null = null):
//   Promise<Buffer> {
//     const result = new WriteBuffer();
//     let inCodec = EMPTY_TUPLE_CODEC;
//     if (versionGreaterThanOrEqual(this.protocolVersion, [0, 12])) {
//       inCodec = NULL_CODEC;
//     }
//     await this._executeFlow(
//       encodedArgs, // arguments
//       inCodec, // inCodec -- to encode lack of arguments.
//       EMPTY_TUPLE_CODEC, // outCodec -- does not matter,
//  it will not be used.
//       result
//     );
//     return result.unwrap();
//   }

//   // Mask the actual connection API; only the raw* methods should
//   // be used with this class.

//   async execute(query: string): Promise<void> {
//     throw new Error("not implemented");
//   }

//   async query<T = unknown>(
//     query: string,
//     args: QueryArgs = null
//   ): Promise<T[]> {
//     throw new Error("not implemented");
//   }

//   async querySingle<T = unknown>(
//     query: string,
//     args: QueryArgs = null
//   ): Promise<T> {
//     throw new Error("not implemented");
//   }

//   async queryJSON(query: string, args: QueryArgs = null): Promise<string> {
//     throw new Error("not implemented");
//   }

//   async querySingleJSON(
//     query: string,
//     args: QueryArgs = null
//   ): Promise<string> {
//     throw new Error("not implemented");
//   }
// }
