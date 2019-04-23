import {ReadBuffer, WriteBuffer} from "./buffer";
import char, * as chars from "./chars";

import * as net from "net";

export interface ConnectConfig {
  port?: number;
  host?: string;
}

enum AuthenticationStatuses {
  AUTH_OK = 0,
  AUTH_SASL = 10,
  AUTH_SASL_CONTINUE = 11,
  AUTH_SASL_FINAL = 12,
}

enum TransactionStatus {
  TRANS_IDLE = 0, // connection idle
  TRANS_ACTIVE = 1, // command in progress
  TRANS_INTRANS = 2, // idle, within transaction block
  TRANS_INERROR = 3, // idle, within failed transaction
  TRANS_UNKNOWN = 4, // cannot determine status
}

export type onConnect = (err: Error | null, con: Connection | null) => void;

export default function connect(
  options?: ConnectConfig
): Promise<AwaitConnection>;
export default function connect(
  options?: ConnectConfig,
  callback?: onConnect
): void;
export default function connect(
  options?: ConnectConfig,
  callback?: onConnect
): Promise<AwaitConnection> | void {
  if (callback) {
    AwaitConnection.connect(options)
      .then((conn) => {
        callback(null, Connection.wrap(conn));
      })
      .catch((error) => {
        callback(<Error>error, null);
      });
  } else {
    return AwaitConnection.connect(options);
  }
}

class AwaitConnection {
  private sock: net.Socket;
  private paused: boolean;

  private serverSecret: number;
  private serverSettings: Map<string, string>;
  private serverXactStatus: TransactionStatus;

  private buffer: ReadBuffer;

  private messageWaiterResolve: ((value: any) => void) | null;
  private messageWaiterReject: ((error: Error) => void) | null;

  private connWaiter: Promise<void>;
  private connWaiterResolve: ((value: any) => void) | null;
  private connWaiterReject: ((value: any) => void) | null;

  private constructor(sock: net.Socket) {
    this.buffer = new ReadBuffer();

    this.serverSecret = -1;
    this.serverSettings = new Map<string, string>();
    this.serverXactStatus = TransactionStatus.TRANS_UNKNOWN;

    this.messageWaiterResolve = null;
    this.messageWaiterReject = null;

    this.connWaiterResolve = null;
    this.connWaiterReject = null;
    this.connWaiter = new Promise<void>((resolve, reject) => {
      this.connWaiterResolve = resolve;
      this.connWaiterReject = reject;
    });

    this.paused = false;
    this.sock = sock;
    this.sock.on("error", this.onError.bind(this));
    this.sock.on("data", this.onData.bind(this));
    this.sock.on("connect", this.onConnect.bind(this));
  }

  private async waitForMessage(): Promise<void> {
    if (this.buffer.takeMessage()) {
      return;
    }

    if (this.paused) {
      this.paused = false;
      this.sock.resume();
    }

    await new Promise<void>((resolve, reject) => {
      this.messageWaiterResolve = resolve;
      this.messageWaiterReject = reject;
    });
  }

  private onConnect() {
    if (this.connWaiterResolve) {
      this.connWaiterResolve(true);
      this.connWaiterReject = null;
      this.connWaiterResolve = null;
    }
  }

  private onError(err: Error): void {
    if (this.connWaiterReject) {
      this.connWaiterReject(err);
      this.connWaiterReject = null;
      this.connWaiterResolve = null;
    }

    if (this.messageWaiterReject) {
      this.messageWaiterReject(err);
      this.messageWaiterResolve = null;
      this.messageWaiterReject = null;
    }
  }

  private onData(data: Buffer): void {
    const pause = this.buffer.feed(data);

    if (pause) {
      this.paused = true;
      this.sock.pause();
    }

    if (this.messageWaiterResolve) {
      if (this.buffer.takeMessage()) {
        this.messageWaiterResolve(true);
        this.messageWaiterResolve = null;
        this.messageWaiterReject = null;
      }
    }
  }

  private parseHeaders(): Map<number, Buffer> {
    const ret = new Map<number, Buffer>();
    let numFields = this.buffer.readInt16();
    while (numFields) {
      const key = this.buffer.readInt16();
      const value = this.buffer.readLenPrefixedBuffer();
      ret.set(key, value);
      numFields--;
    }
    return ret;
  }

  private parseErrorMessage(): Error {
    const severity = this.buffer.readChar();
    const code = this.buffer.readUInt32();
    const message = this.buffer.readString();
    const attrs = this.parseHeaders();

    const err = new Error(message);
    return err;
  }

  private parseSyncMessage(): void {
    this.parseHeaders(); // TODO: Reject Headers
    const status = this.buffer.readChar();
    switch (status) {
      case chars.$I:
        this.serverXactStatus = TransactionStatus.TRANS_IDLE;
        break;
      case chars.$T:
        this.serverXactStatus = TransactionStatus.TRANS_INTRANS;
        break;
      case chars.$E:
        this.serverXactStatus = TransactionStatus.TRANS_INERROR;
        break;
      default:
        this.serverXactStatus = TransactionStatus.TRANS_UNKNOWN;
    }

    this.buffer.finishMessage();
  }

  private fallthrough(): void {
    const mtype = this.buffer.getMessageType();

    switch (mtype) {
      case chars.$S: {
        const name = this.buffer.readString();
        const value = this.buffer.readString();
        this.serverSettings.set(name, value);
        this.buffer.finishMessage();
        break;
      }

      case chars.$L: {
        const severity = this.buffer.readChar();
        const code = this.buffer.readUInt32();
        const message = this.buffer.readString();
        this.parseHeaders();
        this.buffer.finishMessage();

        /* tslint:disable */
        console.info("SERVER MESSAGE", severity, code, message);
        /* tslint:enable */

        break;
      }

      default:
        // TODO: terminate connection
        throw new Error(
          `unexpected message type ${mtype} ("${chars.chr(mtype)}")`
        );
    }
  }

  private async connect() {
    await this.connWaiter;

    const wb = new WriteBuffer();

    wb.beginMessage(chars.$V)
      .writeInt16(1)
      .writeInt16(0)
      .writeInt16(0)
      .endMessage();

    wb.beginMessage(chars.$0)
      .writeString("edgedb") // TODO
      .writeString("edgedb")
      .endMessage();

    this.sock.write(wb.unwrap());

    while (true) {
      if (!this.buffer.takeMessage()) {
        await this.waitForMessage();
      }

      const mtype = this.buffer.getMessageType();

      switch (mtype) {
        case chars.$v: {
          const hi = this.buffer.readInt16();
          const lo = this.buffer.readInt16();
          this.parseHeaders();
          this.buffer.finishMessage();

          if (hi !== 1 || lo !== 0) {
            throw new Error(
              `the server requested an unsupported version of ` +
                `the protocol ${hi}.${lo}`
            );
          }
          break;
        }

        case chars.$Y: {
          this.buffer.discardMessage();
          break;
        }

        case chars.$R: {
          const status = this.buffer.readInt32();

          if (status === AuthenticationStatuses.AUTH_OK) {
            this.buffer.finishMessage();
          }

          if (status !== AuthenticationStatuses.AUTH_OK) {
            // TODO: Abort the connection
            throw new Error(
              `unsupported authentication method requested by the ` +
                `server: ${status}`
            );
          }

          break;
        }

        case chars.$K: {
          this.serverSecret = this.buffer.readInt32();
          this.buffer.finishMessage();
          break;
        }

        case chars.$E: {
          throw this.parseErrorMessage();
        }

        case chars.$Z: {
          this.parseSyncMessage();
          return;
        }

        default:
          this.fallthrough();
      }
    }
  }

  private static newSock({
    port = 5656,
    host = "localhost",
  }: ConnectConfig = {}): net.Socket {
    return net.createConnection(port, host);
  }

  static async connect(config: ConnectConfig = {}): Promise<AwaitConnection> {
    const sock = this.newSock(config);
    const conn = new this(sock);
    await conn.connect();
    return conn;
  }
}

class Connection {
  static wrap(conn: AwaitConnection): Connection {
    return new Connection();
  }
}
