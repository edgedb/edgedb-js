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

import type { ReadBuffer, WriteBuffer } from "../primitives/buffer";
import { type ICodec, ScalarCodec } from "./ifaces";
import { InvalidArgumentError } from "../errors";

export class Int64Codec extends ScalarCodec implements ICodec {
  tsType = "number";
  encode(buf: WriteBuffer, object: any): void {
    if (typeof object !== "number") {
      throw new InvalidArgumentError(`a number was expected, got "${object}"`);
    }
    buf.writeInt32(8);
    buf.writeInt64(object);
  }

  decode(buf: ReadBuffer): any {
    return buf.readInt64();
  }
}

export class Int64BigintCodec extends ScalarCodec implements ICodec {
  encode(buf: WriteBuffer, object: any): void {
    if (typeof object !== "bigint") {
      throw new InvalidArgumentError(`a bigint was expected, got "${object}"`);
    }
    buf.writeInt32(8);
    buf.writeBigInt64(object);
  }

  decode(buf: ReadBuffer): any {
    return buf.readBigInt64();
  }
}

export class Int32Codec extends ScalarCodec implements ICodec {
  tsType = "number";
  encode(buf: WriteBuffer, object: any): void {
    if (typeof object !== "number") {
      throw new InvalidArgumentError(`a number was expected, got "${object}"`);
    }
    buf.writeInt32(4);
    buf.writeInt32(object as number);
  }

  decode(buf: ReadBuffer): any {
    return buf.readInt32();
  }
}

export class Int16Codec extends ScalarCodec implements ICodec {
  tsType = "number";
  encode(buf: WriteBuffer, object: any): void {
    if (typeof object !== "number") {
      throw new InvalidArgumentError(`a number was expected, got "${object}"`);
    }
    buf.writeInt32(2);
    buf.writeInt16(object as number);
  }

  decode(buf: ReadBuffer): any {
    return buf.readInt16();
  }
}

export class Float32Codec extends ScalarCodec implements ICodec {
  tsType = "number";
  encode(buf: WriteBuffer, object: any): void {
    if (typeof object !== "number") {
      throw new InvalidArgumentError(`a number was expected, got "${object}"`);
    }
    buf.writeInt32(4);
    buf.writeFloat32(object as number);
  }

  decode(buf: ReadBuffer): any {
    return buf.readFloat32();
  }
}

export class Float64Codec extends ScalarCodec implements ICodec {
  tsType = "number";
  encode(buf: WriteBuffer, object: any): void {
    if (typeof object !== "number") {
      throw new InvalidArgumentError(`a number was expected, got "${object}"`);
    }
    buf.writeInt32(8);
    buf.writeFloat64(object as number);
  }

  decode(buf: ReadBuffer): any {
    return buf.readFloat64();
  }
}
