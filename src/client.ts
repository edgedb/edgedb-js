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

import * as chars from "./chars";
import {ReadMessageBuffer, WriteMessageBuffer, ReadBuffer} from "./buffer";
import {CodecsRegistry} from "./codecs/registry";
import {ICodec, uuid} from "./codecs/ifaces";
import {Set} from "./datatypes/set";
import LRU from "./lru";
import {EMPTY_TUPLE_CODEC, EmptyTupleCodec, TupleCodec} from "./codecs/tuple";
import {NamedTupleCodec} from "./codecs/namedtuple";
import {UUID} from "./datatypes/uuid";
import {
  LocalDateTime,
  LocalDate,
  LocalTime,
  Duration,
} from "./datatypes/datetime";

type QueryArgPrimitive =
  | number
  | string
  | boolean
  | Buffer
  | Date
  | LocalDateTime
  | LocalDate
  | LocalTime
  | Duration
  | UUID;
type QueryArg = QueryArgPrimitive | QueryArgPrimitive[] | null;
type QueryArgs = {[_: string]: QueryArg} | QueryArg[] | null;

export interface ConnectConfig {
  port?: number;
  host?: string;
  user?: string;
  database?: string;
}

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

export type NodeCallback<T = any> = (
  err: Error | null,
  data: T | null
) => void;

export default function connect(
  options?: ConnectConfig | null
): Promise<AwaitConnection>;
export default function connect(
  options?: ConnectConfig | null,
  callback?: NodeCallback<Connection> | null
): void;
export default function connect(
  options?: ConnectConfig | null,
  callback?: NodeCallback<Connection> | null
): Promise<AwaitConnection> | void {
  if (callback) {
    AwaitConnection.connect(options)
      .then((conn) => {
        callback(null, Connection.wrap(conn));
      })
      .catch((error) => {
        callback(<Error>error, null);
      });
  } else {
    return AwaitConnection.connect(options);
  }
}

class AwaitConnection {
  private sock: net.Socket;
  private config: ConnectConfig;
  private paused: boolean;

  private lastStatus: string | null;

  private codecsRegistry: CodecsRegistry;
  private queryCodecCache: LRU<string, [number, ICodec, ICodec]>;

  private serverSecret: number;
  private serverSettings: Map<string, string>;
  private serverXactStatus: TransactionStatus;

  private buffer: ReadMessageBuffer;

  private messageWaiterResolve: ((value: any) => void) | null;
  private messageWaiterReject: ((error: Error) => void) | null;

  private connWaiter: Promise<void>;
  private connWaiterResolve: ((value: any) => void) | null;
  private connWaiterReject: ((value: any) => void) | null;

  private constructor(sock: net.Socket, config: ConnectConfig) {
    this.buffer = new ReadMessageBuffer();

    this.codecsRegistry = new CodecsRegistry();
    this.queryCodecCache = new LRU({capacity: 1000});

    this.lastStatus = null;

    this.serverSecret = -1;
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

    const cardinality = this.buffer.readChar();

    const inTypeId = this.buffer.readUUID();
    const inTypeData = this.buffer.readLenPrefixedBuffer();
    let inCodec = this.codecsRegistry.getCodec(inTypeId);
    if (inCodec == null) {
      inCodec = this.codecsRegistry.buildCodec(inTypeData);
    }

    const outTypeId = this.buffer.readUUID();
    const outTypeData = this.buffer.readLenPrefixedBuffer();
    let outCodec = this.codecsRegistry.getCodec(outTypeId);
    if (outCodec == null) {
      outCodec = this.codecsRegistry.buildCodec(outTypeData);
    }

    this.buffer.finishMessage();

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
    this.buffer.finishMessage();

    const err = new Error(message);
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

    const wb = new WriteMessageBuffer();

    wb.beginMessage(chars.$V)
      .writeInt16(1)
      .writeInt16(0)
      .writeInt16(0)
      .endMessage();

    wb.beginMessage(chars.$0)
      .writeString(this.config.user || "edgedb") // TODO
      .writeString(this.config.database || "edgedb")
      .endMessage();

    this.sock.write(wb.unwrap());

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

          if (hi !== 1 || lo !== 0) {
            throw new Error(
              `the server requested an unsupported version of ` +
                `the protocol ${hi}.${lo}`
            );
          }
          break;
        }

        case chars.$Y: {
          this.buffer.discardMessage();
          break;
        }

        case chars.$R: {
          const status = this.buffer.readInt32();

          if (status === AuthenticationStatuses.AUTH_OK) {
            this.buffer.finishMessage();
          }

          if (status !== AuthenticationStatuses.AUTH_OK) {
            // TODO: Abort the connection
            throw new Error(
              `unsupported authentication method requested by the ` +
                `server: ${status}`
            );
          }

          break;
        }

        case chars.$K: {
          this.serverSecret = this.buffer.readInt32();
          this.buffer.finishMessage();
          break;
        }

        case chars.$E: {
          throw this._parseErrorMessage();
        }

        case chars.$Z: {
          this._parseSyncMessage();
          return;
        }

        default:
          this._fallthrough();
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
            [
              cardinality,
              inCodec,
              outCodec,
            ] = this._parseDescribeTypeMessage();
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

  private async _execute(
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

  private async _optimisticExecute(
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
    // let reExec = false;
    let error: Error | null = null;
    let parsing = true;

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
          // XXX
          throw new Error("outdated codecs info");
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

    return result;
  }

  private async _fetch(
    query: string,
    args: QueryArgs,
    asJson: boolean,
    expectOne: boolean
  ): Promise<any> {
    const key = [query, query.length, asJson, expectOne].join(";");
    let ret;

    if (this.queryCodecCache.has(key)) {
      const [card, inCodec, outCodec] = await this.queryCodecCache.get(key)!;
      ret = await this._optimisticExecute(
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
      this.queryCodecCache.set(key, [card, inCodec, outCodec]);
      ret = await this._execute(args, inCodec, outCodec);
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

  async execute(query: string): Promise<void> {
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

    return;
  }

  async fetchAll(query: string, args: QueryArgs = null): Promise<Set> {
    return await this._fetch(query, args, false, false);
  }

  async fetchOne(query: string, args: QueryArgs = null): Promise<any> {
    return await this._fetch(query, args, false, true);
  }

  async fetchAllJSON(query: string, args: QueryArgs = null): Promise<string> {
    return await this._fetch(query, args, true, false);
  }

  async fetchOneJSON(query: string, args: QueryArgs = null): Promise<string> {
    return await this._fetch(query, args, true, true);
  }

  async close(): Promise<void> {
    this.sock.destroy();
  }

  private static newSock({
    port = 5656,
    host = "localhost",
  }: ConnectConfig = {}): net.Socket {
    return net.createConnection(port, host);
  }

  static async connect(
    config?: ConnectConfig | null
  ): Promise<AwaitConnection> {
    config = config || {};

    const sock = this.newSock(config);
    const conn = new this(sock, config);
    await conn.connect();
    return conn;
  }
}

class Connection {
  private _conn: AwaitConnection;

  execute(query: string, callback: NodeCallback | null = null): void {
    this._conn
      .execute(query)
      .then((value) => (callback != null ? callback(null, value) : null))
      .catch((error) => (callback != null ? callback(error, null) : null));
  }

  fetchOne(
    query: string,
    args: QueryArgs,
    callback: NodeCallback | null = null
  ): void {
    this._conn
      .fetchOne(query, args)
      .then((value) => (callback != null ? callback(null, value) : null))
      .catch((error) => (callback != null ? callback(error, null) : null));
  }

  fetchAll(
    query: string,
    args: QueryArgs,
    callback: NodeCallback<Set> | null = null
  ): void {
    this._conn
      .fetchAll(query, args)
      .then((value) => (callback != null ? callback(null, value) : null))
      .catch((error) => (callback != null ? callback(error, null) : null));
  }

  fetchOneJSON(
    query: string,
    args: QueryArgs,
    callback: NodeCallback<string> | null = null
  ): void {
    this._conn
      .fetchOneJSON(query, args)
      .then((value) => (callback != null ? callback(null, value) : null))
      .catch((error) => (callback != null ? callback(error, null) : null));
  }

  fetchAllJSON(
    query: string,
    args: QueryArgs,
    callback: NodeCallback<string> | null = null
  ): void {
    this._conn
      .fetchAllJSON(query, args)
      .then((value) => (callback ? callback(null, value) : null))
      .catch((error) => (callback ? callback(error, null) : null));
  }

  close(callback: NodeCallback<null> | null = null): void {
    this._conn
      .close()
      .then((_value) => (callback ? callback(null, null) : null))
      .catch((error) => (callback ? callback(error, null) : null));
  }

  private constructor(conn: AwaitConnection) {
    this._conn = conn;
  }

  static wrap(conn: AwaitConnection): Connection {
    return new Connection(conn);
  }
}
