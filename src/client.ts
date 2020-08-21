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
import {ReadMessageBuffer, WriteMessageBuffer, ReadBuffer} from "./buffer";
import {CodecsRegistry} from "./codecs/registry";
import {ICodec, uuid} from "./codecs/ifaces";
import {Set} from "./datatypes/set";
import LRU from "./lru";
import {EMPTY_TUPLE_CODEC, EmptyTupleCodec, TupleCodec} from "./codecs/tuple";
import {NamedTupleCodec} from "./codecs/namedtuple";
import {
  QueryArgs,
  Connection,
  IConnectionProxied,
  onConnectionClose,
} from "./ifaces";
import * as scram from "./scram";

import {
  parseConnectArguments,
  ConnectConfig,
  NormalizedConnectConfig,
} from "./con_utils";

const PROTO_VER_MAJOR = 0;
const PROTO_VER_MINOR = 8;

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

/* Internal mapping used to break strong reference between
 * connections and their pool proxies.
 */
export const proxyMap = new WeakMap<Connection, IConnectionProxied>();

export default function connect(
  dsn?: string,
  options?: ConnectConfig | null
): Promise<Connection> {
  return ConnectionImpl.connect({...options, dsn});
}

class ConnectionImpl implements Connection {
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
  private constructor(sock: net.Socket, config: NormalizedConnectConfig) {
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

  private _onClose(): void {
    this.close();
  }

  private _onError(err: Error): void {
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

  private _rejectHeaders(): void {
    const nheaders = this.buffer.readInt16();
    if (nheaders) {
      throw new Error("unexpected headers");
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

  private _parseDescribeTypeMessage(): [number, ICodec, ICodec] {
    this._rejectHeaders();

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

    return [cardinality, inCodec, outCodec];
  }

  private _parseCommandCompleteMessage(): string {
    this._rejectHeaders();
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

  private _parseDataMessages(codec: ICodec, result: Set): void {
    const frb = ReadBuffer.alloc();
    const $D = chars.$D;
    const buffer = this.buffer;

    while (buffer.takeMessageType($D)) {
      buffer.consumeMessageInto(frb);
      frb.discard(6);
      result.push(codec.decode(frb));
      frb.finish();
    }

    // @ts-ignore
    if (this._propagateCodec) {
      // @ts-ignore
      result._codec = codec;
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

  private async connect(): Promise<void> {
    await this.connWaiter;

    const handshake = new WriteMessageBuffer();

    handshake
      .beginMessage(chars.$V)
      .writeInt16(1)
      .writeInt16(0);

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

  private async _parse(
    query: string,
    asJson: boolean,
    expectOne: boolean
  ): Promise<[number, ICodec, ICodec]> {
    const wb = new WriteMessageBuffer();

    wb.beginMessage(chars.$P)
      .writeInt16(0) // no headers
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

    while (parsing) {
      if (!this.buffer.takeMessage()) {
        await this._waitForMessage();
      }

      const mtype = this.buffer.getMessageType();

      switch (mtype) {
        case chars.$1: {
          this._rejectHeaders();
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

    if (inCodec == null || outCodec == null) {
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

    return [cardinality, inCodec, outCodec];
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

  private async _executeFlow(
    args: QueryArgs,
    inCodec: ICodec,
    outCodec: ICodec
  ): Promise<any[]> {
    const wb = new WriteMessageBuffer();
    wb.beginMessage(chars.$E)
      .writeInt16(0) // no headers
      .writeString("") // statement name
      .writeBuffer(this._encodeArgs(args, inCodec))
      .endMessage()
      .writeSync();

    this.sock.write(wb.unwrap());

    const result = new Set();
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

    return result;
  }

  private async _optimisticExecuteFlow(
    args: QueryArgs,
    asJson: boolean,
    expectOne: boolean,
    inCodec: ICodec,
    outCodec: ICodec,
    query: string
  ): Promise<any> {
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

    const result = new Set();
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
      return await this._executeFlow(args, inCodec, outCodec);
    }

    return result;
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
    let ret;

    if (this.queryCodecCache.has(key)) {
      const [card, inCodec, outCodec] = this.queryCodecCache.get(key)!;
      this._validateFetchCardinality(card, asJson, expectOne);
      ret = await this._optimisticExecuteFlow(
        args,
        asJson,
        expectOne,
        inCodec,
        outCodec,
        query
      );
    } else {
      const [card, inCodec, outCodec] = await this._parse(
        query,
        asJson,
        expectOne
      );
      this._validateFetchCardinality(card, asJson, expectOne);
      this.queryCodecCache.set(key, [card, inCodec, outCodec]);
      ret = await this._executeFlow(args, inCodec, outCodec);
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
      .writeInt16(0) // no headers
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

  /** @internal */
  static async connect(
    config?: ConnectConfig | null
  ): Promise<ConnectionImpl> {
    config = config || {};

    const {addrs, ...cfg} = parseConnectArguments(config);
    let err: Error | undefined;
    let errMsg: string = "failed to connect";

    for (const addr of addrs) {
      errMsg =
        "failed to connect: could not establish connection to " +
        (typeof addr === "string" ? addr : addr[0] + ":" + addr[1]);
      const sock = this.newSock(addr);
      const conn = new this(sock, {addrs: [addr], ...cfg});

      const connPromise = conn.connect();
      let timeout = null;
      // set-up a timeout
      if (cfg.connect_timeout) {
        err = new Error(errMsg + " in " + cfg.connect_timeout + "ms");
        timeout = setTimeout(() => {
          if (!conn.connected) {
            conn.sock.destroy(err);
          }
        }, cfg.connect_timeout);
      }

      try {
        await connPromise;
      } catch (e) {
        conn._abort();

        // on timeout Error proceed to the next address, otherwise re-throw
        if (
          typeof e.message === "string" &&
          e.message.indexOf("failed to connect") !== -1
        ) {
          continue;
        } else {
          throw e;
        }
      } finally {
        if (timeout != null) {
          clearTimeout(timeout);
        }
      }

      return conn; // break the connection try loop
    }

    // throw a generic or specific connection error
    if (typeof err === "undefined") {
      err = new Error(errMsg);
    }
    throw err;
  }
}
