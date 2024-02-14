import { BaseClientPool, Client, type ConnectOptions } from "./baseClient";
import { getConnectArgumentsParser } from "./conUtils";
import cryptoUtils from "./browserCrypto";
import { EdgeDBError } from "./errors";
import { FetchConnection } from "./fetchConn";
import { getHTTPSCRAMAuth } from "./httpScram";
import { Options } from "./options";

const makeConnectArgumentsParser = (env: Record<string, string | undefined>) =>
  getConnectArgumentsParser(null, env);
const httpSCRAMAuth = getHTTPSCRAMAuth(cryptoUtils);

class FetchClientPool extends BaseClientPool {
  isStateless = true;
  _connectWithTimeout = FetchConnection.createConnectWithTimeout(httpSCRAMAuth);
}

export function createClient(): Client {
  throw new EdgeDBError(
    `'createClient()' cannot be used in browser (or edge runtime) environment, ` +
      `use 'createHttpClient()' API instead`
  );
}

export function createHttpClient(
  options?: string | ConnectOptions | null,
  env: Record<string, string | undefined> = {}
): Client {
  return new Client(
    new FetchClientPool(
      makeConnectArgumentsParser(env),
      typeof options === "string" ? { dsn: options } : options ?? {}
    ),
    Options.defaults()
  );
}
