import char, * as chars from "./chars";
import {RingBuffer} from "./ring";

/* WriteBuffer over-allocation */
const BUFFER_INC_SIZE: number = 4096;

/* Max number of recv buffers that can be queued for
 * reading.
 */
const BUFFER_RING_CAPACITY: number = 1024;

const EMPTY_BUFFER = Buffer.allocUnsafe(0);

export class BufferError extends Error {}

export class WriteBuffer {
  private buffer: Buffer;
  private size: number;
  private pos: number;
  private messagePos: number;

  constructor() {
    this.size = BUFFER_INC_SIZE;
    this.pos = 0;
    this.messagePos = -1;
    this.buffer = Buffer.allocUnsafe(this.size);
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
  }

  beginMessage(mtype: char): this {
    if (this.messagePos >= 0) {
      throw new BufferError(
        "cannot begin a new message: the previous message is not finished"
      );
    }
    this.ensureAlloced(5);
    this.buffer.writeUInt8(mtype, this.pos);
    this.messagePos = this.pos;
    this.pos += 5;

    return this;
  }

  endMessage(): this {
    if (this.messagePos < 0) {
      throw new BufferError("cannot end the message: no current message");
    }

    this.buffer.writeInt32BE(
      this.pos - this.messagePos - 1,
      this.messagePos + 1
    );
    this.messagePos = -1;
    return this;
  }

  writeChar(ch: char): this {
    if (this.messagePos < 0) {
      throw new BufferError("cannot writeChar: no current message");
    }
    this.ensureAlloced(1);
    this.buffer.writeUInt8(ch, this.pos);
    this.pos++;
    return this;
  }

  writeString(s: string): this {
    if (this.messagePos < 0) {
      throw new BufferError("cannot writeString: no current message");
    }

    const buf: Buffer = Buffer.from(s, "utf-8");
    this.ensureAlloced(buf.length + 4);
    this.buffer.writeInt32BE(buf.length, this.pos);
    this.pos += 4;
    buf.copy(this.buffer, this.pos, 0, buf.length);
    this.pos += buf.length;
    return this;
  }

  writeInt16(i: number): this {
    if (this.messagePos < 0) {
      throw new BufferError("cannot writeInt16: no current message");
    }

    this.ensureAlloced(2);
    this.buffer.writeInt16BE(i, this.pos);
    this.pos += 2;
    return this;
  }

  writeInt32(i: number): this {
    if (this.messagePos < 0) {
      throw new BufferError("cannot writeInt32: no current message");
    }

    this.ensureAlloced(4);
    this.buffer.writeInt32BE(i, this.pos);
    this.pos += 4;
    return this;
  }

  writeUInt16(i: number): this {
    if (this.messagePos < 0) {
      throw new BufferError("cannot writeInt16: no current message");
    }

    this.ensureAlloced(2);
    this.buffer.writeUInt16BE(i, this.pos);
    this.pos += 2;
    return this;
  }

  writeUInt32(i: number): this {
    if (this.messagePos < 0) {
      throw new BufferError("cannot writeInt32: no current message");
    }

    this.ensureAlloced(4);
    this.buffer.writeUInt32BE(i, this.pos);
    this.pos += 4;
    return this;
  }

  unwrap(): Buffer {
    if (this.messagePos >= 0) {
      throw new BufferError(
        "cannot unwrap: an unfinished message is in the buffer"
      );
    }
    return this.buffer.slice(0, this.pos);
  }
}

export class ReadBuffer {
  private bufs: RingBuffer<Buffer>;
  private len: number;

  private buf0: Buffer | null;
  private pos0: number;
  private len0: number;

  private curMessageType: char;
  private curMessageLen: number;
  private curMessageLenUnread: number;
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
    if (this.buf0 === null) {
      this.buf0 = buf;
      this.len0 = buf.length;
      this.pos0 = 0;
      this.len = this.len0;
    } else {
      this.bufs.enq(buf);
      this.len += buf.length;
    }

    return this.bufs.full;
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

  private _finishMessage() {
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

        buf0.copy(ret, retPos, this.pos0, nread);
        retPos += nread;

        this.pos0 = this.len0;
        this.len -= nread;
        size -= nread;

        buf0 = this.ensureFirstBuf();
      } else {
        buf0.copy(ret, retPos, this.pos0, size);
        this.pos0 += size;
        this.len -= size;
        break;
      }
    }

    return ret;
  }

  private _readBuffer(size: number): Buffer {
    const buf0 = this.ensureFirstBuf();

    if (size === 0) {
      return EMPTY_BUFFER;
    }

    if (this.pos0 + size < this.len0) {
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

  readChar(): char {
    this.checkOverread(1);
    const buf0 = this.ensureFirstBuf();
    const ret = buf0.readUInt8(this.pos0);
    this.pos0++;
    this.curMessageLenUnread--;
    return ret;
  }

  readInt16(): number {
    this.checkOverread(2);
    const buf0 = this.ensureFirstBuf();

    if (this.pos0 + 2 < this.len0) {
      const ret = buf0.readInt16BE(this.pos0);
      this.pos0 += 2;
      this.curMessageLenUnread -= 2;
      return ret;
    }

    const buf = this._readBuffer(2);
    this.curMessageLenUnread -= 2;
    return buf.readInt16BE(0);
  }

  readInt32(): number {
    this.checkOverread(4);
    const buf0 = this.ensureFirstBuf();

    if (this.pos0 + 4 < this.len0) {
      const ret = buf0.readInt32BE(this.pos0);
      this.pos0 += 4;
      this.curMessageLenUnread -= 4;
      return ret;
    }

    const buf = this._readBuffer(4);
    this.curMessageLenUnread -= 4;
    return buf.readInt32BE(0);
  }

  readUInt16(): number {
    this.checkOverread(2);
    const buf0 = this.ensureFirstBuf();

    if (this.pos0 + 2 < this.len0) {
      const ret = buf0.readUInt16BE(this.pos0);
      this.pos0 += 2;
      this.curMessageLenUnread -= 2;
      return ret;
    }

    const buf = this._readBuffer(2);
    this.curMessageLenUnread -= 2;
    return buf.readUInt16BE(0);
  }

  readUInt32(): number {
    this.checkOverread(4);
    const buf0 = this.ensureFirstBuf();

    if (this.pos0 + 4 < this.len0) {
      const ret = buf0.readUInt32BE(this.pos0);
      this.pos0 += 4;
      this.curMessageLenUnread -= 4;
      return ret;
    }

    const buf = this._readBuffer(4);
    this.curMessageLenUnread -= 4;
    return buf.readUInt32BE(0);
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
    }

    if (this.curMessageLen === 0) {
      if (this.len < 4) {
        return false;
      }
      const buf0 = this.ensureFirstBuf();
      if (this.pos0 + 4 < this.len0) {
        this.curMessageLen = buf0.readInt32BE(this.pos0);
        this.pos0 += 4;
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

    let buf: Buffer = EMPTY_BUFFER;
    if (this.curMessageLenUnread > 0) {
      buf = this.readBuffer(this.curMessageLenUnread);
    }

    this._finishMessage();
    return buf;
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
