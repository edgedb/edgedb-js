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

import * as process from "process";

import connect from "../src/index.node";
import {NodeCallback, AwaitConnection, Connection} from "../src/client";
import {ConnectConfig} from "../src/con_utils";

function _getOpts(opts: ConnectConfig): ConnectConfig {
  const port = process.env._JEST_EDGEDB_PORT;
  const host = process.env._JEST_EDGEDB_HOST;
  if (!port || !host) {
    throw new Error("EdgeDB Jest test environmet is not initialized");
  }
  if (!opts.user) {
    opts.user = "jest";
    opts.password = "jestjest";
  }
  if (!opts.database) {
    opts.database = "jest";
  }
  return {host, port: parseInt(port, 10), ...opts};
}

export async function asyncConnect(
  opts?: ConnectConfig
): Promise<AwaitConnection> {
  return await connect(_getOpts(opts ?? {}));
}

export function connectWithCallback(
  opts?: ConnectConfig,
  cb?: NodeCallback<Connection>
): void {
  return connect(_getOpts(opts ?? {}), cb);
}
