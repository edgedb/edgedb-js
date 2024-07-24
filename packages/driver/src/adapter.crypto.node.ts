import type { CryptoUtils } from "./utils";

let cryptoUtils: CryptoUtils;

if (typeof crypto === "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  cryptoUtils = require("./nodeCrypto").cryptoUtils;
} else {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  cryptoUtils = require("./browserCrypto").cryptoUtils;
}

export default cryptoUtils;
