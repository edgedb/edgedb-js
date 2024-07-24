import crypto from "node:crypto";
import type { CryptoUtils } from "./utils";

export const cryptoUtils: CryptoUtils = {
  makeKey(keyBytes: Uint8Array): Promise<Uint8Array> {
    return Promise.resolve(keyBytes);
  },

  randomBytes(size: number): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(size, (err: Error | null, buf: Buffer) => {
        if (err) {
          reject(err);
        } else {
          resolve(buf);
        }
      });
    });
  },

  async H(msg: Uint8Array): Promise<Uint8Array> {
    const sign = crypto.createHash("sha256");
    sign.update(msg);
    return sign.digest();
  },

  async HMAC(
    key: Uint8Array | CryptoKey,
    msg: Uint8Array,
  ): Promise<Uint8Array> {
    const cryptoKey: Uint8Array | crypto.KeyObject =
      key instanceof Uint8Array ? key : crypto.KeyObject.from(key);
    const hm = crypto.createHmac("sha256", cryptoKey);
    hm.update(msg);
    return hm.digest();
  },
};
