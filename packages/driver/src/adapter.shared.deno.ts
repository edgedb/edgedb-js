import {
  Sha256,
  HmacSha256
} from "https://deno.land/std@0.159.0/hash/sha256.ts";

export async function randomBytes(size: number): Promise<Uint8Array> {
  const buf = new Uint8Array(size);
  return crypto.getRandomValues(buf);
}

export async function H(msg: Uint8Array): Promise<Uint8Array> {
  const sign = new Sha256();
  sign.update(msg);
  return new Uint8Array(sign.arrayBuffer());
}

export async function HMAC(
  key: Uint8Array,
  msg: Uint8Array
): Promise<Uint8Array> {
  const hm = new HmacSha256(key);
  hm.update(msg);
  return new Uint8Array(hm.arrayBuffer());
}
