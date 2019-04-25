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

import {
  ReadMessageBuffer,
  WriteMessageBuffer,
  ReadBuffer,
  WriteBuffer,
} from "./buffer";
import char, * as chars from "./chars";

import * as net from "net";
import {CodecsRegistry} from "./codecs/registry";
import {ICodec, uuid} from "./codecs/ifaces";
import LRU from "./lru";

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

export type onConnect = (err: Error | null, con: Connection | null) => void;

export default function connect(
  options?: ConnectConfig
): Promise<AwaitConnection>;
export default function connect(
  options?: ConnectConfig,
  callback?: onConnect
): void;
export default function connect(
  options?: ConnectConfig,
  callback?: onConnect
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
    this.sock.on("error", this.onError.bind(this));
    this.sock.on("data", this.onData.bind(this));
    this.sock.on("connect", this.onConnect.bind(this));

    this.config = config;
  }

  private async waitForMessage(): Promise<void> {
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

  private onConnect(): void {
    if (this.connWaiterResolve) {
      this.connWaiterResolve(true);
      this.connWaiterReject = null;
      this.connWaiterResolve = null;
    }
  }

  private onError(err: Error): void {
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

  private onData(data: Buffer): void {
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

  private rejectHeaders(): void {
    const nheaders = this.buffer.readInt16();
    if (nheaders) {
      throw new Error("unexpected headers");
    }
  }

  private parseHeaders(): Map<number, Buffer> {
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

  private parseDescribeTypeMessage(): [number, ICodec, ICodec] {
    this.rejectHeaders();

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

  private parseCommandCompleteMessage(): string {
    this.rejectHeaders();
    const status = this.buffer.readString();
    this.buffer.finishMessage();
    return status;
  }

  private parseErrorMessage(): Error {
    const severity = this.buffer.readChar();
    const code = this.buffer.readUInt32();
    const message = this.buffer.readString();
    const attrs = this.parseHeaders();
    this.buffer.finishMessage();

    const err = new Error(message);
    return err;
  }

  private parseSyncMessage(): void {
    this.parseHeaders(); // TODO: Reject Headers
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

  private parseDataMessages(codec: ICodec, result: any[]): void {
    const frb = ReadBuffer.alloc();
    const $D = chars.$D;
    const buffer = this.buffer;

    while (buffer.takeMessageType($D)) {
      buffer.consumeMessageInto(frb);
      frb.discard(6);
      result.push(codec.decode(frb));
    }
  }

  private fallthrough(): void {
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
        this.parseHeaders();
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
        await this.waitForMessage();
      }

      const mtype = this.buffer.getMessageType();

      switch (mtype) {
        case chars.$v: {
          const hi = this.buffer.readInt16();
          const lo = this.buffer.readInt16();
          this.parseHeaders();
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
          throw this.parseErrorMessage();
        }

        case chars.$Z: {
          this.parseSyncMessage();
          return;
        }

        default:
          this.fallthrough();
      }
    }
  }

  private async parse(
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
        await this.waitForMessage();
      }

      const mtype = this.buffer.getMessageType();

      switch (mtype) {
        case chars.$1: {
          this.rejectHeaders();
          cardinality = this.buffer.readChar();
          inTypeId = this.buffer.readUUID();
          outTypeId = this.buffer.readUUID();
          this.buffer.finishMessage();
          break;
        }

        case chars.$E: {
          error = this.parseErrorMessage();
          break;
        }

        case chars.$Z: {
          this.parseSyncMessage();
          parsing = false;
          break;
        }

        default:
          this.fallthrough();
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
          await this.waitForMessage();
        }

        const mtype = this.buffer.getMessageType();

        switch (mtype) {
          case chars.$T: {
            [cardinality, inCodec, outCodec] = this.parseDescribeTypeMessage();
            break;
          }

          case chars.$E: {
            error = this.parseErrorMessage();
            break;
          }

          case chars.$Z: {
            this.parseSyncMessage();
            parsing = false;
            break;
          }

          default:
            this.fallthrough();
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

  private async execute(inCodec: ICodec, outCodec: ICodec): Promise<any[]> {
    const argsWb = new WriteBuffer();
    inCodec.encode(argsWb, []);

    const wb = new WriteMessageBuffer();
    wb.beginMessage(chars.$E)
      .writeInt16(0) // no headers
      .writeString("") // statement name
      .writeBuffer(argsWb.unwrap())
      .endMessage()
      .writeSync();

    this.sock.write(wb.unwrap());

    const result: any[] = [];
    let parsing = true;
    let error: Error | null = null;

    while (parsing) {
      if (!this.buffer.takeMessage()) {
        await this.waitForMessage();
      }

      const mtype = this.buffer.getMessageType();

      switch (mtype) {
        case chars.$D: {
          this.parseDataMessages(outCodec, result);
          break;
        }

        case chars.$C: {
          this.lastStatus = this.parseCommandCompleteMessage();
          break;
        }

        case chars.$E: {
          error = this.parseErrorMessage();
          break;
        }

        case chars.$Z: {
          this.parseSyncMessage();
          parsing = false;
          break;
        }

        default:
          this.fallthrough();
      }
    }

    if (error != null) {
      throw error;
    }

    return result;
  }

  private async optimisticExecute(
    asJson: boolean,
    expectOne: boolean,
    inCodec: ICodec,
    outCodec: ICodec,
    query: string
  ): Promise<any> {
    const argsWb = new WriteBuffer();
    inCodec.encode(argsWb, []);

    const wb = new WriteMessageBuffer();
    wb.beginMessage(chars.$O);
    wb.writeInt16(0); // no headers
    wb.writeChar(asJson ? chars.$j : chars.$b);
    wb.writeChar(expectOne ? chars.$o : chars.$m);
    wb.writeString(query);
    wb.writeBuffer(inCodec.tidBuffer);
    wb.writeBuffer(outCodec.tidBuffer);
    wb.writeBuffer(argsWb.unwrap());
    wb.endMessage();
    wb.writeSync();

    this.sock.write(wb.unwrap());

    const result: any[] = [];
    // let reExec = false;
    let error: Error | null = null;
    let parsing = true;

    while (parsing) {
      if (!this.buffer.takeMessage()) {
        await this.waitForMessage();
      }

      const mtype = this.buffer.getMessageType();

      switch (mtype) {
        case chars.$D: {
          this.parseDataMessages(outCodec, result);
          break;
        }

        case chars.$C: {
          this.lastStatus = this.parseCommandCompleteMessage();
          break;
        }

        case chars.$Z: {
          this.parseSyncMessage();
          parsing = false;
          break;
        }

        case chars.$T: {
          // XXX
          throw new Error("outdated codecs info");
        }

        case chars.$E: {
          error = this.parseErrorMessage();
          break;
        }

        default:
          this.fallthrough();
      }
    }

    if (error != null) {
      throw error;
    }

    return result;
  }

  private async fetch(
    query: string,
    asJson: boolean,
    expectOne: boolean
  ): Promise<any> {
    const key = [query, query.length, asJson, expectOne].join(";");
    let ret;

    if (this.queryCodecCache.has(key)) {
      const [card, inCodec, outCodec] = await this.queryCodecCache.get(key)!;
      ret = await this.optimisticExecute(
        asJson,
        expectOne,
        inCodec,
        outCodec,
        query
      );
    } else {
      const [card, inCodec, outCodec] = await this.parse(
        query,
        asJson,
        expectOne
      );
      this.queryCodecCache.set(key, [card, inCodec, outCodec]);
      ret = await this.execute(inCodec, outCodec);
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

  async fetchAll(query: string): Promise<any[]> {
    return await this.fetch(query, false, false);
  }

  async fetchOne(query: string): Promise<any> {
    return await this.fetch(query, false, true);
  }

  async fetchAllJSON(query: string): Promise<string> {
    return await this.fetch(query, true, false);
  }

  async fetchOneJSON(query: string): Promise<string> {
    return await this.fetch(query, true, true);
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

  static async connect(config: ConnectConfig = {}): Promise<AwaitConnection> {
    const sock = this.newSock(config);
    const conn = new this(sock, config);
    await conn.connect();
    return conn;
  }
}

class Connection {
  static wrap(conn: AwaitConnection): Connection {
    return new Connection();
  }
}
