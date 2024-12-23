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

import {
  type ReadBuffer,
  type WriteBuffer,
  utf8Encoder,
} from "../primitives/buffer";
import { type ICodec, ScalarCodec } from "./ifaces";
import { InvalidArgumentError, ProtocolError } from "../errors";

export class JSONCodec extends ScalarCodec implements ICodec {
  override tsType = "unknown";

  readonly jsonFormat: number | null = 1;

  encode(buf: WriteBuffer, object: any): void {
    let val: string;
    try {
      val = JSON.stringify(object);
    } catch (_err) {
      throw new InvalidArgumentError(
        `a JSON-serializable value was expected, got "${object}"`,
      );
    }

    // JSON.stringify can return undefined
    if (typeof val !== "string") {
      throw new InvalidArgumentError(
        `a JSON-serializable value was expected, got "${object}"`,
      );
    }

    const strbuf = utf8Encoder.encode(val);
    if (this.jsonFormat !== null) {
      buf.writeInt32(strbuf.length + 1);
      buf.writeChar(this.jsonFormat);
    } else {
      buf.writeInt32(strbuf.length);
    }
    buf.writeBuffer(strbuf);
  }

  decode(buf: ReadBuffer): any {
    if (this.jsonFormat !== null) {
      const format = buf.readUInt8();
      if (format !== this.jsonFormat) {
        throw new ProtocolError(`unexpected JSON format ${format}`);
      }
    }
    return JSON.parse(buf.consumeAsString());
  }
}

export class PgTextJSONCodec extends JSONCodec {
  override readonly jsonFormat = null;
}

export class JSONStringCodec extends ScalarCodec implements ICodec {
  readonly jsonFormat: number | null = 1;

  encode(buf: WriteBuffer, object: any): void {
    if (typeof object !== "string") {
      throw new InvalidArgumentError(`a string was expected, got "${object}"`);
    }

    const strbuf = utf8Encoder.encode(object);
    if (this.jsonFormat !== null) {
      buf.writeInt32(strbuf.length + 1);
      buf.writeChar(this.jsonFormat);
    } else {
      buf.writeInt32(strbuf.length);
    }
    buf.writeBuffer(strbuf);
  }

  decode(buf: ReadBuffer): any {
    if (this.jsonFormat !== null) {
      const format = buf.readUInt8();
      if (format !== this.jsonFormat) {
        throw new ProtocolError(`unexpected JSON format ${format}`);
      }
    }
    return buf.consumeAsString();
  }
}

export class PgTextJSONStringCodec extends JSONStringCodec {
  override readonly jsonFormat = null;
}
