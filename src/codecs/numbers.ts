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

export class Int64Codec extends ScalarCodec implements ICodec {
  encode(buf: WriteBuffer, object: any): void {
    if (typeof object !== "number") {
      throw new Error(`a number was expected, got "${object}"`);
    }
    buf.writeInt32(8);
    buf.writeInt64(object);
  }

  decode(buf: ReadBuffer): any {
    return buf.readInt64();
  }
}

export class Int64StringCodec extends ScalarCodec implements ICodec {
  encode(_buf: WriteBuffer, _object: any): void {
    throw new Error("not implemented");
  }

  decode(buf: ReadBuffer): any {
    return decodeInt64ToString(buf.readBuffer(8));
  }
}

export class Int32Codec extends ScalarCodec implements ICodec {
  encode(buf: WriteBuffer, object: any): void {
    if (typeof object !== "number") {
      throw new Error(`a number was expected, got "${object}"`);
    }
    buf.writeInt32(4);
    buf.writeInt32(<number>object);
  }

  decode(buf: ReadBuffer): any {
    return buf.readInt32();
  }
}

export class Int16Codec extends ScalarCodec implements ICodec {
  encode(buf: WriteBuffer, object: any): void {
    if (typeof object !== "number") {
      throw new Error(`a number was expected, got "${object}"`);
    }
    buf.writeInt32(2);
    buf.writeInt16(<number>object);
  }

  decode(buf: ReadBuffer): any {
    return buf.readInt16();
  }
}

export class Float32Codec extends ScalarCodec implements ICodec {
  encode(buf: WriteBuffer, object: any): void {
    if (typeof object !== "number") {
      throw new Error(`a number was expected, got "${object}"`);
    }
    buf.writeInt32(4);
    buf.writeFloat32(<number>object);
  }

  decode(buf: ReadBuffer): any {
    return buf.readFloat32();
  }
}

export class Float64Codec extends ScalarCodec implements ICodec {
  encode(buf: WriteBuffer, object: any): void {
    if (typeof object !== "number") {
      throw new Error(`a number was expected, got "${object}"`);
    }
    buf.writeInt32(8);
    buf.writeFloat64(<number>object);
  }

  decode(buf: ReadBuffer): any {
    return buf.readFloat64();
  }
}

export function decodeInt64ToString(buf: Buffer): string {
  /* Render int64 binary into a decimal string.

     Avoid using BigInts (not all platforms support them) or number
     arithmetics (there's no int64 in JS).
  */

  if (buf.length !== 8) {
    throw new Error("expected 8 bytes buffer");
  }

  let inp: number[] = Array.from(buf);

  let negative = false;
  if (inp[0] & 0x80) {
    // A negative integer; invert all bits.
    inp = inp.map((x) => x ^ 0xff);
    // Account for the two's compliment's `1`.
    inp[inp.length - 1]++;

    negative = true;
  }

  let result = "0";

  for (const digit of inp) {
    /* The algorithm:

    An int64 is a sequence of 8 bytes on the wire, say

      b1 b2 b3 b4 b5 b6 b7 b8

    To decode this into a decimal number we can use the following
    formula:

      b8 * 256^0 + b7 * 256^1 + b6 * 256^2 + ... + b1 * 256^7

    which can be represented as

      b8 + 256 * (b7 + 256 * (b6 + 256 * (b5 + 256 * (... b1 * 256))))

    The code below does exactly that only using a string as a storage
    for the result number. That way we can circumvent the JS limitation
    of not supporting proper integers.
    */

    let acc = digit;
    let ret = "";

    for (let j = result.length - 1; j >= 0; j--) {
      const num = parseInt(result[j], 10) * 256 + acc;
      ret = (num % 10) + ret;
      acc = Math.floor(num / 10);
    }

    result = acc ? acc + ret : ret;
  }

  return negative ? `-${result}` : result;
}
