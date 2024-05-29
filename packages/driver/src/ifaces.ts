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

import * as chars from "./primitives/chars";

export type ProtocolVersion = [number, number];

export enum OutputFormat {
  BINARY = chars.$b,
  JSON = chars.$j,
  NONE = chars.$n,
}

export enum Cardinality {
  NO_RESULT = chars.$n,
  AT_MOST_ONE = chars.$o,
  ONE = chars.$A,
  MANY = chars.$m,
  AT_LEAST_ONE = chars.$M,
}

export type QueryArgs = Record<string, unknown> | unknown[] | null;

export interface Executor {
  execute(query: string, args?: QueryArgs): Promise<void>;
  query<T = unknown>(query: string, args?: QueryArgs): Promise<T[]>;
  queryJSON(query: string, args?: QueryArgs): Promise<string>;
  querySingle<T = unknown>(query: string, args?: QueryArgs): Promise<T | null>;
  querySingleJSON(query: string, args?: QueryArgs): Promise<string>;
  queryRequiredSingle<T = unknown>(query: string, args?: QueryArgs): Promise<T>;
  queryRequiredSingleJSON(query: string, args?: QueryArgs): Promise<string>;
}

export interface KnownServerSettings {
  suggested_pool_concurrency?: number;
  system_config?: any;
}

export type ServerSettings = KnownServerSettings & Record<string, Uint8Array>;

export const LegacyHeaderCodes = {
  implicitLimit: 0xff01,
  implicitTypenames: 0xff02,
  implicitTypeids: 0xff03,
  allowCapabilities: 0xff04,
  capabilities: 0x1001,
  explicitObjectids: 0xff05,
};

export interface QueryOptions {
  implicitLimit?: bigint;
  injectTypenames?: boolean;
  injectTypeids?: boolean;
  injectObjectids?: boolean;
}

export interface ClientHandshakeOptions {
  user: string;
  database: string;
  secret_key?: string;
}
