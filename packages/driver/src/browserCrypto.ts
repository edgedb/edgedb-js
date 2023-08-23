import type { CryptoUtils } from "./utils";

const cryptoUtils: CryptoUtils = {
  async randomBytes(size: number): Promise<Uint8Array> {
    return crypto.getRandomValues(new Uint8Array(size));
  },

  async H(msg: Uint8Array): Promise<Uint8Array> {
    return new Uint8Array(await crypto.subtle.digest("SHA-256", msg));
  },

  async HMAC(key: Uint8Array, msg: Uint8Array): Promise<Uint8Array> {
    return new Uint8Array(
      await crypto.subtle.sign(
        "HMAC",
        await crypto.subtle.importKey(
          "raw",
          key,
          {
            name: "HMAC",
            hash: { name: "SHA-256" },
          },
          false,
          ["sign"]
        ),
        msg
      )
    );
  },
};

export default cryptoUtils;
