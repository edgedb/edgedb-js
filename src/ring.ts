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

  clear(): void {
    if (this.len) {
      while (this.reader !== this.writer) {
        this.buffer[this.reader] = undefined;
        this.reader = (this.reader + 1) % this.capacity;
      }
    }

    this.reader = 0;
    this.writer = 0;
    this.len = 0;
  }
}
