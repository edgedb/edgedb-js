import { BaseClientPool, Client, type ConnectOptions } from "./baseClient.js";
import { getConnectArgumentsParser } from "./conUtils.js";
import { cryptoUtils } from "./browserCrypto.js";
import { EdgeDBError } from "./errors/index.js";
import { FetchConnection } from "./fetchConn.js";
import { getHTTPSCRAMAuth } from "./httpScram.js";
import { Options } from "./options.js";

const parseConnectArguments = getConnectArgumentsParser(null);
const httpSCRAMAuth = getHTTPSCRAMAuth(cryptoUtils);

class FetchClientPool extends BaseClientPool {
  isStateless = true;
  _connectWithTimeout = FetchConnection.createConnectWithTimeout(httpSCRAMAuth);
}

export function createClient(): Client {
  throw new EdgeDBError(
    `'createClient()' cannot be used in browser (or edge runtime) environment, ` +
      `use 'createHttpClient()' API instead`,
  );
}

export function createHttpClient(
  options?: string | ConnectOptions | null,
): Client {
  return new Client(
    new FetchClientPool(
      parseConnectArguments,
      typeof options === "string" ? { dsn: options } : options ?? {},
    ),
    Options.defaults(),
  );
}
