import * as crypto from "crypto";
import {promises as fs} from "fs";
import * as path from "path";
import * as os from "os";
import * as net from "net";
import * as tls from "tls";
import * as readline from "readline";
import {Writable} from "stream";
import process from "node:process";

export {path, net, crypto, fs, tls, process};

export async function readFileUtf8(fn: string): Promise<string> {
  return await fs.readFile(fn, {encoding: "utf8"});
}

export function watch(dir: string) {
  return fs.watch(dir, {recursive: true});
}

export async function readDir(pathString: string) {
  return fs.readdir(pathString);
}

export async function walk(
  dir: string,
  params?: {match?: RegExp[]; skip?: RegExp[]}
): Promise<string[]> {
  const {match, skip = []} = params || {};

  try {
    await fs.access(dir);
  } catch (err) {
    console.log(err);
    return [];
  }
  const dirents = await fs.readdir(dir, {withFileTypes: true});
  const files = await Promise.all(
    dirents.map(dirent => {
      const fspath = path.resolve(dir, dirent.name);
      if (skip) {
        // at least one skip pattern matches
        if (skip.some(re => re.test(fspath))) {
          return [];
        }
      }
      if (dirent.isDirectory()) {
        return walk(fspath, params);
      }
      if (match) {
        // at least one match pattern matches
        if (!match.some(re => re.test(fspath))) {
          return [];
        }
      }

      return [fspath];
    })
  );

  return Array.prototype.concat(...files);
}

export async function exists(filepath: string): Promise<boolean> {
  try {
    await fs.access(filepath);
    return true;
  } catch {
    return false;
  }
}

export function input(
  message: string,
  params?: {silent?: boolean}
): Promise<string> {
  let silent = false;

  const output = !!params?.silent
    ? new Writable({
        write(
          chunk: any,
          encoding: BufferEncoding,
          callback: (...args: any) => void
        ) {
          if (!silent) process.stdout.write(chunk, encoding);
          callback();
        }
      })
    : process.stdout;
  const rl = readline.createInterface({
    input: process.stdin,
    output
  });

  return new Promise((resolve, rej) => {
    rl.question(message, val => {
      rl.close();
      resolve(val);
    });
    silent = true;
  });
}

export async function randomBytes(size: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.randomBytes(size, (err, buf) => {
      if (err) {
        reject(err);
      } else {
        resolve(buf);
      }
    });
  });
}

export function H(msg: Buffer): Buffer {
  const sign = crypto.createHash("sha256");
  sign.update(msg);
  return sign.digest();
}

export function HMAC(key: Buffer, ...msgs: Buffer[]): Buffer {
  const hm = crypto.createHmac("sha256", key);
  for (const msg of msgs) {
    hm.update(msg);
  }
  return hm.digest();
}

export const homeDir = os.homedir;

export function hrTime(): number {
  const [s, ns] = process.hrtime();
  return s * 1000 + ns / 1_000_000;
}

export function exit(code?: number) {
  process.exit(code);
}

export function srcDir() {
  return __dirname;
}
