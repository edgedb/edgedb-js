if (!globalThis.crypto) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  globalThis.crypto = require("node:crypto").webcrypto;
}

export function bytesToBase64Url(bytes: Uint8Array): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  let base64url = "";
  let i = 0;

  const len = bytes.length;
  for (; i < len; i += 3) {
    const b1 = bytes[i] & 0xff;
    const b2 = i + 1 < len ? bytes[i + 1] & 0xff : 0;
    const b3 = i + 2 < len ? bytes[i + 2] & 0xff : 0;

    const enc1 = b1 >> 2;
    const enc2 = ((b1 & 0x03) << 4) | (b2 >> 4);
    const enc3 = ((b2 & 0x0f) << 2) | (b3 >> 6);
    const enc4 = b3 & 0x3f;

    base64url += chars.charAt(enc1) + chars.charAt(enc2);
    if (i + 1 < len) {
      base64url += chars.charAt(enc3);
    }
    if (i + 2 < len) {
      base64url += chars.charAt(enc4);
    }
  }

  return base64url;
}

export async function sha256(
  bytes: BufferSource | string
): Promise<Uint8Array> {
  if (typeof bytes === "string") {
    bytes = new TextEncoder().encode(bytes);
  }
  return new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
}

export function randomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}
