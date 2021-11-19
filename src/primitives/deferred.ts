/*!
 * This source file is part of the EdgeDB open source project.
 *
 * Copyright 2020-present MagicStack Inc. and the EdgeDB authors.
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

export class Deferred<T> {
  private _promise: Promise<T | undefined>;
  private _resolve?: (value?: T | PromiseLike<T> | undefined) => void;
  private _reject?: (reason?: any) => void;
  private _result: T | PromiseLike<T> | undefined;
  private _done: boolean;

  get promise(): Promise<T | undefined> {
    return this._promise;
  }

  get done(): boolean {
    return this._done;
  }

  get result(): T | PromiseLike<T> | undefined {
    if (!this._done) {
      throw new Error("The deferred is not resolved.");
    }
    return this._result;
  }

  async setResult(value?: T | PromiseLike<T> | undefined): Promise<void> {
    while (!this._resolve) {
      await new Promise<void>((resolve) => process.nextTick(resolve));
    }
    this._resolve(value);
  }

  async setFailed(reason?: any): Promise<void> {
    while (!this._reject) {
      await new Promise<void>((resolve) => process.nextTick(resolve));
    }
    this._reject(reason);
  }

  constructor() {
    this._done = false;
    this._reject = undefined;
    this._resolve = undefined;

    this._promise = new Promise((resolve, reject) => {
      this._reject = reject;

      this._resolve = (value?: T | PromiseLike<T> | undefined) => {
        this._done = true;
        this._result = value;
        resolve(value);
      };
    });
  }
}
