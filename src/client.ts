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

export const HOLDER = Symbol("holder");

export class ClientConnection implements Connection {
  connection?: RawConnection;
  [OPTIONS]: Options;
  private [HOLDER]: ClientConnectionHolder | null;

  /** @internal */
  constructor(
    private config: NormalizedConnectConfig,
    private registry: CodecsRegistry
  ) {
    this[OPTIONS] = Options.defaults();
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
    try {
      if (this.connection) {
        await this.connection.close();
      }
      this.connection = undefined;
    } finally {
      this.cleanup();
    }
  }

  protected cleanup(): void {
    const holder = this[HOLDER];
    if (holder) {
      holder._releaseOnClose();
    }
  }

  isClosed(): boolean {
    return this.connection?.isClosed() ?? false;
  }

  async _getConnection(
    singleConnect: boolean = false
  ): Promise<RawConnection> {
    if (!this.connection || this.connection.isClosed()) {
      this.connection = singleConnect
        ? await RawConnection.connectWithTimeout(
            this.config.connectionParams.address,
            this.config,
            this.registry
          )
        : await retryingConnect(this.config, this.registry);
    }
    return this.connection;
  }

  async execute(query: string): Promise<void> {
    const conn = await this._getConnection();
    return await conn.execute(query);
  }

  async query<T = unknown>(query: string, args?: QueryArgs): Promise<T[]> {
    const conn = await this._getConnection();
    return await conn.fetch(query, args, false, false);
  }

  async queryJSON(query: string, args?: QueryArgs): Promise<string> {
    const conn = await this._getConnection();
    return await conn.fetch(query, args, true, false);
  }

  async querySingle<T = unknown>(
    query: string,
    args?: QueryArgs
  ): Promise<T | null> {
    const conn = await this._getConnection();
    return await conn.fetch(query, args, false, true);
  }

  async querySingleJSON(query: string, args?: QueryArgs): Promise<string> {
    const conn = await this._getConnection();
    return await conn.fetch(query, args, true, true);
  }

  async queryRequiredSingle<T = unknown>(
    query: string,
    args?: QueryArgs
  ): Promise<T> {
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

  /** @internal */
  static async connect<S extends ClientConnection>(
    this: new (config: NormalizedConnectConfig, registry: CodecsRegistry) => S,
    config: NormalizedConnectConfig,
    registry: CodecsRegistry
  ): Promise<S> {
    const conn = new this(config, registry);
    await conn._getConnection();
    return conn;
  }
}

export async function retryingConnect(
  config: NormalizedConnectConfig,
  registry: CodecsRegistry
): Promise<RawConnection> {
  const maxTime =
    config.waitUntilAvailable === 0 ? 0 : hrTime() + config.waitUntilAvailable;
  let lastLoggingAt = 0;
  while (true) {
    try {
      return await RawConnection.connectWithTimeout(
        config.connectionParams.address,
        config,
        registry
      );
    } catch (e) {
      if (e instanceof errors.ClientConnectionError) {
        if (e.hasTag(errors.SHOULD_RECONNECT)) {
          const now = hrTime();
          if (now > maxTime) {
            throw e;
          }
          if (
            config.logging &&
            (!lastLoggingAt || now - lastLoggingAt > 5_000)
          ) {
            lastLoggingAt = now;
            const logMsg = [
              `A client connection error occurred; reconnecting because ` +
                `of "waitUntilAvailable=${config.waitUntilAvailable}".`,
              e,
            ];

            if (config.inProject && !config.fromProject && !config.fromEnv) {
              logMsg.push(
                `\n\n\n` +
                  `Hint: it looks like the program is running from a ` +
                  `directory initialized with "edgedb project init". ` +
                  `Consider calling "edgedb.connect()" without arguments.` +
                  `\n`
              );
            }
            // tslint:disable-next-line: no-console
            console.warn(...logMsg);
          }
        } else {
          throw e;
        }
      } else {
        // tslint:disable-next-line: no-console
        console.error("Unexpected connection error:", e);
        throw e; // this shouldn't happen
      }
    }

    await sleep(Math.trunc(10 + Math.random() * 200));
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
