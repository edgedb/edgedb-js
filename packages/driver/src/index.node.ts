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

import { createClient } from "./nodeClient.js";
export default createClient;

export { createClient, createHttpClient } from "./nodeClient.js";

import * as adapter from "./adapter.node.js";
export { adapter };

export { RawConnection as _RawConnection } from "./rawConn.js";
export type { Executor } from "./ifaces.js";
export type { Client, ConnectOptions } from "./baseClient.js";
export {
  IsolationLevel,
  RetryCondition,
  RetryOptions,
  Session,
} from "./options.js";
export { defaultBackoff } from "./options.js";
export type { BackoffFunction } from "./options.js";

export * from "./index.shared.js";
export * as $ from "./reflection/index.js";
