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

import {net, tls} from "./adapter.node";
import {PROTO_VER, PROTO_VER_MIN, BaseRawConnection} from "./baseConn";
import {CodecsRegistry} from "./codecs/registry";
import {Address, NormalizedConnectConfig} from "./conUtils";
import {versionGreaterThan, versionGreaterThanOrEqual} from "./utils";
import {ProtocolVersion} from "./ifaces";
import {WriteMessageBuffer} from "./primitives/buffer";
import Event from "./primitives/event";
import char, * as chars from "./primitives/chars";
import * as scram from "./scram";
import * as errors from "./errors";

enum AuthenticationStatuses {
  AUTH_OK = 0,
  AUTH_SASL = 10,
  AUTH_SASL_CONTINUE = 11,
  AUTH_SASL_FINAL = 12,
}

export class RawConnection extends BaseRawConnection {
  private config: NormalizedConnectConfig;

  private sock: net.Socket;
  private paused: boolean;

  /** @internal */
  protected constructor(
    sock: net.Socket,
    config: NormalizedConnectConfig,
    registry: CodecsRegistry
  ) {
    super(registry);

    this.config = config;

    this.paused = false;
    this.sock = sock;
    this.sock.setNoDelay();
    this.sock.on("error", this._onError.bind(this));
    this.sock.on("data", this._onData.bind(this));

    if (tls.TLSSocket && this.sock instanceof tls.TLSSocket) {
      // This is bizarre, but "connect" can be fired before
      // "secureConnect" for some reason. The documentation
      // doesn't provide a clue why. We need to be able to validate
      // that the 'edgedb-binary' ALPN protocol was selected
      // in connect when we're connecting over TLS.
      // @ts-ignore
      this.sock.on("secureConnect", this._onConnect.bind(this));
    } else {
      this.sock.on("connect", this._onConnect.bind(this));
    }
    this.sock.on("close", this._onClose.bind(this));
  }

  private _onConnect(): void {
    this.connWaiter.set();
  }

  private _onClose(): void {
    if (!this.connected) {
      return;
    }

    const newErr = new errors.ClientConnectionClosedError(
      `the connection has been aborted`
    );

    if (!this.connWaiter.done || this.messageWaiter) {
      /* This can happen, particularly, during the connect phase.
          If the connection is aborted with a client-side timeout, there can be
          a situation where the connection has actually been established,
          and so `conn.sock.destroy` would simply close the socket,
          without invoking the 'error' event.
      */
      this._abortWaiters(newErr);
    }

    if (
      this.buffer.takeMessage() &&
      this.buffer.getMessageType() === chars.$E
    ) {
      newErr.source = this._parseErrorMessage();
    }

    this._abortWithError(newErr);
  }

  protected _onError(err: Error): void {
    const newErr = new errors.ClientConnectionClosedError(
      `network error: ${err}`
    );
    newErr.source = err;

    try {
      this._abortWaiters(newErr);
    } finally {
      // We cannot recover this raw connection from a socket error.
      // Just abort it and let the higher-level API reconnect.
      this._abortWithError(newErr);
    }
  }

  private _onData(data: Buffer): void {
    let pause = false;
    try {
      pause = this.buffer.feed(data);
    } catch (e: any) {
      if (this.messageWaiter) {
        this.messageWaiter.setError(e);
        this.messageWaiter = null;
      } else {
        throw e;
      }
    }

    if (pause) {
      this.paused = true;
      this.sock.pause();
    }

    if (this.messageWaiter) {
      if (this.buffer.takeMessage()) {
        this.messageWaiter.set();
        this.messageWaiter = null;
      }
    }
  }

  protected async _waitForMessage(): Promise<void> {
    if (this.buffer.takeMessage()) {
      return;
    }

    if (this.paused) {
      this.paused = false;
      this.sock.resume();
    }

    this.sock.ref();
    this.messageWaiter = new Event();
    try {
      await this.messageWaiter.wait();
    } finally {
      this.sock.unref();
    }
  }

  protected _sendData(data: Buffer): void {
    this.sock.write(data);
  }

  /** @internal */
  private static newSock(
    addr: string | [string, number],
    options?: tls.ConnectionOptions
  ): net.Socket {
    if (typeof addr === "string") {
      // unix socket
      return net.createConnection(addr);
    }

    const [host, port] = addr;
    if (options == null) {
      return net.createConnection(port, host);
    }

    const opts = {...options, host, port};
    return tls.connect(opts);
  }

  protected _abort(): void {
    if (this.sock && this.connected) {
      this.sock.destroy();
    }
    super._abort();
  }

  async close(): Promise<void> {
    if (this.sock && this.connected) {
      this.sock.write(
        new WriteMessageBuffer().beginMessage(chars.$X).endMessage().unwrap()
      );
    }
    return await super.close();
  }

  /** @internal */
  static async connectWithTimeout(
    addr: Address,
    config: NormalizedConnectConfig,
    registry: CodecsRegistry,
    useTls: boolean = true
  ): Promise<RawConnection> {
    const sock = this.newSock(
      addr,
      useTls ? config.connectionParams.tlsOptions : undefined
    );
    const conn = new this(sock, config, registry);
    const connPromise = conn.connect();
    let timeoutCb = null;
    let timeoutHappened = false;
    // set-up a timeout
    if (config.connectTimeout) {
      timeoutCb = setTimeout(() => {
        if (!conn.connected) {
          timeoutHappened = true;
          conn.sock.destroy(
            new errors.ClientConnectionTimeoutError(
              `connection timed out (${config.connectTimeout}ms)`
            )
          );
        }
      }, config.connectTimeout);
    }

    try {
      await connPromise;
    } catch (e: any) {
      conn._abort();
      if (timeoutHappened && e instanceof errors.ClientConnectionClosedError) {
        /*
          A race between our timeout `timeoutCb` callback and the client
          being actually connected.  See the `ConnectionImpl._onClose` method.
        */
        throw new errors.ClientConnectionTimeoutError(
          `connection timed out (${config.connectTimeout}ms)`
        );
      }
      if (e instanceof errors.EdgeDBError) {
        throw e;
      } else {
        let err: errors.ClientConnectionError;
        switch (e.code) {
          case "EPROTO":
            if (useTls === true) {
              // connecting over tls failed
              // try to connect using clear text
              try {
                return this.connectWithTimeout(addr, config, registry, false);
              } catch {
                // pass
              }
            }

            err = new errors.ClientConnectionFailedError(
              `${e.message}\n` +
                `Attempted to connect using the following credentials:\n` +
                `${config.connectionParams.explainConfig()}\n`
            );
            break;
          case "ECONNREFUSED":
          case "ECONNABORTED":
          case "ECONNRESET":
          case "ENOTFOUND": // DNS name not found
          case "ENOENT": // unix socket is not created yet
            err = new errors.ClientConnectionFailedTemporarilyError(
              `${e.message}\n` +
                `Attempted to connect using the following credentials:\n` +
                `${config.connectionParams.explainConfig()}\n`
            );
            break;
          default:
            err = new errors.ClientConnectionFailedError(
              `${e.message}\n` +
                `Attempted to connect using the following credentials:\n` +
                `${config.connectionParams.explainConfig()}\n`
            );
            break;
        }
        err.source = e;
        throw err;
      }
    } finally {
      if (timeoutCb != null) {
        clearTimeout(timeoutCb);
      }
    }
    return conn;
  }

  protected async connect(): Promise<void> {
    await this.connWaiter.wait();

    if (this.sock instanceof tls.TLSSocket) {
      if (this.sock.alpnProtocol !== "edgedb-binary") {
        throw new errors.ClientConnectionFailedError(
          "The server doesn't support the edgedb-binary protocol."
        );
      }
    }

    const handshake = new WriteMessageBuffer();

    handshake
      .beginMessage(chars.$V)
      .writeInt16(this.protocolVersion[0])
      .writeInt16(this.protocolVersion[1]);

    handshake.writeInt16(2);
    handshake.writeString("user");
    handshake.writeString(this.config.connectionParams.user);
    handshake.writeString("database");
    handshake.writeString(this.config.connectionParams.database);

    // No extensions requested
    handshake.writeInt16(0);
    handshake.endMessage();

    this.sock.write(handshake.unwrap());

    while (true) {
      if (!this.buffer.takeMessage()) {
        await this._waitForMessage();
      }

      const mtype = this.buffer.getMessageType();

      switch (mtype) {
        case chars.$v: {
          const hi = this.buffer.readInt16();
          const lo = this.buffer.readInt16();
          this._parseHeaders();
          this.buffer.finishMessage();
          const proposed: ProtocolVersion = [hi, lo];

          if (
            versionGreaterThan(proposed, PROTO_VER) ||
            versionGreaterThan(PROTO_VER_MIN, proposed)
          ) {
            throw new Error(
              `the server requested an unsupported version of ` +
                `the protocol ${hi}.${lo}`
            );
          }

          this.protocolVersion = [hi, lo];
          break;
        }

        case chars.$R: {
          const status = this.buffer.readInt32();

          if (status === AuthenticationStatuses.AUTH_OK) {
            this.buffer.finishMessage();
          } else if (status === AuthenticationStatuses.AUTH_SASL) {
            await this._authSasl();
          } else {
            throw new Error(
              `unsupported authentication method requested by the ` +
                `server: ${status}`
            );
          }

          break;
        }

        case chars.$K: {
          this.serverSecret = this.buffer.readBuffer(32);
          this.buffer.finishMessage();
          break;
        }

        case chars.$E: {
          throw this._parseErrorMessage();
        }

        case chars.$Z: {
          this._parseSyncMessage();

          if (
            !(this.sock instanceof tls.TLSSocket) &&
            // @ts-ignore
            typeof Deno === "undefined" &&
            versionGreaterThanOrEqual(this.protocolVersion, [0, 11])
          ) {
            const [major, minor] = this.protocolVersion;
            throw new Error(
              `the protocol version requires TLS: ${major}.${minor}`
            );
          }

          this.connected = true;
          return;
        }

        default:
          this._fallthrough();
      }
    }
  }

  private async _authSasl(): Promise<void> {
    const numMethods = this.buffer.readInt32();
    if (numMethods <= 0) {
      throw new Error(
        "the server requested SASL authentication but did not offer any methods"
      );
    }

    const methods = [];
    let foundScram256 = false;
    for (let _ = 0; _ < numMethods; _++) {
      const method = this.buffer.readLenPrefixedBuffer().toString("utf8");
      if (method === "SCRAM-SHA-256") {
        foundScram256 = true;
      }
      methods.push(method);
    }

    this.buffer.finishMessage();

    if (!foundScram256) {
      throw new Error(
        `the server offered the following SASL authentication ` +
          `methods: ${methods.join(", ")}, neither are supported.`
      );
    }

    const clientNonce = await scram.generateNonce();
    const [clientFirst, clientFirstBare] = scram.buildClientFirstMessage(
      clientNonce,
      this.config.connectionParams.user
    );

    const wb = new WriteMessageBuffer();
    wb.beginMessage(chars.$p)
      .writeString("SCRAM-SHA-256")
      .writeString(clientFirst)
      .endMessage();
    this.sock.write(wb.unwrap());

    await this._ensureMessage(chars.$R, "SASLContinue");
    let status = this.buffer.readInt32();
    if (status !== AuthenticationStatuses.AUTH_SASL_CONTINUE) {
      throw new Error(
        `expected SASLContinue from the server, received ${status}`
      );
    }

    const serverFirst = this.buffer.readString();
    this.buffer.finishMessage();

    const [serverNonce, salt, itercount] =
      scram.parseServerFirstMessage(serverFirst);

    const [clientFinal, expectedServerSig] = scram.buildClientFinalMessage(
      this.config.connectionParams.password || "",
      salt,
      itercount,
      clientFirstBare,
      serverFirst,
      serverNonce
    );

    wb.reset().beginMessage(chars.$r).writeString(clientFinal).endMessage();
    this.sock.write(wb.unwrap());

    await this._ensureMessage(chars.$R, "SASLFinal");
    status = this.buffer.readInt32();
    if (status !== AuthenticationStatuses.AUTH_SASL_FINAL) {
      throw new Error(
        `expected SASLFinal from the server, received ${status}`
      );
    }

    const serverFinal = this.buffer.readString();
    this.buffer.finishMessage();

    const serverSig = scram.parseServerFinalMessage(serverFinal);

    if (!serverSig.equals(expectedServerSig)) {
      throw new Error("server SCRAM proof does not match");
    }
  }

  private async _ensureMessage(
    expectedMtype: char,
    err: string
  ): Promise<void> {
    if (!this.buffer.takeMessage()) {
      await this._waitForMessage();
    }
    const mtype = this.buffer.getMessageType();

    switch (mtype) {
      case chars.$E: {
        throw this._parseErrorMessage();
      }

      case expectedMtype: {
        return;
      }

      default: {
        throw new Error(
          `expected ${err} from the server, received ${chars.chr(mtype)}`
        );
      }
    }
  }
}
