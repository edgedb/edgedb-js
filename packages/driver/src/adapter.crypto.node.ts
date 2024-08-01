import type { CryptoUtils } from "./utils.js";

// let cryptoUtils: CryptoUtils;
let cryptoUtilsPromise: Promise<CryptoUtils>;

<<<<<<< Updated upstream
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
=======
if (typeof crypto === "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  // cryptoUtils = require("./nodeCrypto.js").cryptoUtils;
  cryptoUtilsPromise = import("./nodeCrypto.js").then(
    (module) => module.cryptoUtils,
  );
} else {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  // cryptoUtils = require("./browserCrypto.js").cryptoUtils;
  cryptoUtilsPromise = import("./browserCrypto.js").then(
    (module) => module.cryptoUtils,
  );
>>>>>>> Stashed changes
}
const cryptoUtils = await cryptoUtilsPromise;

loadCrypto();

export default cryptoUtils!;
