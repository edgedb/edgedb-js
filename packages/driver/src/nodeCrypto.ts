import crypto from "node:crypto";
import type { CryptoUtils } from "./utils";

function makeKey(keyBytes: Uint8Array): Promise<Uint8Array> {
  return Promise.resolve(keyBytes);
}

function randomBytes(size: number): Uint8Array {
  return crypto.randomBytes(size) as unknown as Uint8Array;
}

async function H(msg: Uint8Array): Promise<Uint8Array> {
  const sign = crypto.createHash("sha256");
  sign.update(msg);
  const h = sign.digest();
  return h as unknown as Uint8Array;
}

async function HMAC(
  key: Uint8Array | CryptoKey,
  msg: Uint8Array,
): Promise<Uint8Array> {
  const cryptoKey: Uint8Array | crypto.KeyObject =
    key instanceof Uint8Array ? key : crypto.KeyObject.from(key);
  const hm = crypto.createHmac("sha256", cryptoKey);
  hm.update(msg);
  const hmac = hm.digest();
  return hmac as unknown as Uint8Array;
}

export const cryptoUtils: CryptoUtils = {
  makeKey,
  randomBytes,
  H,
  HMAC,
};
