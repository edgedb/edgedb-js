import * as crypto from "crypto";
import {createHash} from "crypto";
import * as fs from "fs";
import {existsSync, realpathSync} from "fs";
import * as path from "path";
import * as os from "os";
import * as net from "net";

export {path, net, createHash, existsSync, realpathSync};

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

export function readFileUtf8Sync(filepath: string): string {
  return fs.readFileSync(filepath, {encoding: "utf-8"});
}

export const homeDir = os.homedir;

export function hrTime(): number {
  const [s, ns] = process.hrtime();
  return s * 1000 + ns / 1_000_000;
}
