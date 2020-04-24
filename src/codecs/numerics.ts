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

const NUMERIC_POS = 0x0000;
const NUMERIC_NEG = 0x4000;

export class BigIntCodec extends ScalarCodec implements ICodec {
  encode(buf: WriteBuffer, object: BigInt): void {
    const NBASE = BigInt("10000");
    const ZERO = BigInt("0");

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
    return BigInt(decodeBigIntToString(buf));
  }
}

export class BigIntStringCodec extends ScalarCodec implements ICodec {
  encode(_buf: WriteBuffer, _object: BigInt): void {
    throw new Error("not implemented");
  }

  decode(buf: ReadBuffer): any {
    return decodeBigIntToString(buf);
  }
}

export class DecimalStringCodec extends ScalarCodec implements ICodec {
  encode(_buf: WriteBuffer, _object: BigInt): void {
    throw new Error("not implemented");
  }

  decode(buf: ReadBuffer): any {
    return decodeDecimalToString(buf);
  }
}

function decodeBigIntToString(buf: ReadBuffer): string {
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
    return "0";
  }

  let i = weight;
  let d = 0;

  while (i >= 0) {
    if (i <= weight && d < ndigits) {
      const digit = buf.readUInt16().toString();
      result += d > 0 ? digit.padStart(4, "0") : digit;
      d++;
    } else {
      result += "0000";
    }
    i--;
  }

  return result;
}

function decodeDecimalToString(buf: ReadBuffer): string {
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
      throw new Error("bad decimal sign data");
  }

  let d = 0;
  if (weight < 0) {
    d = weight + 1;
    result += "0";
  } else {
    for (d = 0; d <= weight; d++) {
      const digit = d < ndigits ? buf.readUInt16() : 0;
      let sdigit = digit.toString();
      if (d > 0) {
        sdigit = sdigit.padStart(4, "0");
      }
      result += sdigit;
    }
  }

  if (dscale > 0) {
    result += ".";
    const end = result.length + dscale;
    for (let i = 0; i < dscale; d++, i += 4) {
      const digit = d >= 0 && d < ndigits ? buf.readUInt16() : 0;
      result += digit.toString().padStart(4, "0");
    }
    result = result.slice(0, end);
  }

  return result;
}
