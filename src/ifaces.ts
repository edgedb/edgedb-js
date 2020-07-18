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

import {UUID} from "./datatypes/uuid";

import {
  LocalDateTime,
  LocalDate,
  LocalTime,
  Duration,
} from "./datatypes/datetime";

import {Set} from "./datatypes/set";

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
  | UUID;

type QueryArg = QueryArgPrimitive | QueryArgPrimitive[] | null;

export type QueryArgs = {[_: string]: QueryArg} | QueryArg[] | null;

export interface Connection {
  execute(query: string): Promise<void>;
  query(query: string, args?: QueryArgs): Promise<Set>;
  queryJSON(query: string, args?: QueryArgs): Promise<string>;
  queryOne(query: string, args?: QueryArgs): Promise<any>;
  queryOneJSON(query: string, args?: QueryArgs): Promise<string>;
  close(): Promise<void>;
  isClosed(): boolean;
}

export interface IPoolStats {
  queueLength: number;
  openConnections: number;
}

export interface Pool extends Connection {
  acquire(): Promise<Connection>;
  release(connectionProxy: Connection): Promise<void>;
  run<T>(action: (connection: Connection) => Promise<T>): Promise<T>;
  expireConnections(): void;
  getStats(): IPoolStats;
  terminate(): void;
}

export const onConnectionClose = Symbol.for("onConnectionClose");

export interface IConnectionProxied extends Connection {
  [onConnectionClose](): void;
}
