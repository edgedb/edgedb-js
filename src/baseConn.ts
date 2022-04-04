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

import {NullCodec, NULL_CODEC} from "./codecs/codecs";
import {ICodec, uuid} from "./codecs/ifaces";
import {NamedTupleCodec} from "./codecs/namedtuple";
import {ObjectCodec} from "./codecs/object";
import {CodecsRegistry} from "./codecs/registry";
import {EmptyTupleCodec, EMPTY_TUPLE_CODEC, TupleCodec} from "./codecs/tuple";
import {versionGreaterThanOrEqual} from "./utils";
import * as errors from "./errors";
import {resolveErrorCode} from "./errors/resolve";
import {
  HeaderCodes,
  ParseOptions,
  PrepareMessageHeaders,
  ProtocolVersion,
  QueryArgs,
  ServerSettings,
} from "./ifaces";
import {
  ReadBuffer,
  ReadMessageBuffer,
  WriteBuffer,
  WriteMessageBuffer,
} from "./primitives/buffer";
import char, * as chars from "./primitives/chars";
import Event from "./primitives/event";
import LRU from "./primitives/lru";

export const PROTO_VER: ProtocolVersion = [0, 14];
export const PROTO_VER_MIN: ProtocolVersion = [0, 9];

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

export class BaseRawConnection {
  protected connected: boolean = false;
  protected alwaysUseOptimisticFlow: boolean = false; // XXX
  protected exposeErrorAttributes: boolean = false;

  protected lastStatus: string | null;

  protected codecsRegistry: CodecsRegistry;
  protected queryCodecCache: LRU<string, [number, ICodec, ICodec, number]>;

  protected serverSecret: Buffer | null;
  /** @internal */ serverSettings: ServerSettings;
  private serverXactStatus: TransactionStatus;

  protected buffer: ReadMessageBuffer;

  protected messageWaiter: Event | null;
  protected connWaiter: Event;
  connAbortWaiter: Event;

  protected _abortedWith: Error | null = null;

  protocolVersion: ProtocolVersion = PROTO_VER;

  /** @internal */
  protected constructor(
    registry: CodecsRegistry
  ) {
    this.buffer = new ReadMessageBuffer();

    this.codecsRegistry = registry;
    this.queryCodecCache = new LRU({capacity: 1000});

    this.lastStatus = null;

    this.serverSecret = null;
    this.serverSettings = {};
    this.serverXactStatus = TransactionStatus.TRANS_UNKNOWN;

    this.messageWaiter = null;
    this.connWaiter = new Event();
    this.connAbortWaiter = new Event();
  }

  protected throwNotImplemented(method: string): never {
    throw new Error(`method ${method} is not implemented`);
  }

  protected async _waitForMessage(): Promise<void> {
    this.throwNotImplemented('_waitForMessage');
  }

  protected _sendData(data: Buffer): void {
    this.throwNotImplemented('_sendData');
  }

  getConnAbortError(): Error {
    return (
      this._abortedWith ?? new errors.InterfaceError(`client has been closed`)
    );
  }

  protected _checkState(): void {
    if (this.isClosed()) {
      throw this.getConnAbortError();
    }
  }

  protected _abortWithError(err: Error): void {
    this._abortedWith = err;
    this._abort();
  }

  protected _ignoreHeaders(): void {
    let numFields = this.buffer.readInt16();
    while (numFields) {
      this.buffer.readInt16();
      this.buffer.readLenPrefixedBuffer();
      numFields--;
    }
  }

  protected _abortWaiters(err: Error): void {
    if (!this.connWaiter.done) {
      this.connWaiter.setError(err);
    }
    this.messageWaiter?.setError(err);
    this.messageWaiter = null;
  }

  protected _parseHeaders(): Map<number, Buffer> {
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
    number,
    Buffer,
    Buffer
  ] {
    const headers = this._parseHeaders();
    let capabilities = -1;
    if (headers.has(HeaderCodes.capabilities)) {
      capabilities = Number(
        headers.get(HeaderCodes.capabilities)!.readBigInt64BE()
      );
    }

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

    return [
      cardinality,
      inCodec,
      outCodec,
      capabilities,
      inTypeData,
      outTypeData,
    ];
  }

  protected _parseCommandCompleteMessage(): string {
    this._ignoreHeaders();
    const status = this.buffer.readString();
    this.buffer.finishMessage();
    return status;
  }

  protected _parseErrorMessage(): Error {
    this.buffer.readChar(); // ignore severity
    const code = this.buffer.readUInt32();
    const message = this.buffer.readString();

    const errorType = resolveErrorCode(OLD_ERROR_CODES.get(code) ?? code);
    const err = new errorType(message);

    if (this.exposeErrorAttributes) {
      (err as any).attrs = this._parseHeaders();
    } else {
      this._ignoreHeaders(); // ignore attrs
    }
    this.buffer.finishMessage();

    return err;
  }

  protected _parseSyncMessage(): void {
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

  private _parseDataMessages(
    codec: ICodec,
    result: Array<any> | WriteBuffer
  ): void {
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

  protected _fallthrough(): void {
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

  async _parse(
    query: string,
    asJson: boolean,
    expectOne: boolean,
    alwaysDescribe: boolean,
    options?: ParseOptions
  ): Promise<[number, ICodec, ICodec, number, Buffer | null, Buffer | null]> {
    const wb = new WriteMessageBuffer();
    const parseSendsTypeData = versionGreaterThanOrEqual(
      this.protocolVersion,
      [0, 14]
    );

    wb.beginMessage(chars.$P)
      .writeHeaders({
        explicitObjectids: "true",
        ...(options?.headers ?? {}),
        allowCapabilities: NO_TRANSACTION_CAPABILITIES_BYTES,
      })
      .writeChar(asJson ? chars.$j : chars.$b)
      .writeChar(expectOne ? chars.$o : chars.$m)
      .writeString("") // statement name
      .writeString(query)
      .endMessage();

    wb.writeSync();

    this._sendData(wb.unwrap());

    let cardinality: number | void;
    let inTypeId: uuid | void;
    let outTypeId: uuid | void;
    let inCodec: ICodec | null;
    let outCodec: ICodec | null;
    let capabilities: number = -1;
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
          const headers = this._parseHeaders();
          if (headers.has(HeaderCodes.capabilities)) {
            capabilities = Number(
              headers.get(HeaderCodes.capabilities)!.readBigInt64BE()
            );
          }
          cardinality = this.buffer.readChar();

          if (parseSendsTypeData) {
            inTypeId = this.buffer.readUUID();
            inCodecData = this.buffer.readLenPrefixedBuffer();
            outTypeId = this.buffer.readUUID();
            outCodecData = this.buffer.readLenPrefixedBuffer();
          } else {
            inTypeId = this.buffer.readUUID();
            outTypeId = this.buffer.readUUID();
          }

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

    if (inCodec == null && inCodecData != null) {
      inCodec = this.codecsRegistry.buildCodec(
        inCodecData,
        this.protocolVersion
      );
    }

    if (outCodec == null && outCodecData != null) {
      outCodec = this.codecsRegistry.buildCodec(
        outCodecData,
        this.protocolVersion
      );
    }

    if (
      inCodec == null ||
      outCodec == null ||
      (alwaysDescribe && !parseSendsTypeData)
    ) {
      if (parseSendsTypeData) {
        // unreachable
        throw new Error("in/out codecs were not sent");
      }

      wb.reset();
      wb.beginMessage(chars.$D)
        .writeInt16(0) // no headers
        .writeChar(chars.$T)
        .writeString("") // statement name
        .endMessage()
        .writeSync();

      this._sendData(wb.unwrap());

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
                capabilities,
                inCodecData,
                outCodecData,
              ] = this._parseDescribeTypeMessage();
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

    return [
      cardinality,
      inCodec,
      outCodec,
      capabilities,
      inCodecData,
      outCodecData,
    ];
  }

  private _encodeArgs(args: QueryArgs, inCodec: ICodec): Buffer {
    if (versionGreaterThanOrEqual(this.protocolVersion, [0, 12])) {
      if (inCodec === NULL_CODEC) {
        if (args != null) {
          throw new errors.QueryArgumentError(
            `This query does not contain any query parameters, ` +
              `but query arguments were provided to the 'query*()' method`
          );
        }
        return NullCodec.BUFFER;
      }

      if (inCodec instanceof ObjectCodec) {
        return inCodec.encodeArgs(args);
      }

      // Shouldn't ever happen.
      throw new Error("invalid input codec");
    } else {
      if (inCodec === EMPTY_TUPLE_CODEC) {
        if (args != null) {
          throw new errors.QueryArgumentError(
            `This query does not contain any query parameters, ` +
              `but query arguments were provided to the 'query*()' method`
          );
        }
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
    args: QueryArgs,
    inCodec: ICodec,
    outCodec: ICodec,
    result: Array<any> | WriteBuffer
  ): Promise<void> {
    const wb = new WriteMessageBuffer();
    wb.beginMessage(chars.$E)
      .writeHeaders({allowCapabilities: NO_TRANSACTION_CAPABILITIES_BYTES})
      .writeString("") // statement name
      .writeBuffer(this._encodeArgs(args, inCodec))
      .endMessage()
      .writeSync();

    this._sendData(wb.unwrap());

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
    result: Array<any> | WriteBuffer,
    options?: ParseOptions
  ): Promise<void> {
    const wb = new WriteMessageBuffer();
    wb.beginMessage(chars.$O);
    wb.writeHeaders({
      explicitObjectids: "true",
      ...(options?.headers ?? {}),
      allowCapabilities: NO_TRANSACTION_CAPABILITIES_BYTES,
    });
    wb.writeChar(asJson ? chars.$j : chars.$b);
    wb.writeChar(expectOne ? chars.$o : chars.$m);
    wb.writeString(query);
    wb.writeBuffer(inCodec.tidBuffer);
    wb.writeBuffer(outCodec.tidBuffer);
    wb.writeBuffer(this._encodeArgs(args, inCodec));
    wb.endMessage();
    wb.writeSync();

    this._sendData(wb.unwrap());

    let reExec = false;
    let error: Error | null = null;
    let parsing = true;
    let newCard: char | null = null;
    let capabilities = -1;

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
            [newCard, inCodec, outCodec, capabilities] =
              this._parseDescribeTypeMessage();
            const key = this._getQueryCacheKey(query, asJson, expectOne);
            this.queryCodecCache.set(key, [
              newCard,
              inCodec,
              outCodec,
              capabilities,
            ]);
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
    const ret = new Array();

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
      const [card, inCodec, outCodec, capabilities] = await this._parse(
        query,
        asJson,
        expectOne,
        false
      );
      this._validateFetchCardinality(card, asJson, requiredOne);
      this.queryCodecCache.set(key, [card, inCodec, outCodec, capabilities]);
      if (this.alwaysUseOptimisticFlow) {
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
        await this._executeFlow(args, inCodec, outCodec, ret);
      }
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

  getQueryCapabilities(
    query: string,
    asJson: boolean,
    expectOne: boolean
  ): number | null {
    const key = this._getQueryCacheKey(query, asJson, expectOne);
    return this.queryCodecCache.get(key)?.[3] ?? null;
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

    this._sendData(wb.unwrap());

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
    if (
      this.connected &&
      this.serverXactStatus !== TransactionStatus.TRANS_IDLE
    ) {
      try {
        await this.execute(`rollback`, true);
      } catch {
        this._abortWithError(
          new errors.ClientConnectionClosedError("failed to reset state")
        );
      }
    }
  }

  protected _abort(): void {
    this.connected = false;
    this._abortWaiters(this.getConnAbortError());
    if (!this.connAbortWaiter.done) {
      this.connAbortWaiter.set();
    }
  }

  isClosed(): boolean {
    return !this.connected;
  }

  async close(): Promise<void> {
    this._abort();
  }

  // These methods are exposed for use by EdgeDB Studio
  public async rawParse(
    query: string,
    headers?: PrepareMessageHeaders
  ): Promise<[ICodec, ICodec, Buffer, Buffer, ProtocolVersion]> {
    const result = await this._parse(query, false, false, true, {
      headers,
    });
    return [
      result[1],
      result[2],
      result[4]!,
      result[5]!,
      this.protocolVersion,
    ];
  }

  public async rawExecute(
    query: string,
    outCodec: ICodec,
    headers?: PrepareMessageHeaders,
    inCodec?: ICodec,
    args: QueryArgs = null
  ): Promise<Buffer> {
    const result = new WriteBuffer();
    inCodec =
      inCodec ??
      (versionGreaterThanOrEqual(this.protocolVersion, [0, 12])
        ? NULL_CODEC
        : EMPTY_TUPLE_CODEC);
    await this._optimisticExecuteFlow(
      args,
      false,
      false,
      false,
      inCodec,
      outCodec,
      query,
      result,
      {headers}
    );
    return result.unwrap();
  }

  public async rawExecuteScript(script: string): Promise<void> {
    await this.execute(script, true);
  }
}
