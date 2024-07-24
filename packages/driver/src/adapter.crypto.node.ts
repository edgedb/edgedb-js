import type { CryptoUtils } from "./utils";

let cryptoUtils: CryptoUtils;

function loadCrypto() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("node:crypto");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cryptoUtils = require("./nodeCrypto").cryptoUtils;
  } catch (_) {
    if (typeof globalThis.crypto !== "undefined") {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      cryptoUtils = require("./browserCrypto").cryptoUtils;
    } else {
      throw new Error("No crypto implementation found");
    }
  }
}

loadCrypto();

export default cryptoUtils!;
