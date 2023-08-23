import type { CryptoUtils } from "./utils";

let cryptoUtils: CryptoUtils;

if (typeof crypto === "undefined") {
  // tslint:disable-next-line:no-var-requires
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
  // tslint:disable-next-line:no-var-requires
  cryptoUtils = require("./browserCrypto").default;
}

export default cryptoUtils;
