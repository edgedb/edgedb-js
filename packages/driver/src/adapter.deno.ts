import process from "node:process";

import path from "node:path";
import * as _fs from "https://deno.land/std@0.208.0/fs/mod.ts";
import fs from "node:fs/promises";
import util from "node:util";
import net from "node:net";
import crypto from "node:crypto";
import url from "node:url";
import tls from "node:tls";

export { path, process, util, fs, net, tls };

export async function readFileUtf8(...pathParts: string[]): Promise<string> {
  return await Deno.readTextFile(path.join(...pathParts));
}

export function hasFSReadPermission(): boolean {
  return Deno.permissions.querySync({ name: "read" }).state === "granted";
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
  params?: { match?: RegExp[]; skip?: RegExp[] }
) {
  const { match, skip } = params || {};
  await _fs.ensureDir(path);
  const entries = _fs.walk(path, { match, skip });
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
  fn = fn instanceof URL ? url.fileURLToPath(fn) : fn;
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
  return crypto.createHash("sha1").update(msg).digest("hex");
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

export async function input(message = "", _params?: { silent?: boolean }) {
  const buf = new Uint8Array(1024);
  await Deno.stdout.write(new TextEncoder().encode(message));
  const n = <number>await Deno.stdin.read(buf);
  return new TextDecoder().decode(buf.subarray(0, n)).trim();
}

export function exit(code?: number) {
  Deno.exit(code);
}

export function srcDir() {
  return new URL(".", import.meta.url).pathname;
}
