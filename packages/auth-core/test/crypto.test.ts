import crypto from "node:crypto";
import {
  bytesToBase64Url,
  base64UrlToBytes,
  sha256,
  randomBytes,
} from "../src/crypto";

describe("crypto", () => {
  describe("bytesToBase64Url", () => {
    test("Equivalent to Buffer implementation", () => {
      for (let i = 0; i < 100; i++) {
        const buffer = crypto.randomBytes(32);
        expect(buffer.toString("base64url")).toEqual(bytesToBase64Url(buffer));
      }
    });
  });

  describe("base64UrlToBytes", () => {
    test("Equivalent to Buffer implementation", () => {
      for (let i = 0; i < 100; i++) {
        const buffer = crypto.randomBytes(32);
        const encoded = buffer.toString("base64url");
        expect(new Uint8Array(Buffer.from(encoded, "base64url"))).toEqual(
          base64UrlToBytes(encoded),
        );
      }
    });
  });

  describe("round trip base64url", () => {
    test("bytesToBase64Url and base64UrlToBytes", () => {
      for (let i = 0; i < 100; i++) {
        const buffer = new Uint8Array(crypto.randomBytes(32));
        const base64url = bytesToBase64Url(buffer);
        expect(buffer).toEqual(base64UrlToBytes(base64url));
      }
    });
  });

  describe("sha256", () => {
    test("Equivalent to Node crypto SHA256 implementation", async () => {
      for (let i = 0; i < 100; i++) {
        const buffer = crypto.randomBytes(32);
        expect(crypto.createHash("sha256").update(buffer).digest()).toEqual(
          Buffer.from(await sha256(buffer)),
        );
      }
    });
  });

  describe("randomBytes", () => {
    test("Generates Uint8Array of correct length", () => {
      const length = 32;
      const bytes = randomBytes(length);
      expect(bytes).toBeInstanceOf(Uint8Array);
      expect(bytes.length).toEqual(length);
    });
  });
});
