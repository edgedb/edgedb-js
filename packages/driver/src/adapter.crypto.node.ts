import type { CryptoUtils } from "./utils";

let cryptoUtils: CryptoUtils;

if (typeof crypto === "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nodeCrypto = require("crypto");

  cryptoUtils = {
    randomBytes(size: number): Promise<Uint8Array> {
      return new Promise((resolve, reject) => {
        nodeCrypto.randomBytes(size, (err: Error | null, buf: Buffer) => {
          if (err) {
            reject(err);
          } else {
            resolve(buf);
          }
        });
      });
    },

    async H(msg: Uint8Array): Promise<Uint8Array> {
      const sign = nodeCrypto.createHash("sha256");
      sign.update(msg);
      return sign.digest();
    },

    async HMAC(key: Uint8Array, msg: Uint8Array): Promise<Uint8Array> {
      const hm = nodeCrypto.createHmac("sha256", key);
      hm.update(msg);
      return hm.digest();
    },
  };
} else {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  cryptoUtils = require("./browserCrypto").default;
}

export default cryptoUtils;
