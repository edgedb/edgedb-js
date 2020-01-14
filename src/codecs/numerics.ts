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

import {ReadBuffer, WriteBuffer} from "../buffer";
import {ICodec, ScalarCodec} from "./ifaces";

const NBASE = BigInt("10000");
const ZERO = BigInt("0");
const NUMERIC_POS = 0x0000;
const NUMERIC_NEG = 0x4000;

export class BigIntCodec extends ScalarCodec implements ICodec {
  encode(buf: WriteBuffer, object: BigInt): void {
    const digits: BigInt[] = [];
    let sign = NUMERIC_POS;
    let uval = object;

    if (object === ZERO) {
      buf.writeUInt32(8); // len
      buf.writeUInt32(0); // ndigits + weight
      buf.writeUInt16(NUMERIC_POS); // sign
      buf.writeUInt16(0); // dscale
      return;
    }

    if (object < ZERO) {
      sign = NUMERIC_NEG;
      // @ts-ignore
      uval = -uval;
    }

    while (uval) {
      // @ts-ignore
      const mod: BigInt = uval % NBASE;
      // @ts-ignore
      uval /= NBASE;
      digits.push(mod);
    }

    buf.writeUInt32(8 + digits.length * 2); // len
    buf.writeUInt16(digits.length); // ndigits
    buf.writeUInt16(digits.length - 1); // weight
    buf.writeUInt16(sign);
    buf.writeUInt16(0); // dscale
    for (let i = digits.length - 1; i >= 0; i--) {
      buf.writeUInt16(Number(digits[i]));
    }
  }

  decode(buf: ReadBuffer): any {
    const ndigits = buf.readUInt16();
    const weight = buf.readInt16();
    const sign = buf.readUInt16();
    const dscale = buf.readUInt16();
    let result = "";

    switch (sign) {
      case NUMERIC_POS:
        break;
      case NUMERIC_NEG:
        result += "-";
        break;
      default:
        throw new Error("bad bigint sign data");
    }

    if (dscale !== 0) {
      throw new Error("bigint data has fractional part");
    }

    if (ndigits === 0) {
      return BigInt("0");
    }

    let i = weight;
    let d = 0;

    while (i >= 0) {
      if (i <= weight && d < ndigits) {
        result += buf
          .readUInt16()
          .toString()
          .padStart(4, "0");
        d++;
      } else {
        result += "0000";
      }
      i--;
    }

    return BigInt(result);
  }
}
