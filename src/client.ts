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

import * as net from "net";

import char, * as chars from "./chars";
import {resolveErrorCode} from "./errors/resolve";
import * as errors from "./errors";
import {
  ReadMessageBuffer,
  WriteMessageBuffer,
  ReadBuffer,
  WriteBuffer,
} from "./buffer";
import {CodecsRegistry} from "./codecs/registry";
import {ICodec, uuid} from "./codecs/ifaces";
import {Set} from "./datatypes/set";
import LRU from "./lru";
import {EMPTY_TUPLE_CODEC, EmptyTupleCodec, TupleCodec} from "./codecs/tuple";
import {NamedTupleCodec} from "./codecs/namedtuple";
import {
  ALLOW_MODIFICATIONS,
  BORROWED_FOR,
  CONNECTION_IMPL,
  Executor,
  QueryArgs,
  Connection,
  BorrowReason,
  IConnectionProxied,
  onConnectionClose,
  TransactionOptions,
  ParseOptions,
  PrepareMessageHeaders,
} from "./ifaces";
import * as scram from "./scram";

import {
  parseConnectArguments,
  Address,
  ConnectConfig,
  NormalizedConnectConfig,
} from "./con_utils";
import {Transaction as LegacyTransaction} from "./legacy_transaction";
import {Transaction, START_TRANSACTION_IMPL} from "./transaction";

const PROTO_VER_MAJOR = 0;
const PROTO_VER_MINOR = 9;

enum AuthenticationStatuses {
  AUTH_OK = 0,
  AUTH_SASL = 10,
  AUTH_SASL_CONTINUE = 11,
  AUTH_SASL_FINAL = 12,
}

enum TransactionStatus {
  TRANS_IDLE = 0, // connection idle
  TRANS_ACTIVE = 1, // command in progress
  TRANS_INTRANS = 2, // idle, within transaction block
  TRANS_INERROR = 3, // idle, within failed transaction
  TRANS_UNKNOWN = 4, // cannot determine status
}

const ALLOW_CAPABILITIES = 0xff04;
const EXECUTE_CAPABILITIES_BYTES = Buffer.from(
  // everything except TRANSACTION = 1 << 2 in network byte order
  [255, 255, 255, 255, 255, 255, 255, 251]
);

const DEFAULT_MAX_ITERATIONS = 3;

function default_backoff(attempt: number): number {
  return 2 ** attempt * 100 + Math.random() * 100;
}

/* Internal mapping used to break strong reference between
 * connections and their pool proxies.
 */
export const proxyMap = new WeakMap<Connection, IConnectionProxied>();

export default function connect(
  dsn?: string | ConnectConfig | null,
  options?: ConnectConfig | null
): Promise<Connection> {
  let config: ConnectConfig | null = null;
  if (typeof dsn === "string") {
    config = {...options, dsn};
  } else {
    if (dsn != null) {
      // tslint:disable-next-line: no-console
      console.warn(
        "`options` as the first argument to `edgedb.connect` is " +
          "deprecated, use " +
          "`edgedb.connect('instance_name_or_dsn', options)`"
      );
    }
    config = {...dsn, ...options};
  }
  return StandaloneConnection.connect(parseConnectArguments(config));
}

function sleep(durationMillis: number): Promise<void> {
  return new Promise((accept, reject) => {
    setTimeout(() => accept(), durationMillis);
  });
}

function borrowError(reason: BorrowReason): errors.EdgeDBError {
  let text;
  switch (reason) {
    case BorrowReason.TRANSACTION:
      text =
        "Connection object is borrowed for the transaction. " +
        "Use the methods on transaction object instead.";
      break;
  }
  throw new errors.InterfaceError(text);
}

class StandaloneConnection implements Connection {
  [ALLOW_MODIFICATIONS]: never;
  [BORROWED_FOR]?: BorrowReason;
  private config: NormalizedConnectConfig;
  private _connection?: ConnectionImpl;
  private _isClosed: boolean; // For compatibility

  private constructor(config: NormalizedConnectConfig) {
    this.config = config;
    this._isClosed = false;
  }

  async [CONNECTION_IMPL](
    singleAttempt: boolean = false
  ): Promise<ConnectionImpl> {
    let connection = this._connection;
    if (!connection || connection.isClosed()) {
      connection = await this._reconnect(singleAttempt);
    }
    return connection;
  }

  async transaction<T>(
    action: () => Promise<T>,
    options?: TransactionOptions
  ): Promise<T> {
    // tslint:disable-next-line: no-console
    console.warn(
      "The `transaction()` method is deprecated and is scheduled to be " +
        "removed. Use the `retryingTransaction()` or `rawTransaction()` " +
        "method instead"
    );
    let connection = this._connection;
    if (!connection || connection.isClosed()) {
      connection = await this._reconnect();
    }
    return await connection.transaction(action, options);
  }

  async rawTransaction<T>(
    action: (transaction: Transaction) => Promise<T>
  ): Promise<T> {
    let result: T;
    const transaction = new Transaction(this);
    await transaction.start();
    try {
      result = await action(transaction);
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
    return result;
  }

  async retryingTransaction<T>(
    action: (transaction: Transaction) => Promise<T>
  ): Promise<T> {
    let result: T;
    for (let iteration = 0; iteration < DEFAULT_MAX_ITERATIONS; ++iteration) {
      const transaction = new Transaction(this);
      await transaction[START_TRANSACTION_IMPL](iteration !== 0);
      try {
        result = await action(transaction);
      } catch (err) {
        try {
          await transaction.rollback();
        } catch (rollback_err) {
          if (!(rollback_err instanceof errors.EdgeDBError)) {
            // We ignore EdgeDBError errors on rollback, retrying
            // if possible. All other errors are propagated.
            throw rollback_err;
          }
        }
        if (
          err instanceof errors.EdgeDBError &&
          err.hasTag(errors.SHOULD_RETRY) &&
          iteration + 1 < DEFAULT_MAX_ITERATIONS
        ) {
          await sleep(default_backoff(iteration));
          continue;
        }
        throw err;
      }
      // TODO(tailhook) sort out errors on commit, early network errors
      // and some other errors could be retried
      // NOTE: we can't retry on all the same errors as we don't know if
      // commit is succeeded before the database have received it or after
      // it have been done but network is dropped before we were able
      // to receive a response
      await transaction.commit();
      return result;
    }
    throw Error("unreachable");
  }

  async close(): Promise<void> {
    try {
      if (this._connection) {
        await this._connection.close();
      }
      this._connection = undefined;
      // TODO(tailhook) it makes little sense to close the reconnecting
      // connection so maybe deprecate this method
      this._isClosed = true;
    } finally {
      this._cleanupProxy();
    }
  }

  private _cleanupProxy(): void {
    const proxy = proxyMap.get(this);
    if (proxy != null) {
      proxy[onConnectionClose]();
      proxyMap.delete(this);
    }
  }

  isClosed(): boolean {
    return this._isClosed;
  }

  async execute(query: string): Promise<void> {
    const borrowed_for = this[BORROWED_FOR];
    if (borrowed_for) {
      throw borrowError(borrowed_for);
    }
    let connection = this._connection;
    if (!connection || connection.isClosed()) {
      connection = await this._reconnect();
    }
    return await connection.execute(query);
  }

  async query(query: string, args?: QueryArgs): Promise<Set> {
    const borrowed_for = this[BORROWED_FOR];
    if (borrowed_for) {
      throw borrowError(borrowed_for);
    }
    let connection = this._connection;
    if (!connection || connection.isClosed()) {
      connection = await this._reconnect();
    }
    return await connection.query(query, args);
  }

  async queryJSON(query: string, args?: QueryArgs): Promise<string> {
    const borrowed_for = this[BORROWED_FOR];
    if (borrowed_for) {
      throw borrowError(borrowed_for);
    }
    let connection = this._connection;
    if (!connection || connection.isClosed()) {
      connection = await this._reconnect();
    }
    return await connection.queryJSON(query, args);
  }

  async queryOne(query: string, args?: QueryArgs): Promise<any> {
    const borrowed_for = this[BORROWED_FOR];
    if (borrowed_for) {
      throw borrowError(borrowed_for);
    }
    let connection = this._connection;
    if (!connection || connection.isClosed()) {
      connection = await this._reconnect();
    }
    return await connection.queryOne(query, args);
  }

  async queryOneJSON(query: string, args?: QueryArgs): Promise<string> {
    const borrowed_for = this[BORROWED_FOR];
    if (borrowed_for) {
      throw borrowError(borrowed_for);
    }
    let connection = this._connection;
    if (!connection || connection.isClosed()) {
      connection = await this._reconnect();
    }
    return await connection.queryOneJSON(query, args);
  }

  private async _reconnect(
    singleAttempt: boolean = false
  ): Promise<ConnectionImpl> {
    if (this._isClosed) {
      throw new errors.InterfaceError("Connection is closed");
    }
    let maxTime;
    if (singleAttempt) {
      maxTime = 0;
    } else {
      maxTime =
        process.hrtime.bigint() +
        BigInt(Math.ceil((this.config.waitUntilAvailable || 0) * 1_000_000));
    }
    let iteration = 1;
    while (true) {
      for (const addr of this.config.addrs) {
        try {
          this._connection = await ConnectionImpl.connectWithTimeout(
            addr,
            this.config
          );
          return this._connection;
        } catch (e) {
          if (e instanceof errors.ClientConnectionError) {
            if (e.hasTag(errors.SHOULD_RECONNECT)) {
              if (iteration > 1 && process.hrtime.bigint() > maxTime) {
                throw e;
              }
              continue;
            } else {
              throw e;
            }
          } else {
            throw e; // this shouldn't happen
          }
        }
      }

      iteration += 1;
      await sleep(Math.trunc(10 + Math.random() * 200));
    }
  }
  /** @internal */
  static async connect(
    config: NormalizedConnectConfig
  ): Promise<StandaloneConnection> {
    const conn = new StandaloneConnection(config);
    await conn._reconnect();
    return conn;
  }
}

export class ConnectionImpl implements Executor {
  [ALLOW_MODIFICATIONS]: never;
  private sock: net.Socket;
  private config: NormalizedConnectConfig;
  private paused: boolean;
  private connected: boolean = false;

  private lastStatus: string | null;

  private codecsRegistry: CodecsRegistry;
  private queryCodecCache: LRU<string, [number, ICodec, ICodec]>;

  private serverSecret: Buffer | null;
  private serverSettings: Map<string, string>;
  private serverXactStatus: TransactionStatus;

  private buffer: ReadMessageBuffer;

  private messageWaiterResolve: ((value: any) => void) | null;
  private messageWaiterReject: ((error: Error) => void) | null;

  private connWaiter: Promise<void>;
  private connWaiterResolve: ((value: any) => void) | null;
  private connWaiterReject: ((value: any) => void) | null;

  private opInProgress: boolean = false;

  /** @internal */
  protected constructor(sock: net.Socket, config: NormalizedConnectConfig) {
    this.buffer = new ReadMessageBuffer();

    this.codecsRegistry = new CodecsRegistry();
    this.queryCodecCache = new LRU({capacity: 1000});

    this.lastStatus = null;

    this.serverSecret = null;
    this.serverSettings = new Map<string, string>();
    this.serverXactStatus = TransactionStatus.TRANS_UNKNOWN;

    this.messageWaiterResolve = null;
    this.messageWaiterReject = null;

    this.connWaiterResolve = null;
    this.connWaiterReject = null;
    this.connWaiter = new Promise<void>((resolve, reject) => {
      this.connWaiterResolve = resolve;
      this.connWaiterReject = reject;
    });

    this.paused = false;
    this.sock = sock;
    this.sock.setNoDelay();
    this.sock.on("error", this._onError.bind(this));
    this.sock.on("data", this._onData.bind(this));
    this.sock.on("connect", this._onConnect.bind(this));
    this.sock.on("close", this._onClose.bind(this));

    this.config = config;

    if (config.legacyUUIDMode) {
      this.codecsRegistry.enableLegacyUUID();
    }
  }

  private async _waitForMessage(): Promise<void> {
    if (this.buffer.takeMessage()) {
      return;
    }

    if (this.paused) {
      this.paused = false;
      this.sock.resume();
    }

    await new Promise<void>((resolve, reject) => {
      this.messageWaiterResolve = resolve;
      this.messageWaiterReject = reject;
    });
  }

  private _onConnect(): void {
    if (this.connWaiterResolve) {
      this.connWaiterResolve(true);
      this.connWaiterReject = null;
      this.connWaiterResolve = null;
    }
  }

  private _abortWaiters(err: Error): void {
    if (this.connWaiterReject) {
      this.connWaiterReject(err);
      this.connWaiterReject = null;
      this.connWaiterResolve = null;
    }

    if (this.messageWaiterReject) {
      this.messageWaiterReject(err);
      this.messageWaiterResolve = null;
      this.messageWaiterReject = null;
    }
  }

  private _onClose(): void {
    if (this.connWaiterReject || this.messageWaiterReject) {
      /* This can happen, particularly, during the connect phase.
         If the connection is aborted with a client-side timeout, there can be
         a situation where the connection has actually been established,
         and so `conn.sock.destroy` would simply close the socket,
         without invoking the 'error' event.
      */
      this._abortWaiters(new errors.ClientConnectionClosedError());
    }
    this.close();
  }

  private _onError(err: Error): void {
    this._abortWaiters(err);
  }

  private _onData(data: Buffer): void {
    let pause = false;
    try {
      pause = this.buffer.feed(data);
    } catch (e) {
      if (this.messageWaiterReject) {
        this.messageWaiterReject(e);
      } else {
        throw e;
      }
    }

    if (pause) {
      this.paused = true;
      this.sock.pause();
    }

    if (this.messageWaiterResolve) {
      if (this.buffer.takeMessage()) {
        this.messageWaiterResolve(true);
        this.messageWaiterResolve = null;
        this.messageWaiterReject = null;
      }
    }
  }

  private _ignoreHeaders(): void {
    let numFields = this.buffer.readInt16();
    while (numFields) {
      this.buffer.readInt16();
      this.buffer.readLenPrefixedBuffer();
      numFields--;
    }
  }

  private _parseHeaders(): Map<number, Buffer> {
    const ret = new Map<number, Buffer>();
    let numFields = this.buffer.readInt16();
    while (numFields) {
      const key = this.buffer.readInt16();
      const value = this.buffer.readLenPrefixedBuffer();
      ret.set(key, value);
      numFields--;
    }
    return ret;
  }

  private _parseDescribeTypeMessage(): [
    number,
    ICodec,
    ICodec,
    Buffer,
    Buffer
  ] {
    this._ignoreHeaders();

    const cardinality: char = this.buffer.readChar();

    const inTypeId = this.buffer.readUUID();
    const inTypeData = this.buffer.readLenPrefixedBuffer();

    const outTypeId = this.buffer.readUUID();
    const outTypeData = this.buffer.readLenPrefixedBuffer();

    this.buffer.finishMessage();

    let inCodec = this.codecsRegistry.getCodec(inTypeId);
    if (inCodec == null) {
      inCodec = this.codecsRegistry.buildCodec(inTypeData);
    }

    let outCodec = this.codecsRegistry.getCodec(outTypeId);
    if (outCodec == null) {
      outCodec = this.codecsRegistry.buildCodec(outTypeData);
    }

    return [cardinality, inCodec, outCodec, inTypeData, outTypeData];
  }

  private _parseCommandCompleteMessage(): string {
    this._ignoreHeaders();
    const status = this.buffer.readString();
    this.buffer.finishMessage();
    return status;
  }

  private _parseErrorMessage(): Error {
    const severity = this.buffer.readChar();
    const code = this.buffer.readUInt32();
    const message = this.buffer.readString();
    const attrs = this._parseHeaders();
    const errorType = resolveErrorCode(code);
    this.buffer.finishMessage();

    const err = new errorType(message);
    return err;
  }

  private _parseSyncMessage(): void {
    this._parseHeaders(); // TODO: Reject Headers
    const status = this.buffer.readChar();
    switch (status) {
      case chars.$I:
        this.serverXactStatus = TransactionStatus.TRANS_IDLE;
        break;
      case chars.$T:
        this.serverXactStatus = TransactionStatus.TRANS_INTRANS;
        break;
      case chars.$E:
        this.serverXactStatus = TransactionStatus.TRANS_INERROR;
        break;
      default:
        this.serverXactStatus = TransactionStatus.TRANS_UNKNOWN;
    }

    this.buffer.finishMessage();
  }

  private _parseDataMessages(codec: ICodec, result: Set | WriteBuffer): void {
    const frb = ReadBuffer.alloc();
    const $D = chars.$D;
    const buffer = this.buffer;

    if (Array.isArray(result)) {
      while (buffer.takeMessageType($D)) {
        buffer.consumeMessageInto(frb);
        frb.discard(6);
        result.push(codec.decode(frb));
        frb.finish();
      }
    } else {
      while (buffer.takeMessageType($D)) {
        const msg = buffer.consumeMessage();
        result.writeChar($D);
        result.writeInt32(msg.length + 4);
        result.writeBuffer(msg);
      }
    }
  }

  private _fallthrough(): void {
    const mtype = this.buffer.getMessageType();

    switch (mtype) {
      case chars.$S: {
        const name = this.buffer.readString();
        const value = this.buffer.readString();
        this.serverSettings.set(name, value);
        this.buffer.finishMessage();
        break;
      }

      case chars.$L: {
        const severity = this.buffer.readChar();
        const code = this.buffer.readUInt32();
        const message = this.buffer.readString();
        this._parseHeaders();
        this.buffer.finishMessage();

        /* tslint:disable */
        console.info("SERVER MESSAGE", severity, code, message);
        /* tslint:enable */

        break;
      }

      default:
        // TODO: terminate connection
        throw new Error(
          `unexpected message type ${mtype} ("${chars.chr(mtype)}")`
        );
    }
  }

  /** @internal */
  static async connectWithTimeout(
    addr: Address,
    config: NormalizedConnectConfig
  ): Promise<ConnectionImpl> {
    const sock = this.newSock(addr);
    const conn = new this(sock, {...config, addrs: [addr]});
    const connPromise = conn.connect();
    let timeoutCb = null;
    let timeoutHappened = false;
    // set-up a timeout
    if (config.connectTimeout) {
      timeoutCb = setTimeout(() => {
        if (!conn.connected) {
          timeoutHappened = true;
          conn.sock.destroy(
            new errors.ClientConnectionTimeoutError(
              `connection timed out (${config.connectTimeout}ms)`
            )
          );
        }
      }, config.connectTimeout);
    }

    try {
      await connPromise;
    } catch (e) {
      conn._abort();
      if (timeoutHappened && e instanceof errors.ClientConnectionClosedError) {
        /* A race between our timeout `timeoutCb` callback and the client
           being actually connected.  See the `ConnectionImpl._onClose` method.
        */
        throw new errors.ClientConnectionTimeoutError(
          `connection timed out (${config.connectTimeout}ms)`
        );
      }
      if (e instanceof errors.EdgeDBError) {
        throw e;
      } else {
        let err: errors.ClientConnectionError;
        switch (e.code) {
          case "ECONNREFUSED":
          case "ECONNABORTED":
          case "ECONNRESET":
          case "ENOTFOUND": // DNS name not found
          case "ENOENT": // unix socket is not created yet
            err = new errors.ClientConnectionFailedTemporarilyError(e.message);
            break;
          default:
            err = new errors.ClientConnectionFailedError(e.message);
            break;
        }
        err.source = e;
        throw err;
      }
    } finally {
      if (timeoutCb != null) {
        clearTimeout(timeoutCb);
      }
    }
    return conn;
  }

  private async connect(): Promise<void> {
    await this.connWaiter;

    const handshake = new WriteMessageBuffer();

    handshake
      .beginMessage(chars.$V)
      .writeInt16(PROTO_VER_MAJOR)
      .writeInt16(PROTO_VER_MINOR);

    handshake.writeInt16(2);
    handshake.writeString("user");
    handshake.writeString(this.config.user);
    handshake.writeString("database");
    handshake.writeString(this.config.database);

    // No extensions requested
    handshake.writeInt16(0);
    handshake.endMessage();

    this.sock.write(handshake.unwrap());

    while (true) {
      if (!this.buffer.takeMessage()) {
        await this._waitForMessage();
      }

      const mtype = this.buffer.getMessageType();

      switch (mtype) {
        case chars.$v: {
          const hi = this.buffer.readInt16();
          const lo = this.buffer.readInt16();
          this._parseHeaders();
          this.buffer.finishMessage();

          if (hi !== PROTO_VER_MAJOR || (hi === 0 && lo !== PROTO_VER_MINOR)) {
            throw new Error(
              `the server requested an unsupported version of ` +
                `the protocol ${hi}.${lo}`
            );
          }
          break;
        }

        case chars.$R: {
          const status = this.buffer.readInt32();

          if (status === AuthenticationStatuses.AUTH_OK) {
            this.buffer.finishMessage();
          } else if (status === AuthenticationStatuses.AUTH_SASL) {
            await this._authSasl();
          } else {
            throw new Error(
              `unsupported authentication method requested by the ` +
                `server: ${status}`
            );
          }

          break;
        }

        case chars.$K: {
          this.serverSecret = this.buffer.readBuffer(32);
          this.buffer.finishMessage();
          break;
        }

        case chars.$E: {
          throw this._parseErrorMessage();
        }

        case chars.$Z: {
          this._parseSyncMessage();
          this.connected = true;
          return;
        }

        default:
          this._fallthrough();
      }
    }
  }

  private async _authSasl(): Promise<void> {
    const numMethods = this.buffer.readInt32();
    if (numMethods <= 0) {
      throw new Error(
        "the server requested SASL authentication but did not offer any methods"
      );
    }

    const methods = [];
    let foundScram256 = false;
    for (let _ = 0; _ < numMethods; _++) {
      const method = this.buffer.readLenPrefixedBuffer().toString("utf8");
      if (method === "SCRAM-SHA-256") {
        foundScram256 = true;
      }
      methods.push(method);
    }

    this.buffer.finishMessage();

    if (!foundScram256) {
      throw new Error(
        `the server offered the following SASL authentication ` +
          `methods: ${methods.join(", ")}, neither are supported.`
      );
    }

    const clientNonce = await scram.generateNonce();
    const [clientFirst, clientFirstBare] = scram.buildClientFirstMessage(
      clientNonce,
      this.config.user
    );

    const wb = new WriteMessageBuffer();
    wb.beginMessage(chars.$p)
      .writeString("SCRAM-SHA-256")
      .writeString(clientFirst)
      .endMessage();
    this.sock.write(wb.unwrap());

    await this._ensureMessage(chars.$R, "SASLContinue");
    let status = this.buffer.readInt32();
    if (status !== AuthenticationStatuses.AUTH_SASL_CONTINUE) {
      throw new Error(
        `expected SASLContinue from the server, received ${status}`
      );
    }

    const serverFirst = this.buffer.readString();
    this.buffer.finishMessage();

    const [serverNonce, salt, itercount] = scram.parseServerFirstMessage(
      serverFirst
    );

    const [clientFinal, expectedServerSig] = scram.buildClientFinalMessage(
      this.config.password || "",
      salt,
      itercount,
      clientFirstBare,
      serverFirst,
      serverNonce
    );

    wb.reset()
      .beginMessage(chars.$r)
      .writeString(clientFinal)
      .endMessage();
    this.sock.write(wb.unwrap());

    await this._ensureMessage(chars.$R, "SASLFinal");
    status = this.buffer.readInt32();
    if (status !== AuthenticationStatuses.AUTH_SASL_FINAL) {
      throw new Error(
        `expected SASLFinal from the server, received ${status}`
      );
    }

    const serverFinal = this.buffer.readString();
    this.buffer.finishMessage();

    const serverSig = scram.parseServerFinalMessage(serverFinal);

    if (!serverSig.equals(expectedServerSig)) {
      throw new Error("server SCRAM proof does not match");
    }
  }

  private async _ensureMessage(
    expectedMtype: char,
    err: string
  ): Promise<void> {
    if (!this.buffer.takeMessage()) {
      await this._waitForMessage();
    }
    const mtype = this.buffer.getMessageType();

    switch (mtype) {
      case chars.$E: {
        throw this._parseErrorMessage();
      }

      case expectedMtype: {
        return;
      }

      default: {
        throw new Error(
          `expected ${err} from the server, received ${chars.chr(mtype)}`
        );
      }
    }
  }

  protected async _parse(
    query: string,
    asJson: boolean,
    expectOne: boolean,
    alwaysDescribe: boolean,
    options?: ParseOptions
  ): Promise<[number, ICodec, ICodec, Buffer | null, Buffer | null]> {
    const wb = new WriteMessageBuffer();

    wb.beginMessage(chars.$P)
      .writeHeaders(options?.headers ?? null)
      .writeChar(asJson ? chars.$j : chars.$b)
      .writeChar(expectOne ? chars.$o : chars.$m)
      .writeString("") // statement name
      .writeString(query)
      .endMessage();

    wb.writeSync();

    this.sock.write(wb.unwrap());

    let cardinality: number | void;
    let inTypeId: uuid | void;
    let outTypeId: uuid | void;
    let inCodec: ICodec | null;
    let outCodec: ICodec | null;
    let parsing = true;
    let error: Error | null = null;
    let inCodecData: Buffer | null = null;
    let outCodecData: Buffer | null = null;

    while (parsing) {
      if (!this.buffer.takeMessage()) {
        await this._waitForMessage();
      }

      const mtype = this.buffer.getMessageType();

      switch (mtype) {
        case chars.$1: {
          this._ignoreHeaders();
          cardinality = this.buffer.readChar();
          inTypeId = this.buffer.readUUID();
          outTypeId = this.buffer.readUUID();
          this.buffer.finishMessage();
          break;
        }

        case chars.$E: {
          error = this._parseErrorMessage();
          break;
        }

        case chars.$Z: {
          this._parseSyncMessage();
          parsing = false;
          break;
        }

        default:
          this._fallthrough();
      }
    }

    if (error != null) {
      throw error;
    }

    if (inTypeId == null || outTypeId == null) {
      throw new Error("did not receive in/out type ids in Parse response");
    }

    inCodec = this.codecsRegistry.getCodec(inTypeId);
    outCodec = this.codecsRegistry.getCodec(outTypeId);

    if (inCodec == null || outCodec == null || alwaysDescribe) {
      wb.reset();
      wb.beginMessage(chars.$D)
        .writeInt16(0) // no headers
        .writeChar(chars.$T)
        .writeString("") // statement name
        .endMessage()
        .writeSync();

      this.sock.write(wb.unwrap());

      parsing = true;
      while (parsing) {
        if (!this.buffer.takeMessage()) {
          await this._waitForMessage();
        }

        const mtype = this.buffer.getMessageType();

        switch (mtype) {
          case chars.$T: {
            try {
              [
                cardinality,
                inCodec,
                outCodec,
                inCodecData,
                outCodecData,
              ] = this._parseDescribeTypeMessage();
            } catch (e) {
              error = e;
            }
            break;
          }

          case chars.$E: {
            error = this._parseErrorMessage();
            break;
          }

          case chars.$Z: {
            this._parseSyncMessage();
            parsing = false;
            break;
          }

          default:
            this._fallthrough();
        }
      }

      if (error != null) {
        throw error;
      }
    }

    if (cardinality == null || outCodec == null || inCodec == null) {
      throw new Error(
        "failed to receive type information in response to a Parse message"
      );
    }

    return [cardinality, inCodec, outCodec, inCodecData, outCodecData];
  }

  private _encodeArgs(args: QueryArgs, inCodec: ICodec): Buffer {
    if (inCodec === EMPTY_TUPLE_CODEC && !args) {
      return EmptyTupleCodec.BUFFER;
    }

    if (inCodec instanceof NamedTupleCodec || inCodec instanceof TupleCodec) {
      return inCodec.encodeArgs(args);
    }

    // Shouldn't ever happen.
    throw new Error("invalid input codec");
  }

  protected async _executeFlow(
    args: QueryArgs,
    inCodec: ICodec,
    outCodec: ICodec,
    result: Set | WriteBuffer
  ): Promise<void> {
    const wb = new WriteMessageBuffer();
    wb.beginMessage(chars.$E)
      .writeInt16(0) // no headers
      .writeString("") // statement name
      .writeBuffer(this._encodeArgs(args, inCodec))
      .endMessage()
      .writeSync();

    this.sock.write(wb.unwrap());

    let parsing = true;
    let error: Error | null = null;

    while (parsing) {
      if (!this.buffer.takeMessage()) {
        await this._waitForMessage();
      }

      const mtype = this.buffer.getMessageType();

      switch (mtype) {
        case chars.$D: {
          if (error == null) {
            try {
              this._parseDataMessages(outCodec, result);
            } catch (e) {
              error = e;
              this.buffer.finishMessage();
            }
          } else {
            this.buffer.discardMessage();
          }
          break;
        }

        case chars.$C: {
          this.lastStatus = this._parseCommandCompleteMessage();
          break;
        }

        case chars.$E: {
          error = this._parseErrorMessage();
          break;
        }

        case chars.$Z: {
          this._parseSyncMessage();
          parsing = false;
          break;
        }

        default:
          this._fallthrough();
      }
    }

    if (error != null) {
      throw error;
    }
  }

  private async _optimisticExecuteFlow(
    args: QueryArgs,
    asJson: boolean,
    expectOne: boolean,
    inCodec: ICodec,
    outCodec: ICodec,
    query: string,
    result: Set
  ): Promise<void> {
    const wb = new WriteMessageBuffer();
    wb.beginMessage(chars.$O);
    wb.writeInt16(0); // no headers
    wb.writeChar(asJson ? chars.$j : chars.$b);
    wb.writeChar(expectOne ? chars.$o : chars.$m);
    wb.writeString(query);
    wb.writeBuffer(inCodec.tidBuffer);
    wb.writeBuffer(outCodec.tidBuffer);
    wb.writeBuffer(this._encodeArgs(args, inCodec));
    wb.endMessage();
    wb.writeSync();

    this.sock.write(wb.unwrap());

    let reExec = false;
    let error: Error | null = null;
    let parsing = true;
    let newCard: char | null = null;

    while (parsing) {
      if (!this.buffer.takeMessage()) {
        await this._waitForMessage();
      }

      const mtype = this.buffer.getMessageType();

      switch (mtype) {
        case chars.$D: {
          if (error == null) {
            try {
              this._parseDataMessages(outCodec, result);
            } catch (e) {
              error = e;
              this.buffer.finishMessage();
            }
          } else {
            this.buffer.discardMessage();
          }
          break;
        }

        case chars.$C: {
          this.lastStatus = this._parseCommandCompleteMessage();
          break;
        }

        case chars.$Z: {
          this._parseSyncMessage();
          parsing = false;
          break;
        }

        case chars.$T: {
          try {
            [newCard, inCodec, outCodec] = this._parseDescribeTypeMessage();
            const key = this._getQueryCacheKey(query, asJson, expectOne);
            this.queryCodecCache.set(key, [newCard, inCodec, outCodec]);
            reExec = true;
          } catch (e) {
            error = e;
          }
          break;
        }

        case chars.$E: {
          error = this._parseErrorMessage();
          break;
        }

        default:
          this._fallthrough();
      }
    }

    if (error != null) {
      throw error;
    }

    if (reExec) {
      this._validateFetchCardinality(newCard!, asJson, expectOne);
      return await this._executeFlow(args, inCodec, outCodec, result);
    }
  }

  private _getQueryCacheKey(
    query: string,
    asJson: boolean,
    expectOne: boolean
  ): string {
    return [asJson, expectOne, query.length, query].join(";");
  }

  private _validateFetchCardinality(
    card: char,
    asJson: boolean,
    expectOne: boolean
  ): void {
    if (expectOne && card === chars.$n) {
      const methname = asJson ? "queryOneJSON" : "queryOne";
      throw new Error(`query executed via ${methname}() returned no data`);
    }
  }

  private async _fetch(
    query: string,
    args: QueryArgs,
    asJson: boolean,
    expectOne: boolean
  ): Promise<any> {
    const key = this._getQueryCacheKey(query, asJson, expectOne);
    const ret = new Set();

    if (this.queryCodecCache.has(key)) {
      const [card, inCodec, outCodec] = this.queryCodecCache.get(key)!;
      this._validateFetchCardinality(card, asJson, expectOne);
      await this._optimisticExecuteFlow(
        args,
        asJson,
        expectOne,
        inCodec,
        outCodec,
        query,
        ret
      );
    } else {
      const [card, inCodec, outCodec] = await this._parse(
        query,
        asJson,
        expectOne,
        false
      );
      this._validateFetchCardinality(card, asJson, expectOne);
      this.queryCodecCache.set(key, [card, inCodec, outCodec]);
      await this._executeFlow(args, inCodec, outCodec, ret);
    }

    if (expectOne) {
      if (ret && ret.length) {
        return ret[0];
      } else {
        throw new Error("query returned no data");
      }
    } else {
      if (ret && ret.length) {
        if (asJson) {
          return ret[0];
        } else {
          return ret;
        }
      } else {
        if (asJson) {
          return "[]";
        } else {
          return ret;
        }
      }
    }
  }

  private async _execute(query: string): Promise<void> {
    const wb = new WriteMessageBuffer();
    wb.beginMessage(chars.$Q)
      .writeInt16(1) // headers
      .writeUInt16(ALLOW_CAPABILITIES)
      .writeBytes(EXECUTE_CAPABILITIES_BYTES)
      .writeString(query) // statement name
      .endMessage();

    this.sock.write(wb.unwrap());

    let error: Error | null = null;
    let parsing = true;

    while (parsing) {
      if (!this.buffer.takeMessage()) {
        await this._waitForMessage();
      }

      const mtype = this.buffer.getMessageType();

      switch (mtype) {
        case chars.$C: {
          this.lastStatus = this._parseCommandCompleteMessage();
          break;
        }

        case chars.$Z: {
          this._parseSyncMessage();
          parsing = false;
          break;
        }

        case chars.$E: {
          error = this._parseErrorMessage();
          break;
        }

        default:
          this._fallthrough();
      }
    }

    if (error != null) {
      throw error;
    }
  }

  private _enterOp(): void {
    if (this.opInProgress) {
      throw new Error(
        "Another operation is in progress. Use multiple separate " +
          "connections to run operations concurrently."
      );
    }
    this.opInProgress = true;
  }

  private _leaveOp(): void {
    this.opInProgress = false;
  }

  async execute(query: string): Promise<void> {
    this._enterOp();
    try {
      await this._execute(query);
    } finally {
      this._leaveOp();
    }
  }

  async query(query: string, args: QueryArgs = null): Promise<Set> {
    this._enterOp();
    try {
      return await this._fetch(query, args, false, false);
    } finally {
      this._leaveOp();
    }
  }

  async queryOne(query: string, args: QueryArgs = null): Promise<any> {
    this._enterOp();
    try {
      return await this._fetch(query, args, false, true);
    } finally {
      this._leaveOp();
    }
  }

  async queryJSON(query: string, args: QueryArgs = null): Promise<string> {
    this._enterOp();
    try {
      return await this._fetch(query, args, true, false);
    } finally {
      this._leaveOp();
    }
  }

  async queryOneJSON(query: string, args: QueryArgs = null): Promise<string> {
    this._enterOp();
    try {
      return await this._fetch(query, args, true, true);
    } finally {
      this._leaveOp();
    }
  }

  async transaction<T>(
    action: () => Promise<T>,
    options?: TransactionOptions
  ): Promise<T> {
    let result: T;
    const transaction = new LegacyTransaction(this, options);
    await transaction.start();
    try {
      result = await action();
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
    return result;
  }

  private _abort(): void {
    if (this.sock && this.connected) {
      this.sock.destroy();
    }
    this.connected = false;
  }

  isClosed(): boolean {
    return !this.connected;
  }

  async close(): Promise<void> {
    this._enterOp();
    try {
      if (this.sock && this.connected) {
        this.sock.write(
          new WriteMessageBuffer()
            .beginMessage(chars.$X)
            .endMessage()
            .unwrap()
        );
      }
      this._abort();
    } finally {
      this._leaveOp();
    }
  }

  /** @internal */
  private static newSock(addr: string | [string, number]): net.Socket {
    if (typeof addr === "string") {
      // unix socket
      return net.createConnection(addr);
    } else {
      const [host, port] = addr;
      return net.createConnection(port, host);
    }
  }
}

export class RawConnection extends ConnectionImpl {
  // Note that this class, while exported, is not documented.
  // Its API is subject to change.

  public async rawParse(
    query: string,
    headers?: PrepareMessageHeaders
  ): Promise<[Buffer, Buffer]> {
    const result = await this._parse(query, false, false, true, {headers});
    return [result[3]!, result[4]!];
  }

  public async rawExecute(): Promise<Buffer> {
    // TODO: the method needs to be extended to accept
    // already encoded arguments.

    const result = new WriteBuffer();
    await this._executeFlow(
      null, // arguments
      EMPTY_TUPLE_CODEC, // inCodec -- to encode lack of arguments.
      EMPTY_TUPLE_CODEC, // outCodec -- does not matter, it will not be used.
      result
    );
    return result.unwrap();
  }

  // Mask the actual connection API; only the raw* methods should
  // be used with this class.

  async transaction<T>(
    action: () => Promise<T>,
    options?: TransactionOptions
  ): Promise<T> {
    throw new Error("not implemented");
  }

  async execute(query: string): Promise<void> {
    throw new Error("not implemented");
  }

  async query(query: string, args: QueryArgs = null): Promise<Set> {
    throw new Error("not implemented");
  }

  async queryOne(query: string, args: QueryArgs = null): Promise<any> {
    throw new Error("not implemented");
  }

  async queryJSON(query: string, args: QueryArgs = null): Promise<string> {
    throw new Error("not implemented");
  }

  async queryOneJSON(query: string, args: QueryArgs = null): Promise<string> {
    throw new Error("not implemented");
  }
}
