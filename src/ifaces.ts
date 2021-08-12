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
import {InnerConnection, ConnectionImpl} from "./client";
import {Options, RetryOptions, TransactionOptions} from "./options";
import {PartialRetryRule} from "./options";

import {Set} from "./datatypes/set";

export interface ProtocolVersion {
  major: number;
  minor: number;
}

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

export enum BorrowReason {
  TRANSACTION = "transaction",
  QUERY = "query",
  CLOSE = "close",
}

export interface ReadOnlyExecutor {
  execute(query: string): Promise<void>;
  query<T = unknown>(query: string, args?: QueryArgs): Promise<T[]>;
  queryJSON(query: string, args?: QueryArgs): Promise<string>;
  querySingle<T = unknown>(query: string, args?: QueryArgs): Promise<T>;
  querySingleJSON(query: string, args?: QueryArgs): Promise<string>;
  queryOne<T = unknown>(query: string, args?: QueryArgs): Promise<T>;
  queryOneJSON(query: string, args?: QueryArgs): Promise<string>;
}

export const INNER = Symbol();
export const OPTIONS = Symbol();
export const ALLOW_MODIFICATIONS = Symbol();

interface Modifiable {
  // Just a marker that discards structural typing and uses nominal type
  // I.e. it avoids:
  //   An interface declaring no members is equivalent to its supertype.
  [ALLOW_MODIFICATIONS]: never;
}

export type Executor = ReadOnlyExecutor & Modifiable;

export interface Connection extends Executor {
  transaction<T>(
    action: () => Promise<T>,
    options?: Partial<TransactionOptions>
  ): Promise<T>;
  rawTransaction<T>(
    action: (transaction: Transaction) => Promise<T>
  ): Promise<T>;
  retryingTransaction<T>(
    action: (transaction: Transaction) => Promise<T>
  ): Promise<T>;
  withTransactionOptions(opt: TransactionOptions): Connection;
  withRetryOptions(opt: RetryOptions): Connection;
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
    options?: Partial<TransactionOptions>
  ): Promise<T>;
  rawTransaction<T>(
    action: (transaction: Transaction) => Promise<T>
  ): Promise<T>;
  retryingTransaction<T>(
    action: (transaction: Transaction) => Promise<T>
  ): Promise<T>;
  withTransactionOptions(opt: TransactionOptions): Connection;
  withRetryOptions(opt: RetryOptions): Connection;
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
