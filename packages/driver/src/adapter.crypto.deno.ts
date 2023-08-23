import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts";

import type { CryptoUtils } from "./utils.ts";

const cryptoUtils: CryptoUtils = {
  async randomBytes(size: number): Promise<Uint8Array> {
    const buf = new Uint8Array(size);
    return crypto.getRandomValues(buf);
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
