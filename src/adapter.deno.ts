import {process} from "https://deno.land/std@0.108.0/node/process.ts";
import {Buffer} from "https://deno.land/std@0.108.0/node/buffer.ts";
import * as crypto from "https://deno.land/std@0.108.0/node/crypto.ts";
import {
  Sha256,
  HmacSha256,
} from "https://deno.land/std@0.108.0/hash/sha256.ts";
import path from "https://deno.land/std@0.108.0/node/path.ts";
import EventEmitter from "https://deno.land/std@0.108.0/node/events.ts";
import util from "https://deno.land/std@0.108.0/node/util.ts";

export {Buffer, path, process, util, crypto};

export function readFileUtf8(path: string): Promise<string> {
  return Deno.readTextFile(path);
}

export async function exists(fn: string | URL): Promise<boolean> {
  fn = fn instanceof URL ? path.fromFileUrl(fn) : fn;
  try {
    await Deno.lstat(fn);
    return true;
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) {
      return false;
    }
    throw err;
  }
}

export async function randomBytes(size: number): Promise<Buffer> {
  const buf = new Uint8Array(size);
  const rand = globalThis.crypto.getRandomValues(buf);

  return Buffer.from(rand);
}

export function H(msg: Buffer): Buffer {
  const sign = new Sha256();
  sign.update(msg);
  return Buffer.from(sign.arrayBuffer());
}

export function HMAC(key: Buffer, ...msgs: Buffer[]): Buffer {
  const hm = new HmacSha256(key);
  for (const msg of msgs) {
    hm.update(msg);
  }
  return Buffer.from(hm.arrayBuffer());
}

export function homeDir(): string {
  const homeDir = Deno.env.get("HOME") ?? Deno.env.get("USERPROFILE");
  if (homeDir) {
    return homeDir;
  }
  const homeDrive = Deno.env.get("HOMEDRIVE"),
    homePath = Deno.env.get("HOMEPATH");
  if (homeDrive && homePath) {
    return path.join(homeDrive, homePath);
  }
  throw new Error("Unable to determine home path");
}

export function hrTime(): number {
  return performance.now();
}

// TODO: replace this with
//       `import * as fs from "https://deno.land/std@0.95.0/node/fs.ts";`
//       when the 'fs' compat module does not require '--unstable' flag.
export namespace fs {
  export function realpath(path: string): Promise<string> {
    return Deno.realPath(path);
  }

  export function stat(path: string): Promise<Deno.FileInfo> {
    return Deno.stat(path);
  }
}

// TODO: when 'net.Socket' is implemented in deno node compatibility library
//       replace this (https://github.com/denoland/deno_std/pull/694)
export namespace net {
  export function createConnection(port: number, hostname?: string): Socket;
  export function createConnection(unixpath: string): Socket;
  export function createConnection(
    port: number | string,
    hostname?: string
  ): Socket {
    // TODO: unix transport is currently behind --unstable flag, add correct
    // typing when (if?) this becomes stable
    const opts: any =
      typeof port === "string"
        ? {transport: "unix", path: port}
        : {port, hostname};

    const conn = Deno.connect(opts);

    return new Socket(conn);
  }

  export declare interface Socket {
    on(eventName: "error", listener: (e: any) => void): this;
    on(eventName: "connect", listener: () => void): this;
    on(eventName: "data", listener: (data: Buffer) => void): this;
    on(eventName: "close", listener: () => void): this;
  }

  export class Socket extends EventEmitter {
    private _conn: Deno.Conn | null = null;
    private _readIter: AsyncIterableIterator<Uint8Array> | null = null;
    private _paused = true;

    constructor(pconn: Promise<Deno.Conn>) {
      super();
      pconn
        .then((conn) => {
          this._conn = conn;
          this._readIter = Deno.iter(conn);
          this.emit("connect");
          this.resume();
        })
        .catch((e) => this.emit("error", e));
    }

    setNoDelay() {
      // No deno api for this
    }

    unref() {
      // No deno api for this
      return this;
    }

    ref() {
      // No deno api for this
      return this;
    }

    pause() {
      this._paused = true;
    }

    async resume() {
      this._paused = false;
      while (!this._paused && this._readIter) {
        try {
          const next = await this._readIter.next();
          this.emit("data", Buffer.from(next.value));

          if (next.done) {
            // I'm assuming when the reader has ended
            // the connection is closed
            this._conn = null;
            this._readIter = null;
            this.emit("close");
          }
        } catch (e) {
          this.emit("error", e);
        }
      }
    }

    async write(data: Buffer) {
      try {
        await this._conn?.write(data);
      } catch (e) {
        this.emit("error", e);
      }
    }

    destroy(error?: Error) {
      this._conn?.close();
      this._conn = null;
      this._readIter = null;
      if (error) {
        throw error;
      }
    }
  }
}

// TODO: deno's TLS implementation doesn't currently support ALPN.
export namespace tls {
  export function connect(options: tls.ConnectionOptions): net.Socket {
    if (options.host == null) {
      throw new Error("host option must be set");
    }

    if (options.port == null) {
      throw new Error("port option must be set");
    }

    return net.createConnection(options.port, options.host);
  }

  export function checkServerIdentity(
    hostname: string,
    cert: Object
  ): Error | undefined {
    return undefined;
  }

  export interface ConnectionOptions {
    host?: string;
    port?: number;
    ALPNProtocols?: string[];
    ca?: string | string[];
    checkServerIdentity?: (a: string, b: any) => Error | undefined;
  }

  export class TLSSocket extends net.Socket {
    get alpnProtocol(): string {
      throw new Error("deno does not support ALPN");
    }
  }
}
