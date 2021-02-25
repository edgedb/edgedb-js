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
import {Transaction} from "./transaction";
import {ConnectionImpl} from "./client";

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

export enum IsolationLevel {
  SERIALIZABLE = "serializable",
  REPEATABLE_READ = "repeatable_read",
}

export enum BorrowReason {
  TRANSACTION = "transaction",
}

export interface TransactionOptions {
  deferrable?: boolean;
  isolation?: IsolationLevel;
  readonly?: boolean;
}

export interface ReadOnlyExecutor {
  execute(query: string): Promise<void>;
  query(query: string, args?: QueryArgs): Promise<Set>;
  queryJSON(query: string, args?: QueryArgs): Promise<string>;
  queryOne(query: string, args?: QueryArgs): Promise<any>;
  queryOneJSON(query: string, args?: QueryArgs): Promise<string>;
}

export const BORROWED_FOR = Symbol();
export const CONNECTION_IMPL = Symbol();
export const ALLOW_MODIFICATIONS = Symbol();

interface Modifiable {
  // Just a marker that discards structural typing and uses nominal type
  // I.e. it avoids:
  //   An interface declaring no members is equivalent to its supertype.
  [ALLOW_MODIFICATIONS]: never;
}

export type Executor = ReadOnlyExecutor & Modifiable;

export interface Connection extends Executor {
  [BORROWED_FOR]?: BorrowReason;
  [CONNECTION_IMPL](singleConnect?: boolean): Promise<ConnectionImpl>;
  transaction<T>(
    action: () => Promise<T>,
    options?: TransactionOptions
  ): Promise<T>;
  rawTransaction<T>(
    action: (transaction: Transaction) => Promise<T>
  ): Promise<T>;
  retry<T>(action: (transaction: Transaction) => Promise<T>): Promise<T>;
  close(): Promise<void>;
  isClosed(): boolean;
}

export interface IPoolStats {
  queueLength: number;
  openConnections: number;
}

export interface Pool extends Executor {
  transaction<T>(
    action: () => Promise<T>,
    options?: TransactionOptions
  ): Promise<T>;
  rawTransaction<T>(
    action: (transaction: Transaction) => Promise<T>
  ): Promise<T>;
  retry<T>(action: (transaction: Transaction) => Promise<T>): Promise<T>;
  close(): Promise<void>;
  isClosed(): boolean;

  acquire(): Promise<Connection>;
  release(connectionProxy: Connection): Promise<void>;
  run<T>(action: (connection: Connection) => Promise<T>): Promise<T>;
  expireConnections(): void;
  getStats(): IPoolStats;
  terminate(): void;
}

export const onConnectionClose = Symbol("onConnectionClose");

export interface IConnectionProxied extends Connection {
  [onConnectionClose](): void;
}
