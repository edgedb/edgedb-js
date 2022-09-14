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

import {Buffer} from "../globals.deno.ts";

import {ReadBuffer, WriteBuffer} from "../primitives/buffer.ts";
import {ICodec, ScalarCodec} from "./ifaces.ts";
import {InvalidArgumentError, ProtocolError} from "../errors/index.ts";

export class JSONCodec extends ScalarCodec implements ICodec {
  encode(buf: WriteBuffer, object: any): void {
    let val: string;
    try {
      val = JSON.stringify(object);
    } catch (err) {
      throw new InvalidArgumentError(
        `a JSON-serializable value was expected, got "${object}"`
      );
    }

    // JSON.stringify can return undefined
    if (typeof val !== "string") {
      throw new InvalidArgumentError(
        `a JSON-serializable value was expected, got "${object}"`
      );
    }

    const strbuf = Buffer.from(val, "utf8");
    buf.writeInt32(strbuf.length + 1);
    buf.writeChar(1); // JSON format version
    buf.writeBuffer(strbuf);
  }

  decode(buf: ReadBuffer): any {
    const format = buf.readUInt8();
    if (format !== 1) {
      throw new ProtocolError(`unexpected JSON format ${format}`);
    }
    return JSON.parse(buf.consumeAsString());
  }
}

export class JSONStringCodec extends ScalarCodec implements ICodec {
  encode(buf: WriteBuffer, object: any): void {
    if (typeof object !== "string") {
      throw new InvalidArgumentError(`a string was expected, got "${object}"`);
    }

    const strbuf = Buffer.from(object, "utf8");
    buf.writeInt32(strbuf.length + 1);
    buf.writeChar(1); // JSON format version
    buf.writeBuffer(strbuf);
  }

  decode(buf: ReadBuffer): any {
    const format = buf.readUInt8();
    if (format !== 1) {
      throw new ProtocolError(`unexpected JSON format ${format}`);
    }
    return buf.consumeAsString();
  }
}
