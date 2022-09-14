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

import * as bi from "../primitives/bigint.ts";

const KiB = 1024;
const MiB = 1024 * KiB;
const GiB = 1024 * MiB;
const TiB = 1024 * GiB;
const PiB = 1024 * TiB;

export class ConfigMemory {
  private readonly _bytes: bi.BigIntLike;

  constructor(bytes: bi.BigIntLike) {
    this._bytes = bytes;
  }

  get bytes(): number {
    return Number(this._bytes);
  }

  get bytesBigInt(): BigInt {
    return this._bytes as BigInt;
  }

  get kibibytes(): number {
    return Number(this._bytes) / KiB;
  }

  get mebibytes(): number {
    return Number(this._bytes) / MiB;
  }

  get gibibytes(): number {
    return Number(this._bytes) / GiB;
  }

  get tebibytes(): number {
    return Number(this._bytes) / TiB;
  }

  get pebibytes(): number {
    return Number(this._bytes) / PiB;
  }

  toString(): string {
    const bytes = this._bytes;
    const bigPiB = bi.make(PiB);
    if (bi.gte(bytes, bigPiB) && Number(bi.remainder(bytes, bigPiB)) === 0) {
      return `${bi.div(bytes, bigPiB)}PiB`;
    }
    const bigTiB = bi.make(TiB);
    if (bi.gte(bytes, bigTiB) && Number(bi.remainder(bytes, bigTiB)) === 0) {
      return `${bi.div(bytes, bigTiB)}TiB`;
    }
    const bigGiB = bi.make(GiB);
    if (bi.gte(bytes, bigGiB) && Number(bi.remainder(bytes, bigGiB)) === 0) {
      return `${bi.div(bytes, bigGiB)}GiB`;
    }
    const bigMiB = bi.make(MiB);
    if (bi.gte(bytes, bigMiB) && Number(bi.remainder(bytes, bigMiB)) === 0) {
      return `${bi.div(bytes, bigMiB)}MiB`;
    }
    const bigKiB = bi.make(KiB);
    if (bi.gte(bytes, bigKiB) && Number(bi.remainder(bytes, bigKiB)) === 0) {
      return `${bi.div(bytes, bigKiB)}KiB`;
    }
    return `${bytes}B`;
  }
}
