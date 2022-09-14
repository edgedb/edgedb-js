/*!
 * This source file is part of the EdgeDB open source project.
 *
 * Copyright 2022-present MagicStack Inc. and the EdgeDB authors.
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

import {Buffer} from "./globals.deno.ts";

import {CodecsRegistry} from "./codecs/registry.ts";
import {Address} from "./conUtils.ts";
import {PROTO_VER, BaseRawConnection} from "./baseConn.ts";
import Event from "./primitives/event.ts";
import * as chars from "./primitives/chars.ts";
import {InternalClientError, ProtocolError} from "./errors/index.ts";

// @ts-ignore
if (typeof fetch === "undefined") {
  // Pre 17.5 NodeJS environment.
  // @ts-ignore
  globalThis.fetch = require("node-fetch"); // tslint:disable-line
}

interface FetchConfig {
  address: Address | string;
  database: string;
  user?: string;
  token?: string;
}

const PROTO_MIME = `application/x.edgedb.v_${PROTO_VER[0]}_${PROTO_VER[1]}.binary'`;

class BaseFetchConnection extends BaseRawConnection {
  protected config: FetchConfig;
  protected addr: string;

  constructor(config: FetchConfig, registry: CodecsRegistry) {
    super(registry);
    this.config = config;
    this.addr = this._buildAddr();
  }

  protected _buildAddr(): string {
    this.throwNotImplemented("_buildAddr");
  }

  protected async _waitForMessage(): Promise<void> {
    if (this.buffer.takeMessage()) {
      return;
    }

    if (this.messageWaiter == null || this.messageWaiter.done) {
      throw new InternalClientError(
        `message waiter was not initialized before waiting for response`
      );
    }

    await this.messageWaiter.wait();
  }

  protected async __sendData(data: Buffer): Promise<void> {
    if (this.buffer.takeMessage()) {
      const mtype = this.buffer.getMessageType();
      throw new InternalClientError(
        `sending request before reading all data of the previous one: ` +
          `${chars.chr(mtype)}`
      );
    }

    if (this.messageWaiter != null && !this.messageWaiter.done) {
      throw new InternalClientError(
        `sending request before waiting for completion of the previous one`
      );
    }

    this.messageWaiter = new Event();

    try {
      const headers: {[index: string]: string} = {"Content-Type": PROTO_MIME};

      if (this.config.user !== undefined) {
        headers["X-EdgeDB-User"] = this.config.user;
      }

      if (this.config.token !== undefined) {
        headers.Authorization = `Bearer ${this.config.token}`;
      }

      const resp: any = await fetch(this.addr, {
        method: "post",
        body: data,
        headers,
      });

      if (!resp.ok) {
        throw new ProtocolError(
          `fetch failed with status code ${resp.status}: ${resp.statusText}`
        );
      }

      const respData: any = await resp.arrayBuffer();
      const buf = Buffer.from(respData);

      let pause = false;
      try {
        pause = this.buffer.feed(buf);
      } catch (e: any) {
        this.messageWaiter.setError(e);
      }

      if (pause) {
        // unreachable
        throw new ProtocolError("too much data received");
      }

      if (!this.buffer.takeMessage()) {
        throw new ProtocolError("no binary protocol messages in the response");
      }

      this.messageWaiter.set();
    } catch (e) {
      this.messageWaiter.setError(e);
    }
  }

  protected _sendData(data: Buffer): void {
    this.__sendData(data);
  }

  static create(
    config: FetchConfig,
    registry: CodecsRegistry
  ): BaseFetchConnection {
    const conn = new this(config, registry);
    conn.connected = true;
    conn.exposeErrorAttributes = true;
    return conn;
  }
}

export class AdminUIFetchConnection extends BaseFetchConnection {
  protected _buildAddr(): string {
    const config = this.config;

    return `${
      typeof config.address === "string"
        ? config.address
        : `http://${config.address[0]}:${config.address[1]}`
    }/db/${config.database}`;
  }
}
