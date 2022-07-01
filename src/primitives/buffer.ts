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

import char, * as chars from "./chars";
import {RingBuffer} from "./ring";
import * as bi from "./bigint";
import * as compat from "../compat";
import {LegacyHeaderCodes} from "../ifaces";

/* WriteBuffer over-allocation */
const BUFFER_INC_SIZE: number = 4096;

/* Max number of recv buffers that can be queued for
 * reading.
 */
const BUFFER_RING_CAPACITY: number = 2048;

const EMPTY_BUFFER = Buffer.allocUnsafe(0);

// @ts-ignore
// tslint:disable-next-line
const isNode12: boolean = !!Buffer["readBigInt64BE"];

export class BufferError extends Error {}

export class WriteBuffer {
  public buffer: Buffer;
  private size: number;
  private pos: number;

  constructor() {
    this.size = BUFFER_INC_SIZE;
    this.pos = 0;
    this.buffer = Buffer.allocUnsafe(this.size);
  }

  get position(): number {
    return this.pos;
  }

  reset(): void {
    this.pos = 0;
  }

  private ensureAlloced(extraLength: number): void {
    const newSize: number = this.pos + extraLength;
    if (newSize > this.size) {
      this.__realloc(newSize);
    }
  }

  private __realloc(newSize: number): void {
    newSize += BUFFER_INC_SIZE;
    const newBuffer = Buffer.allocUnsafe(newSize);
    this.buffer.copy(newBuffer, 0, 0, this.pos);
    this.buffer = newBuffer;
    this.size = newSize;
  }

  writeChar(ch: char): this {
    this.ensureAlloced(1);
    this.buffer.writeUInt8(ch, this.pos);
    this.pos++;
    return this;
  }

  writeString(s: string): this {
    return this.writeBytes(Buffer.from(s, "utf-8"));
  }

  writeBytes(buf: Buffer): this {
    this.ensureAlloced(buf.length + 4);
    this.buffer.writeInt32BE(buf.length, this.pos);
    this.pos += 4;
    buf.copy(this.buffer, this.pos, 0, buf.length);
    this.pos += buf.length;
    return this;
  }

  writeInt16(i: number): this {
    this.ensureAlloced(2);
    this.buffer.writeInt16BE(i, this.pos);
    this.pos += 2;
    return this;
  }

  writeInt32(i: number): this {
    this.ensureAlloced(4);
    this.buffer.writeInt32BE(i, this.pos);
    this.pos += 4;
    return this;
  }

  writeFloat32(i: number): this {
    this.ensureAlloced(4);
    this.buffer.writeFloatBE(i, this.pos);
    this.pos += 4;
    return this;
  }

  writeFloat64(i: number): this {
    this.ensureAlloced(8);
    this.buffer.writeDoubleBE(i, this.pos);
    this.pos += 8;
    return this;
  }

  writeUInt8(i: number): this {
    this.ensureAlloced(1);
    this.buffer.writeUInt8(i, this.pos);
    this.pos += 1;
    return this;
  }

  writeUInt16(i: number): this {
    this.ensureAlloced(2);
    this.buffer.writeUInt16BE(i, this.pos);
    this.pos += 2;
    return this;
  }

  writeUInt32(i: number): this {
    this.ensureAlloced(4);
    this.buffer.writeUInt32BE(i, this.pos);
    this.pos += 4;
    return this;
  }

  writeInt64(i: number): this {
    const hi = Math.floor(i / 0x100000000);
    const lo = i - hi * 0x100000000;
    this.writeInt32(hi);
    this.writeUInt32(lo);
    return this;
  }

  writeBigInt64(i: bi.BigIntLike): this {
    let ii: bi.BigIntLike = i;
    if (bi.lt(ii, bi.make(0))) {
      ii = bi.add(bi.make("18446744073709551616"), i);
    }
    const hi = bi.rshift(ii, bi.make(32));
    const lo = bi.bitand(ii, bi.make(0xffffffff));
    this.writeUInt32(Number(hi));
    this.writeUInt32(Number(lo));
    return this;
  }

  writeBuffer(buf: Buffer): this {
    const len = buf.length;
    this.ensureAlloced(len);
    buf.copy(this.buffer, this.pos, 0, len);
    this.pos += len;
    return this;
  }

  unwrap(): Buffer {
    return this.buffer.slice(0, this.pos);
  }
}

export class WriteMessageBuffer {
  private buffer: WriteBuffer;
  private messagePos: number;

  constructor() {
    this.messagePos = -1;
    this.buffer = new WriteBuffer();
  }

  reset(): this {
    this.messagePos = -1;
    this.buffer.reset();
    return this;
  }

  beginMessage(mtype: char): this {
    if (this.messagePos >= 0) {
      throw new BufferError(
        "cannot begin a new message: the previous message is not finished"
      );
    }
    this.messagePos = this.buffer.position;
    this.buffer.writeChar(mtype);
    this.buffer.writeInt32(0);
    return this;
  }

  endMessage(): this {
    if (this.messagePos < 0) {
      throw new BufferError("cannot end the message: no current message");
    }

    this.buffer.buffer.writeInt32BE(
      this.buffer.position - this.messagePos - 1,
      this.messagePos + 1
    );
    this.messagePos = -1;
    return this;
  }

  writeLegacyHeaders(
    headers: {[key in keyof typeof LegacyHeaderCodes]?: string | Buffer} | null
  ): this {
    if (this.messagePos < 0) {
      throw new BufferError("cannot writeHeaders: no current message");
    }
    if (!headers) {
      this.buffer.writeUInt16(0);
      return this;
    }

    const entries = Object.entries(headers).filter(
      ([_, value]) => value !== undefined
    ) as Array<[keyof typeof LegacyHeaderCodes, string | Buffer]>;
    this.buffer.writeUInt16(entries.length);
    for (const [code, value] of entries) {
      this.buffer.writeUInt16(LegacyHeaderCodes[code]);
      if (Buffer.isBuffer(value)) {
        this.buffer.writeUInt32(value.byteLength);
        this.buffer.writeBuffer(value);
      } else if (typeof value === "string") {
        this.buffer.writeString(value);
      } else {
        throw new BufferError(
          "cannot write header: value is not a Buffer or string"
        );
      }
    }
    return this;
  }

  writeChar(ch: char): this {
    if (this.messagePos < 0) {
      throw new BufferError("cannot writeChar: no current message");
    }
    this.buffer.writeChar(ch);
    return this;
  }

  writeString(s: string): this {
    if (this.messagePos < 0) {
      throw new BufferError("cannot writeString: no current message");
    }
    this.buffer.writeString(s);
    return this;
  }

  writeBytes(val: Buffer): this {
    if (this.messagePos < 0) {
      throw new BufferError("cannot writeBytes: no current message");
    }
    this.buffer.writeBytes(val);
    return this;
  }

  writeInt16(i: number): this {
    if (this.messagePos < 0) {
      throw new BufferError("cannot writeInt16: no current message");
    }
    this.buffer.writeInt16(i);
    return this;
  }

  writeInt32(i: number): this {
    if (this.messagePos < 0) {
      throw new BufferError("cannot writeInt32: no current message");
    }
    this.buffer.writeInt32(i);
    return this;
  }

  writeUInt16(i: number): this {
    if (this.messagePos < 0) {
      throw new BufferError("cannot writeInt16: no current message");
    }
    this.buffer.writeUInt16(i);
    return this;
  }

  writeUInt32(i: number): this {
    if (this.messagePos < 0) {
      throw new BufferError("cannot writeInt32: no current message");
    }
    this.buffer.writeUInt32(i);
    return this;
  }

  writeBigInt64(i: bi.BigIntLike): this {
    if (this.messagePos < 0) {
      throw new BufferError("cannot writeChar: no current message");
    }
    this.buffer.writeBigInt64(i);
    return this;
  }

  writeFlags(h: number, l: number): this {
    if (this.messagePos < 0) {
      throw new BufferError("cannot writeChar: no current message");
    }
    this.buffer.writeUInt32(h);
    this.buffer.writeUInt32(l);
    return this;
  }

  writeBuffer(buf: Buffer): this {
    if (this.messagePos < 0) {
      throw new BufferError("cannot writeBuffer: no current message");
    }
    this.buffer.writeBuffer(buf);
    return this;
  }

  writeSync(): this {
    if (this.messagePos >= 0) {
      throw new BufferError(
        "cannot writeSync: the previous message is not finished"
      );
    }
    this.buffer.writeBuffer(SYNC_MESSAGE);
    return this;
  }

  writeFlush(): this {
    if (this.messagePos >= 0) {
      throw new BufferError(
        "cannot writeFlush: the previous message is not finished"
      );
    }
    this.buffer.writeBuffer(FLUSH_MESSAGE);
    return this;
  }

  unwrap(): Buffer {
    if (this.messagePos >= 0) {
      throw new BufferError(
        "cannot unwrap: an unfinished message is in the buffer"
      );
    }
    return this.buffer.unwrap();
  }
}

const SYNC_MESSAGE = new WriteMessageBuffer()
  .beginMessage(chars.$S)
  .endMessage()
  .unwrap();

const FLUSH_MESSAGE = new WriteMessageBuffer()
  .beginMessage(chars.$H)
  .endMessage()
  .unwrap();

export class ReadMessageBuffer {
  private bufs: RingBuffer<Buffer>;
  private len: number;

  private buf0: Buffer | null;
  private pos0: number;
  private len0: number;

  private curMessageType: char;
  private curMessageLen: number;
  curMessageLenUnread: number;
  private curMessageReady: boolean;

  constructor() {
    this.bufs = new RingBuffer<Buffer>({capacity: BUFFER_RING_CAPACITY});
    this.buf0 = null;
    this.pos0 = 0;
    this.len0 = 0;
    this.len = 0;

    this.curMessageType = 0;
    this.curMessageLen = 0;
    this.curMessageLenUnread = 0;
    this.curMessageReady = false;
  }

  get length(): number {
    return this.len;
  }

  feed(buf: Buffer): boolean {
    if (
      this.buf0 == null ||
      (this.pos0 === this.len0 && this.bufs.length === 0)
    ) {
      this.buf0 = buf;
      this.len0 = buf.length;
      this.pos0 = 0;
      this.len = this.len0;
      return false;
    } else {
      return this.feedEnqueue(buf);
    }
  }

  private feedEnqueue(buf: Buffer): boolean {
    this.bufs.enq(buf);
    this.len += buf.length;
    const isFull = this.bufs.full;
    if (isFull && this.curMessageType !== 0) {
      throw new Error("query result is too big: buffer overflow");
    }
    return isFull;
  }

  private ensureFirstBuf(): Buffer {
    if (this.pos0 === this.len0) {
      this.__nextBuf();
    }
    const buf0 = this.buf0;
    if (buf0 == null || buf0.length < 1) {
      throw new BufferError("empty buffer");
    }
    return buf0;
  }

  private checkOverread(size: number): void {
    if (this.curMessageLenUnread < size || size > this.len) {
      throw new BufferError("buffer overread");
    }
  }

  private __nextBuf(): void {
    // Only called from ensureFirstBuf().  This part
    // is factored out to let ensureFirstBuf() be inlined.
    const nextBuf = this.bufs.deq();
    if (nextBuf == null) {
      throw new BufferError("buffer overread");
    }

    this.buf0 = nextBuf;
    this.pos0 = 0;
    this.len0 = nextBuf.length;
  }

  private discardBuffer(size: number): void {
    this.ensureFirstBuf();
    while (true) {
      if (this.pos0 + size > this.len0) {
        const nread = this.len0 - this.pos0;

        this.pos0 = this.len0;
        this.len -= nread;
        size -= nread;

        this.ensureFirstBuf();
      } else {
        this.pos0 += size;
        this.len -= size;
        break;
      }
    }
  }

  private _finishMessage(): void {
    this.curMessageLen = 0;
    this.curMessageLenUnread = 0;
    this.curMessageReady = false;
    this.curMessageType = 0;
  }

  private __readBufferCopy(buf0: Buffer, size: number): Buffer {
    const ret = Buffer.allocUnsafe(size);
    let retPos = 0;

    while (true) {
      if (this.pos0 + size > this.len0) {
        const nread = this.len0 - this.pos0;

        buf0.copy(ret, retPos, this.pos0, this.len0);
        retPos += nread;

        this.pos0 = this.len0;
        this.len -= nread;
        size -= nread;

        buf0 = this.ensureFirstBuf();
      } else {
        buf0.copy(ret, retPos, this.pos0, this.pos0 + size);
        this.pos0 += size;
        this.len -= size;
        break;
      }
    }

    return ret;
  }

  private _readBuffer(size: number): Buffer {
    if (size === 0) {
      return EMPTY_BUFFER;
    }

    const buf0 = this.ensureFirstBuf();

    if (this.pos0 + size <= this.len0) {
      // If the requested *size* fits in the first buffer
      // do a slice operation.
      const ret = buf0.slice(this.pos0, this.pos0 + size);
      this.pos0 += size;
      this.len -= size;
      return ret;
    }

    return this.__readBufferCopy(buf0, size);
  }

  readBuffer(size: number): Buffer {
    this.checkOverread(size);
    const buf = this._readBuffer(size);
    this.curMessageLenUnread -= size;
    return buf;
  }

  readUUID(): string {
    const buf = this.readBuffer(16);
    return buf.toString("hex");
  }

  readChar(): char {
    this.checkOverread(1);
    const buf0 = this.ensureFirstBuf();
    const ret = buf0.readUInt8(this.pos0);
    this.pos0++;
    this.curMessageLenUnread--;
    this.len--;
    return ret;
  }

  readInt16(): number {
    this.checkOverread(2);
    const buf0 = this.ensureFirstBuf();

    if (this.pos0 + 2 <= this.len0) {
      const ret = buf0.readInt16BE(this.pos0);
      this.pos0 += 2;
      this.curMessageLenUnread -= 2;
      this.len -= 2;
      return ret;
    }

    const buf = this._readBuffer(2);
    this.curMessageLenUnread -= 2;
    return buf.readInt16BE(0);
  }

  readInt32(): number {
    this.checkOverread(4);
    const buf0 = this.ensureFirstBuf();

    if (this.pos0 + 4 <= this.len0) {
      const ret = buf0.readInt32BE(this.pos0);
      this.pos0 += 4;
      this.curMessageLenUnread -= 4;
      this.len -= 4;
      return ret;
    }

    const buf = this._readBuffer(4);
    this.curMessageLenUnread -= 4;
    return buf.readInt32BE(0);
  }

  readUInt16(): number {
    this.checkOverread(2);
    const buf0 = this.ensureFirstBuf();

    if (this.pos0 + 2 <= this.len0) {
      const ret = buf0.readUInt16BE(this.pos0);
      this.pos0 += 2;
      this.curMessageLenUnread -= 2;
      this.len -= 2;
      return ret;
    }

    const buf = this._readBuffer(2);
    this.curMessageLenUnread -= 2;
    return buf.readUInt16BE(0);
  }

  readUInt32(): number {
    this.checkOverread(4);
    const buf0 = this.ensureFirstBuf();

    if (this.pos0 + 4 <= this.len0) {
      const ret = buf0.readUInt32BE(this.pos0);
      this.pos0 += 4;
      this.curMessageLenUnread -= 4;
      this.len -= 4;
      return ret;
    }

    const buf = this._readBuffer(4);
    this.curMessageLenUnread -= 4;
    return buf.readUInt32BE(0);
  }

  readBigInt64(): bigint {
    this.checkOverread(8);
    const buf0 = this.ensureFirstBuf();

    if (this.pos0 + 8 <= this.len0) {
      const ret = buf0.readBigInt64BE(this.pos0);
      this.pos0 += 8;
      this.curMessageLenUnread -= 8;
      this.len -= 8;
      return ret;
    }

    const buf = this._readBuffer(8);
    this.curMessageLenUnread -= 8;
    return buf.readBigInt64BE(0);
  }

  readString(): string {
    const len = this.readInt32();
    const buf = this.readBuffer(len);
    return buf.toString("utf-8");
  }

  readLenPrefixedBuffer(): Buffer {
    const len = this.readInt32();
    return this.readBuffer(len);
  }

  takeMessage(): boolean {
    if (this.curMessageReady) {
      return true;
    }

    if (this.curMessageType === 0) {
      if (this.len < 1) {
        return false;
      }
      const buf0 = this.ensureFirstBuf();
      this.curMessageType = buf0.readUInt8(this.pos0);
      this.pos0++;
      this.len--;
    }

    if (this.curMessageLen === 0) {
      if (this.len < 4) {
        return false;
      }
      const buf0 = this.ensureFirstBuf();
      if (this.pos0 + 4 <= this.len0) {
        this.curMessageLen = buf0.readInt32BE(this.pos0);
        this.pos0 += 4;
        this.len -= 4;
      } else {
        const buf = this._readBuffer(4);
        this.curMessageLen = buf.readInt32BE(0);
      }

      this.curMessageLenUnread = this.curMessageLen - 4;
    }

    if (this.len < this.curMessageLenUnread) {
      return false;
    }

    this.curMessageReady = true;
    return true;
  }

  getMessageType(): char {
    return this.curMessageType;
  }

  takeMessageType(mtype: char): boolean {
    if (this.curMessageReady) {
      return this.curMessageType === mtype;
    }

    if (this.len >= 1) {
      const buf0 = this.ensureFirstBuf();
      const unreadMessageType = buf0.readUInt8(this.pos0);
      return mtype === unreadMessageType && this.takeMessage();
    }

    return false;
  }

  putMessage(): void {
    if (!this.curMessageReady) {
      throw new BufferError("cannot put message: no message taken");
    }
    if (this.curMessageLenUnread !== this.curMessageLen - 4) {
      throw new BufferError("cannot put message: message is partially read");
    }
    this.curMessageReady = false;
  }

  discardMessage(): void {
    if (!this.curMessageReady) {
      throw new BufferError("no message to discard");
    }
    if (this.curMessageLenUnread > 0) {
      this.discardBuffer(this.curMessageLenUnread);
    }
    this._finishMessage();
  }

  consumeMessage(): Buffer {
    if (!this.curMessageReady) {
      throw new BufferError("no message to consume");
    }

    let buf: Buffer;
    if (this.curMessageLenUnread > 0) {
      buf = this._readBuffer(this.curMessageLenUnread);
      this.curMessageLenUnread = 0;
    } else {
      buf = EMPTY_BUFFER;
    }

    this._finishMessage();
    return buf;
  }

  consumeMessageInto(frb: ReadBuffer): void {
    if (!this.curMessageReady) {
      throw new BufferError("no message to consume");
    }

    if (this.curMessageLenUnread > 0) {
      if (this.pos0 + this.curMessageLenUnread <= this.len0) {
        const len = this.pos0 + this.curMessageLenUnread;
        ReadBuffer.slice(frb, this.buf0!, this.pos0, len);
        this.pos0 = len;
        this.len -= this.curMessageLenUnread;
      } else {
        const buf = this._readBuffer(this.curMessageLenUnread);
        ReadBuffer.init(frb, buf);
      }
      this.curMessageLenUnread = 0;
    } else {
      ReadBuffer.init(frb, EMPTY_BUFFER);
    }

    this._finishMessage();
  }

  finishMessage(): void {
    if (this.curMessageType === 0 || !this.curMessageReady) {
      // The message has already been finished (e.g. by consumeMessage()),
      // or has been put back by putMessage().
      return;
    }

    if (this.curMessageLenUnread) {
      throw new BufferError(
        `cannot finishMessage: unread data in message ` +
          `"${chars.chr(this.curMessageType)}"`
      );
    }

    this._finishMessage();
  }
}

export class ReadBuffer {
  private buffer: Buffer;
  private pos: number;
  private len: number;

  constructor(buf: Buffer) {
    this.buffer = buf;
    this.len = buf.length;
    this.pos = 0;
  }

  get position(): number {
    return this.pos;
  }

  get length(): number {
    return this.len - this.pos;
  }

  finish(): void {
    if (this.len !== this.pos) {
      throw new BufferError("unexpected trailing data in buffer");
    }
  }

  discard(size: number): void {
    if (this.pos + size > this.len) {
      throw new BufferError("buffer overread");
    }
    this.pos += size;
  }

  readUInt8(): number {
    if (this.pos + 1 > this.len) {
      throw new BufferError("buffer overread");
    }
    const num = this.buffer.readUInt8(this.pos);
    this.pos++;
    return num;
  }

  readUInt16(): number {
    if (this.pos + 2 > this.len) {
      throw new BufferError("buffer overread");
    }
    const num = this.buffer.readUInt16BE(this.pos);
    this.pos += 2;
    return num;
  }

  readInt8(): number {
    if (this.pos + 1 > this.len) {
      throw new BufferError("buffer overread");
    }
    const num = this.buffer.readInt8(this.pos);
    this.pos++;
    return num;
  }

  readInt16(): number {
    if (this.pos + 2 > this.len) {
      throw new BufferError("buffer overread");
    }
    const num = this.buffer.readInt16BE(this.pos);
    this.pos += 2;
    return num;
  }

  readInt32(): number {
    if (this.pos + 4 > this.len) {
      throw new BufferError("buffer overread");
    }
    const num = this.buffer.readInt32BE(this.pos);
    this.pos += 4;
    return num;
  }

  readFloat32(): number {
    if (this.pos + 4 > this.len) {
      throw new BufferError("buffer overread");
    }
    const num = this.buffer.readFloatBE(this.pos);
    this.pos += 4;
    return num;
  }

  readFloat64(): number {
    if (this.pos + 8 > this.len) {
      throw new BufferError("buffer overread");
    }
    const num = this.buffer.readDoubleBE(this.pos);
    this.pos += 8;
    return num;
  }

  readUInt32(): number {
    if (this.pos + 4 > this.len) {
      throw new BufferError("buffer overread");
    }
    const num = this.buffer.readUInt32BE(this.pos);
    this.pos += 4;
    return num;
  }

  private reportInt64Overflow(hi: number, lo: number): never {
    const bhi = bi.make(hi);
    const blo = bi.make(lo >>> 0);
    const num = bi.add(bi.mul(bhi, bi.make(0x100000000)), blo);

    throw new Error(
      `integer overflow: cannot unpack <std::int64>'${num.toString()}' ` +
        `into JavaScript Number type without losing precision`
    );
  }

  readInt64(): number {
    if (this.pos + 8 > this.len) {
      throw new BufferError("buffer overread");
    }

    const hi = this.buffer.readInt32BE(this.pos);
    const lo = this.buffer.readInt32BE(this.pos + 4);
    this.pos += 8;

    if (hi === 0) {
      return lo >>> 0;
    } else if (hi >= -0x200000 && hi < 0x200000) {
      return hi * 0x100_000_000 + (lo >>> 0);
    }

    return this.reportInt64Overflow(hi, lo);
  }

  readBigInt64Fallback(): bi.BigIntLike {
    if (bi.hasNativeBigInt) {
      const hi = this.buffer.readUInt32BE(this.pos);
      const lo = this.buffer.readUInt32BE(this.pos + 4);
      this.pos += 8;

      let res = (BigInt(hi) << BigInt(32)) + BigInt(lo);
      if (hi >= 0x80000000) {
        res = BigInt("-18446744073709551616") + res;
      }
      return res;
    } else {
      const buf = this.readBuffer(8);
      const snum = compat.decodeInt64ToString(buf);
      return bi.make(snum);
    }
  }

  readBigInt64(): bi.BigIntLike {
    if (this.pos + 8 > this.len) {
      throw new BufferError("buffer overread");
    }
    if (isNode12) {
      const ret = this.buffer.readBigInt64BE(this.pos);
      this.pos += 8;
      return ret;
    } else {
      return this.readBigInt64Fallback();
    }
  }

  readBuffer(size: number): Buffer {
    if (this.pos + size > this.len) {
      throw new BufferError("buffer overread");
    }
    const buf = this.buffer.slice(this.pos, this.pos + size);
    this.pos += size;
    return buf;
  }

  readUUID(): string {
    if (this.pos + 16 > this.len) {
      throw new BufferError("buffer overread");
    }
    const buf = this.buffer.slice(this.pos, this.pos + 16);
    this.pos += 16;
    return buf.toString("hex");
  }

  consumeAsString(): string {
    if (this.pos === this.len) {
      // Fast path.
      return "";
    }

    const res = this.buffer.toString("utf8", this.pos, this.len);
    this.pos = this.len;
    return res;
  }

  consumeAsBuffer(): Buffer {
    const res = this.buffer.slice(this.pos, this.len);
    this.pos = this.len;
    return res;
  }

  sliceInto(frb: ReadBuffer, size: number): void {
    if (this.pos + size > this.len) {
      throw new BufferError("buffer overread");
    }
    frb.buffer = this.buffer;
    frb.pos = this.pos;
    frb.len = this.pos + size;
    this.pos += size;
  }

  static init(frb: ReadBuffer, buffer: Buffer): void {
    frb.buffer = buffer;
    frb.pos = 0;
    frb.len = buffer.length;
  }

  static slice(
    frb: ReadBuffer,
    buffer: Buffer,
    pos: number,
    len: number
  ): void {
    frb.buffer = buffer;
    frb.pos = pos;
    frb.len = len;
  }

  static alloc(): ReadBuffer {
    return new this(EMPTY_BUFFER);
  }
}
