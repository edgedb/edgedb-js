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

import {Address, NormalizedConnectConfig} from "./con_utils";
import {RawConnection} from "./rawConn";

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
