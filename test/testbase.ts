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

import connect, {createPool} from "../src/index.node";
import {ConnectConfig} from "../src/con_utils";
import {Connection, Pool} from "../src/ifaces";

export const isDeno =
  typeof window !== "undefined" &&
  // @ts-ignore
  typeof Deno !== "undefined";

function _getOpts(opts: ConnectConfig): ConnectConfig {
  let config;
  try {
    config = JSON.parse(process.env._JEST_EDGEDB_CONNECT_CONFIG || "");
  } catch {
    throw new Error("EdgeDB Jest test environment is not initialized");
  }
  if (!opts.user) {
    opts.user = "jest";
    opts.password = "jestjest";
  }
  if (!opts.database) {
    opts.database = "jest";
  }
  return {...config, ...opts};
}

export function getConnectOptions(): ConnectConfig {
  return _getOpts({});
}

export async function asyncConnect(opts?: ConnectConfig): Promise<Connection> {
  return await connect(undefined, _getOpts(opts ?? {}));
}

export async function getPool(opts?: ConnectConfig): Promise<Pool> {
  return await createPool(undefined, {
    connectOptions: _getOpts(opts ?? {}),
  });
}
