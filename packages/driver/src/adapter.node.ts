import * as crypto from "crypto";
import {promises as fs} from "fs";
import * as net from "net";
import * as os from "os";
import * as path from "path";
import * as tls from "tls";

import process from "process";
import * as readline from "readline";
import {Writable} from "stream";

export {path, net, fs, tls, process};

export async function readFileUtf8(...pathParts: string[]): Promise<string> {
  return await fs.readFile(path.join(...pathParts), {encoding: "utf8"});
}

export function watch(dir: string) {
  return fs.watch(dir, {recursive: true});
}

export async function readDir(pathString: string) {
  return fs.readdir(pathString);
}

export function hashSHA1toHex(msg: string): string {
  return crypto.createHash("sha1").update(msg).digest("hex");
}

export async function walk(
  dir: string,
  params?: {match?: RegExp[]; skip?: RegExp[]}
): Promise<string[]> {
  const {match, skip = []} = params || {};

  try {
    await fs.access(dir);
  } catch (err) {
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

export const homeDir = os.homedir;

export function exit(code?: number) {
  process.exit(code);
}

export function srcDir() {
  return __dirname;
}
