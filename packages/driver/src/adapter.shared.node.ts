let randomBytes: (size: number) => Promise<Uint8Array>;
let H: (msg: Uint8Array) => Promise<Uint8Array>;
let HMAC: (key: Uint8Array, msg: Uint8Array) => Promise<Uint8Array>;

if (typeof crypto === "undefined") {
  const nodeCrypto = require("crypto");

  randomBytes = function randomBytes(size: number): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
      nodeCrypto.randomBytes(size, (err: Error | null, buf: Buffer) => {
        if (err) {
          reject(err);
        } else {
          resolve(buf);
        }
      });
    });
  };

  H = async function H(msg: Uint8Array): Promise<Uint8Array> {
    const sign = nodeCrypto.createHash("sha256");
    sign.update(msg);
    return sign.digest();
  };

  HMAC = async function HMAC(
    key: Uint8Array,
    msg: Uint8Array
  ): Promise<Uint8Array> {
    const hm = nodeCrypto.createHmac("sha256", key);
    hm.update(msg);
    return hm.digest();
  };
} else {
  randomBytes = async function randomBytes(size: number): Promise<Uint8Array> {
    return crypto.getRandomValues(new Uint8Array(size));
  };

  H = async function H(msg: Uint8Array): Promise<Uint8Array> {
    return new Uint8Array(await crypto.subtle.digest("SHA-256", msg));
  };

  HMAC = async function HMAC(
    key: Uint8Array,
    msg: Uint8Array
  ): Promise<Uint8Array> {
    return new Uint8Array(
      await crypto.subtle.sign(
        "HMAC",
        await crypto.subtle.importKey(
          "raw",
          key,
          {
            name: "HMAC",
            hash: {name: "SHA-256"}
          },
          false,
          ["sign"]
        ),
        msg
      )
    );
  };
}

export {randomBytes, H, HMAC};
