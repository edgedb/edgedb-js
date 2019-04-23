export class RingBufferError extends Error {}

export class RingBuffer<T> {
  private buffer: Array<T | undefined>;
  private len: number;
  private reader: number;
  private writer: number;
  private capacity: number;

  constructor({capacity}: {capacity: number}) {
    if (capacity <= 0 || capacity >= 0xffffffff) {
      throw new RingBufferError("invalid capacity");
    }

    this.buffer = new Array(capacity);
    this.reader = 0;
    this.writer = 0;
    this.capacity = capacity;
    this.len = 0;
  }

  get full(): boolean {
    return this.len === this.capacity - 1;
  }

  get length(): number {
    return this.len;
  }

  enq(data: T): void {
    const nextWriter = (this.writer + 1) % this.capacity;
    if (this.reader === nextWriter) {
      throw new RingBufferError(
        `RingBuffer(capacity=${this.capacity}) is full`
      );
    }

    this.buffer[this.writer] = data;
    this.writer = nextWriter;
    this.len++;
  }

  deq(): T | undefined {
    if (this.reader === this.writer) {
      return undefined;
    }

    const ret = this.buffer[this.reader];
    this.buffer[this.reader] = undefined; // let it GC
    this.reader = (this.reader + 1) % this.capacity;
    this.len--;
    return ret;
  }

  clear() {
    this.reader = 0;
    this.writer = 0;
  }
}
