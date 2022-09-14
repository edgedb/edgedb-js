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

export {createClient} from "./_src/client.ts";
import {createClient} from "./_src/client.ts";
export default createClient;

export {RawConnection as _RawConnection} from "./_src/rawConn.ts";

export type {Executor} from "./_src/ifaces.ts";
export type {Client, ConnectOptions} from "./_src/client.ts";

export {
  IsolationLevel,
  RetryCondition,
  RetryOptions,
  Session,
} from "./_src/options.ts";
export {defaultBackoff} from "./_src/options.ts";
export type {BackoffFunction} from "./_src/options.ts";

export * from "./_src/index.shared.ts";

export * as reflection from "./_src/reflection/index.ts";
export * as $ from "./_src/reflection/index.ts";
