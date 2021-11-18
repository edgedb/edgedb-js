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

import {net, tls} from "./adapter.node";

import char, * as chars from "./primitives/chars";
import {resolveErrorCode} from "./errors/resolve";
import * as errors from "./errors";
import {
  ReadMessageBuffer,
  WriteMessageBuffer,
  ReadBuffer,
  WriteBuffer,
} from "./primitives/buffer";
import {versionGreaterThan, versionGreaterThanOrEqual} from "./utils";
import {CodecsRegistry} from "./codecs/registry";
import {ICodec, uuid} from "./codecs/ifaces";
import {Set} from "./datatypes/set";
import LRU from "./primitives/lru";
import {EMPTY_TUPLE_CODEC, EmptyTupleCodec, TupleCodec} from "./codecs/tuple";
import {NamedTupleCodec} from "./codecs/namedtuple";
import {ObjectCodec} from "./codecs/object";
import {NULL_CODEC, NullCodec} from "./codecs/codecs";
import {
  QueryArgs,
  ParseOptions,
  ProtocolVersion,
  ServerSettings,
} from "./ifaces";
import * as scram from "./scram";
import {Address, NormalizedConnectConfig} from "./conUtils";

const PROTO_VER: ProtocolVersion = [0, 13];
const PROTO_VER_MIN: ProtocolVersion = [0, 9];

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

enum Capabilities {
  MODIFICATONS = 0b00001, // query is not read-only
  SESSION_CONFIG = 0b00010, // query contains session config change
  TRANSACTION = 0b00100, // query contains start/commit/rollback of
  // transaction or savepoint manipulation
  DDL = 0b01000, // query contains DDL
  PERSISTENT_CONFIG = 0b10000, // server or database config change
}

const NO_TRANSACTION_CAPABILITIES_BYTES = Buffer.from([
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255 & ~Capabilities.TRANSACTION & ~Capabilities.SESSION_CONFIG,
]);

const OLD_ERROR_CODES = new Map([
  [0x05_03_00_01, 0x05_03_01_01], // TransactionSerializationError #2431
  [0x05_03_00_02, 0x05_03_01_02], // TransactionDeadlockError      #2431
]);

export class RawConnection {
  private sock: net.Socket;
  private config: NormalizedConnectConfig;
  private paused: boolean;
  private connected: boolean = false;

  private lastStatus: string | null;

  private codecsRegistry: CodecsRegistry;
  private queryCodecCache: LRU<string, [number, ICodec, ICodec]>;

  private serverSecret: Buffer | null;
  /** @internal */ serverSettings: ServerSettings;
  private serverXactStatus: TransactionStatus;

  private buffer: ReadMessageBuffer;

  private messageWaiterResolve: ((value: any) => void) | null;
  private messageWaiterReject: ((error: Error) => void) | null;

  private connWaiter: Promise<void>;
  private connWaiterResolve: ((value: any) => void) | null;
  private connWaiterReject: ((value: any) => void) | null;

  protocolVersion: ProtocolVersion = PROTO_VER;

  private _abortedWith: Error | null = null;

  /** @internal */
  protected constructor(
    sock: net.Socket,
    config: NormalizedConnectConfig,
    registry: CodecsRegistry
  ) {
    this.buffer = new ReadMessageBuffer();

    this.codecsRegistry = registry;
    this.queryCodecCache = new LRU({capacity: 1000});

    this.lastStatus = null;

    this.serverSecret = null;
    this.serverSettings = {};
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

    if (this.sock instanceof tls.TLSSocket) {
      // This is bizarre, but "connect" can be fired before
      // "secureConnect" for some reason. The documentation
      // doesn't provide a clue why. We need to be able to validate
      // that the 'edgedb-binary' ALPN protocol was selected
      // in connect when we're connecting over TLS.
      // @ts-ignore
      this.sock.on("secureConnect", this._onConnect.bind(this));
    } else {
      this.sock.on("connect", this._onConnect.bind(this));
    }
    this.sock.on("close", this._onClose.bind(this));

    this.config = config;
  }

  private async _waitForMessage(): Promise<void> {
    if (this.buffer.takeMessage()) {
      return;
    }

    if (this.paused) {
      this.paused = false;
      this.sock.resume();
    }

    this.sock.ref();
    try {
      await new Promise<void>((resolve, reject) => {
        this.messageWaiterResolve = resolve;
        this.messageWaiterReject = reject;
      });
    } finally {
      this.sock.unref();
    }
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
    if (!this.connected) {
      return;
    }

    const newErr = new errors.ClientConnectionClosedError(
      `the connection has been aborted`
    );

    if (this.connWaiterReject || this.messageWaiterReject) {
      /* This can happen, particularly, during the connect phase.
         If the connection is aborted with a client-side timeout, there can be
         a situation where the connection has actually been established,
         and so `conn.sock.destroy` would simply close the socket,
         without invoking the 'error' event.
      */
      this._abortWaiters(newErr);
    }

    this._abortWithError(newErr);
  }

  private _onError(err: Error): void {
    const newErr = new errors.ClientConnectionClosedError(
      `network error: ${err}`
    );
    newErr.source = err;

    try {
      this._abortWaiters(newErr);
    } finally {
      // We cannot recover this raw connection from a socket error.
      // Just abort it and let the higher-level API reconnect.
      this._abortWithError(newErr);
    }
  }

  private _abortWithError(err: Error): void {
    this._abortedWith = err;
    this._abort();
  }

  private _checkState(): void {
    if (this._abortedWith != null) {
      throw this._abortedWith;
    }
  }

  private _onData(data: Buffer): void {
    let pause = false;
    try {
      pause = this.buffer.feed(data);
    } catch (e: any) {
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
      inCodec = this.codecsRegistry.buildCodec(
        inTypeData,
        this.protocolVersion
      );
    }

    let outCodec = this.codecsRegistry.getCodec(outTypeId);
    if (outCodec == null) {
      outCodec = this.codecsRegistry.buildCodec(
        outTypeData,
        this.protocolVersion
      );
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
    const errorType = resolveErrorCode(OLD_ERROR_CODES.get(code) ?? code);
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

  private _parseServerSettings(name: string, value: Buffer): void {
    switch (name) {
      case "suggested_pool_concurrency":
        this.serverSettings.suggested_pool_concurrency = parseInt(
          value.toString("utf8"),
          10
        );
        break;
      case "system_config":
        const buf = new ReadBuffer(value);
        const typedescLen = buf.readInt32() - 16;
        const typedescId = buf.readUUID();
        const typedesc = buf.readBuffer(typedescLen);

        let codec = this.codecsRegistry.getCodec(typedescId);
        if (codec === null) {
          codec = this.codecsRegistry.buildCodec(
            typedesc,
            this.protocolVersion
          );
        }

        buf.discard(4); // discard data length int32
        const data = codec.decode(buf);
        buf.finish();

        this.serverSettings.system_config = data;
        break;
      default:
        this.serverSettings[name] = value;
        break;
    }
  }

  private _fallthrough(): void {
    const mtype = this.buffer.getMessageType();

    switch (mtype) {
      case chars.$S: {
        const name = this.buffer.readString();
        const value = this.buffer.readLenPrefixedBuffer();
        this._parseServerSettings(name, value);
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
    config: NormalizedConnectConfig,
    registry: CodecsRegistry,
    useTls: boolean = true
  ): Promise<RawConnection> {
    const sock = this.newSock(
      addr,
      useTls ? config.connectionParams.tlsOptions : undefined
    );
    const conn = new this(sock, config, registry);
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
    } catch (e: any) {
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
          case "EPROTO":
            if (useTls === true) {
              // connecting over tls failed
              // try to connect using clear text
              try {
                return this.connectWithTimeout(addr, config, registry, false);
              } catch {
                // pass
              }
            }

            err = new errors.ClientConnectionFailedError(
              `${e.message}\n` +
                `Attempted to connect using the following credentials:\n` +
                `${config.connectionParams.explainConfig()}\n`
            );
            break;
          case "ECONNREFUSED":
          case "ECONNABORTED":
          case "ECONNRESET":
          case "ENOTFOUND": // DNS name not found
          case "ENOENT": // unix socket is not created yet
            err = new errors.ClientConnectionFailedTemporarilyError(
              `${e.message}\n` +
                `Attempted to connect using the following credentials:\n` +
                `${config.connectionParams.explainConfig()}\n`
            );
            break;
          default:
            err = new errors.ClientConnectionFailedError(
              `${e.message}\n` +
                `Attempted to connect using the following credentials:\n` +
                `${config.connectionParams.explainConfig()}\n`
            );
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

    if (this.sock instanceof tls.TLSSocket) {
      if (this.sock.alpnProtocol !== "edgedb-binary") {
        throw new errors.ClientConnectionFailedError(
          "The server doesn't support the edgedb-binary protocol."
        );
      }
    }

    const handshake = new WriteMessageBuffer();

    handshake
      .beginMessage(chars.$V)
      .writeInt16(this.protocolVersion[0])
      .writeInt16(this.protocolVersion[1]);

    handshake.writeInt16(2);
    handshake.writeString("user");
    handshake.writeString(this.config.connectionParams.user);
    handshake.writeString("database");
    handshake.writeString(this.config.connectionParams.database);

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
          const proposed: ProtocolVersion = [hi, lo];

          if (
            versionGreaterThan(proposed, PROTO_VER) ||
            versionGreaterThan(PROTO_VER_MIN, proposed)
          ) {
            throw new Error(
              `the server requested an unsupported version of ` +
                `the protocol ${hi}.${lo}`
            );
          }

          this.protocolVersion = [hi, lo];
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

          if (
            !(this.sock instanceof tls.TLSSocket) &&
            // @ts-ignore
            typeof Deno === "undefined" &&
            versionGreaterThanOrEqual(this.protocolVersion, [0, 11])
          ) {
            const [major, minor] = this.protocolVersion;
            throw new Error(
              `the protocol version requires TLS: ${major}.${minor}`
            );
          }

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
      this.config.connectionParams.user
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

    const [serverNonce, salt, itercount] =
      scram.parseServerFirstMessage(serverFirst);

    const [clientFinal, expectedServerSig] = scram.buildClientFinalMessage(
      this.config.connectionParams.password || "",
      salt,
      itercount,
      clientFirstBare,
      serverFirst,
      serverNonce
    );

    wb.reset().beginMessage(chars.$r).writeString(clientFinal).endMessage();
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

  async _parse(
    query: string,
    asJson: boolean,
    expectOne: boolean,
    alwaysDescribe: boolean,
    options?: ParseOptions
  ): Promise<[number, ICodec, ICodec, Buffer | null, Buffer | null]> {
    const wb = new WriteMessageBuffer();

    wb.beginMessage(chars.$P)
      .writeHeaders({
        ...(options?.headers ?? {}),
        allowCapabilities: NO_TRANSACTION_CAPABILITIES_BYTES,
      })
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
              [cardinality, inCodec, outCodec, inCodecData, outCodecData] =
                this._parseDescribeTypeMessage();
            } catch (e: any) {
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
    if (versionGreaterThanOrEqual(this.protocolVersion, [0, 12])) {
      if (inCodec === NULL_CODEC && !args) {
        return NullCodec.BUFFER;
      }

      if (inCodec instanceof ObjectCodec) {
        return inCodec.encodeArgs(args);
      }

      // Shouldn't ever happen.
      throw new Error("invalid input codec");
    } else {
      if (inCodec === EMPTY_TUPLE_CODEC && !args) {
        return EmptyTupleCodec.BUFFER;
      }

      if (
        inCodec instanceof NamedTupleCodec ||
        inCodec instanceof TupleCodec
      ) {
        return inCodec.encodeArgs(args);
      }

      // Shouldn't ever happen.
      throw new Error("invalid input codec");
    }
  }

  async _executeFlow(
    args: QueryArgs | Buffer,
    inCodec: ICodec,
    outCodec: ICodec,
    result: Set | WriteBuffer
  ): Promise<void> {
    const wb = new WriteMessageBuffer();
    wb.beginMessage(chars.$E)
      .writeHeaders({allowCapabilities: NO_TRANSACTION_CAPABILITIES_BYTES})
      .writeString("") // statement name
      .writeBuffer(
        args instanceof Buffer ? args : this._encodeArgs(args, inCodec)
      )
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
            } catch (e: any) {
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
    requiredOne: boolean,
    inCodec: ICodec,
    outCodec: ICodec,
    query: string,
    result: Set
  ): Promise<void> {
    const wb = new WriteMessageBuffer();
    wb.beginMessage(chars.$O);
    wb.writeHeaders({allowCapabilities: NO_TRANSACTION_CAPABILITIES_BYTES});
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
            } catch (e: any) {
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
          } catch (e: any) {
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
      this._validateFetchCardinality(newCard!, asJson, requiredOne);
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
    requiredOne: boolean
  ): void {
    if (requiredOne && card === chars.$n) {
      throw new errors.NoDataError(
        `query executed via queryRequiredSingle${
          asJson ? "JSON" : ""
        }() returned no data`
      );
    }
  }

  async fetch(
    query: string,
    args: QueryArgs = null,
    asJson: boolean,
    expectOne: boolean,
    requiredOne: boolean = false
  ): Promise<any> {
    this._checkState();

    const key = this._getQueryCacheKey(query, asJson, expectOne);
    const ret = new Set();

    if (this.queryCodecCache.has(key)) {
      const [card, inCodec, outCodec] = this.queryCodecCache.get(key)!;
      this._validateFetchCardinality(card, asJson, requiredOne);
      await this._optimisticExecuteFlow(
        args,
        asJson,
        expectOne,
        requiredOne,
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
      this._validateFetchCardinality(card, asJson, requiredOne);
      this.queryCodecCache.set(key, [card, inCodec, outCodec]);
      await this._executeFlow(args, inCodec, outCodec, ret);
    }

    if (expectOne) {
      if (requiredOne && !ret.length) {
        throw new errors.NoDataError("query returned no data");
      } else {
        return ret[0] ?? (asJson ? "null" : null);
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

  async execute(
    query: string,
    allowTransactionCommands: boolean = false
  ): Promise<void> {
    this._checkState();

    const wb = new WriteMessageBuffer();
    wb.beginMessage(chars.$Q)
      .writeHeaders({
        allowCapabilities: !allowTransactionCommands
          ? NO_TRANSACTION_CAPABILITIES_BYTES
          : undefined,
      })
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

  async resetState(): Promise<void> {
    if (this.serverXactStatus !== TransactionStatus.TRANS_IDLE) {
      try {
        await this.fetch(`rollback`, null, false, false);
      } catch {
        this.close();
      }
    }
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
    if (this.sock && this.connected) {
      this.sock.write(
        new WriteMessageBuffer().beginMessage(chars.$X).endMessage().unwrap()
      );
    }
    this._abort();
  }

  /** @internal */
  private static newSock(
    addr: string | [string, number],
    options?: tls.ConnectionOptions
  ): net.Socket {
    if (typeof addr === "string") {
      // unix socket
      return net.createConnection(addr);
    }

    const [host, port] = addr;
    if (options == null) {
      return net.createConnection(port, host);
    }

    const opts = {...options, host, port};
    return tls.connect(opts);
  }
}
