import {process} from "https://deno.land/std@0.159.0/node/process.ts";
import {Sha1} from "https://deno.land/std@0.159.0/hash/sha1.ts";

import path from "https://deno.land/std@0.159.0/node/path.ts";
import * as _fs from "https://deno.land/std@0.159.0/fs/mod.ts";
import * as fs from "https://deno.land/std@0.159.0/node/fs/promises.ts";
import EventEmitter from "https://deno.land/std@0.159.0/node/events.ts";
import util from "https://deno.land/std@0.159.0/node/util.ts";

export {path, process, util, fs};

export async function readFileUtf8(...pathParts: string[]): Promise<string> {
  return await Deno.readTextFile(path.join(...pathParts));
}

export async function readDir(path: string) {
  try {
    const files: string[] = [];
    for await (const entry of Deno.readDir(path)) {
      files.push(entry.name);
    }
    return files;
  } catch {
    return [];
  }
}

export async function walk(
  path: string,
  params?: {match?: RegExp[]; skip?: RegExp[]}
) {
  const {match, skip} = params || {};
  await _fs.ensureDir(path);
  const entries = _fs.walk(path, {match, skip});
  const files: string[] = [];
  for await (const e of entries) {
    if (!e.isFile) {
      continue;
    }
    files.push(e.path);
  }
  return files;
}

export async function exists(fn: string | URL): Promise<boolean> {
  fn = fn instanceof URL ? path.fromFileUrl(fn) : fn;
  try {
    await Deno.lstat(fn);
    return true;
  } catch (err) {
    return false;
    // if (err instanceof Deno.errors.NotFound) {
    //   return false;
    // }
    // throw err;
  }
}

export function hashSHA1toHex(msg: string): string {
  const sign = new Sha1();
  sign.update(msg);
  return sign.hex();
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

// TODO: replace this with
//       `import * as fs from "https://deno.land/std@0.159.0/node/fs.ts";`
//       when the 'fs' compat module does not require '--unstable' flag.

async function toArray(iter: AsyncIterable<unknown>) {
  const arr = [];
  for await (const i of iter) arr.push(i);
  return arr;
}

// deno-lint-ignore-file
// export namespace fs {
//   export function realpath(path: string): Promise<string> {
//     return Deno.realPath(path);
//   }

//   export async function access(path: string) {
//     return Deno.stat(path);
//   }

//   export async function readdir(path: string) {
//     const dirContents = Deno.readDir(path);
//     return toArray(dirContents);
//   }

//   export function stat(path: string): Promise<Deno.FileInfo> {
//     return Deno.stat(path);
//   }

//   export function rm(
//     path: string,
//     params?: {recursive?: boolean}
//   ): Promise<void> {
//     return Deno.remove(path, params);
//   }
//   export function mkdir(
//     path: string,
//     _params?: {recursive?: boolean}
//   ): Promise<void> {
//     return _fs.ensureDir(path);
//   }

//   export function writeFile(path: string, contents: string): Promise<void> {
//     return Deno.writeTextFile(path, contents);
//   }
//   export function writeFileSync(path: string, contents: string): void {
//     return Deno.writeTextFileSync(path, contents);
//   }
//   export function appendFile(path: string, contents: string): Promise<void> {
//     return Deno.writeTextFile(path, contents, {append: true});
//   }
// }

export async function input(message = "", _params?: {silent?: boolean}) {
  const buf = new Uint8Array(1024);
  await Deno.stdout.write(new TextEncoder().encode(message));
  const n = <number>await Deno.stdin.read(buf);
  return new TextDecoder().decode(buf.subarray(0, n)).trim();
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
    on(eventName: "data", listener: (data: Uint8Array) => void): this;
    on(eventName: "close", listener: () => void): this;
  }

  export class BaseSocket<T extends Deno.Conn> extends EventEmitter {
    protected _conn: T | null = null;
    protected _reader: Deno.Reader | null = null;
    protected _paused = true;

    setNoDelay() {
      // No deno api for this
    }

    unref() {
      // No deno api for this
      // Without this api, open idle connections will block deno from exiting
      // after all other tasks are finished
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
      while (!this._paused && this._reader) {
        try {
          const buf = new Uint8Array(16 * 1024);
          const bytes = await this._reader.read(buf);

          if (bytes !== null) {
            this.emit("data", buf.subarray(0, bytes));
          } else {
            // I'm assuming when the reader has ended
            // the connection is closed
            this._conn = null;
            this._reader = null;
            this.emit("close");
          }
        } catch (e) {
          this.emit("error", e);
        }
      }
    }

    async write(data: Uint8Array) {
      try {
        await this._conn?.write(data);
      } catch (e) {
        this.emit("error", e);
      }
    }

    destroy(error?: Error) {
      this._conn?.close();
      this._conn = null;
      this._reader = null;
      if (error) {
        throw error;
      }
    }
  }

  export class Socket extends BaseSocket<Deno.Conn> {
    constructor(pconn: Promise<Deno.Conn>) {
      super();
      pconn
        .then(conn => {
          this._conn = conn;
          this._reader = conn;
          this.emit("connect");
          this.resume();
        })
        .catch(e => {
          this.emit("error", e);
        });
    }
  }
}

export namespace tls {
  export function connect(options: tls.ConnectionOptions): tls.TLSSocket {
    if (options.host == null) {
      throw new Error("host option must be set");
    }

    if (options.port == null) {
      throw new Error("port option must be set");
    }

    const conn = Deno.connectTls({
      port: options.port,
      hostname: options.host,
      alpnProtocols: options.ALPNProtocols,
      caCerts: typeof options.ca === "string" ? [options.ca] : options.ca
    });

    return new TLSSocket(conn);
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
    rejectUnauthorized?: boolean;
  }

  export class TLSSocket extends net.BaseSocket<Deno.TlsConn> {
    private _alpnProtocol: string | null = null;

    constructor(pconn: Promise<Deno.TlsConn>) {
      super();
      pconn
        .then(async conn => {
          const handshake = await conn.handshake();
          this._alpnProtocol = handshake.alpnProtocol;
          this._conn = conn;
          this._reader = conn;
          this.emit("secureConnect");
          this.resume();
        })
        .catch(e => {
          this.emit("error", e);
        });
    }

    get alpnProtocol(): string | false {
      return this._alpnProtocol ?? false;
    }
  }
}

export function exit(code?: number) {
  Deno.exit(code);
}

export function srcDir() {
  return new URL(".", import.meta.url).pathname;
}
