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

import {
  LocalDateTime,
  LocalDate,
  LocalTime,
  Duration,
  RelativeDuration,
} from "./datatypes/datetime";
import {ConfigMemory} from "./datatypes/memory";

export type ProtocolVersion = [number, number];

type QueryArgPrimitive =
  | number
  | string
  | boolean
  | BigInt
  | Buffer
  | Date
  | LocalDateTime
  | LocalDate
  | LocalTime
  | Duration
  | RelativeDuration
  | ConfigMemory;

type QueryArg = QueryArgPrimitive | QueryArgPrimitive[] | null;

export type QueryArgs = {[_: string]: QueryArg} | QueryArg[] | null;

export interface Executor {
  execute(query: string): Promise<void>;
  query<T = unknown>(query: string, args?: QueryArgs): Promise<T[]>;
  queryJSON(query: string, args?: QueryArgs): Promise<string>;
  querySingle<T = unknown>(query: string, args?: QueryArgs): Promise<T | null>;
  querySingleJSON(query: string, args?: QueryArgs): Promise<string>;
  queryRequiredSingle<T = unknown>(
    query: string,
    args?: QueryArgs
  ): Promise<T>;
  queryRequiredSingleJSON(query: string, args?: QueryArgs): Promise<string>;
}

export interface KnownServerSettings {
  suggested_pool_concurrency?: number;
  system_config?: any;
}

export type ServerSettings = KnownServerSettings & {
  [key: string]: Buffer;
};

export const HeaderCodes = {
  implicitLimit: 0xff01,
  implicitTypenames: 0xff02,
  implicitTypeids: 0xff03,
  allowCapabilities: 0xff04,
};

export type MessageHeaders = {
  [key in keyof typeof HeaderCodes]?: string | Buffer;
};

export interface PrepareMessageHeaders {
  implicitLimit?: string;
  implicitTypenames?: "true";
  implicitTypeids?: "true";
}

export interface ParseOptions {
  headers?: PrepareMessageHeaders;
}
