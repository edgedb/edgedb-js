import { BaseClientPool, Client, type ConnectOptions } from "./baseClient";
import { getConnectArgumentsParser } from "./conUtils";
import { EdgeDBError } from "./errors";
import { FetchConnection } from "./fetchConn";
import { Options } from "./options";

const parseConnectArguments = getConnectArgumentsParser(null);

class FetchClientPool extends BaseClientPool {
  isStateless = true;
  _connectWithTimeout = FetchConnection.createConnectWithTimeout();
}

export function createClient(): Client {
  throw new EdgeDBError(
    `'createClient()' cannot be used in browser (or edge runtime) environment, ` +
      `use 'createHttpClient()' API instead`
  );
}

export function createHttpClient(
  options?: string | ConnectOptions | null
): Client {
  return new Client(
    new FetchClientPool(
      parseConnectArguments,
      typeof options === "string" ? { dsn: options } : options ?? {}
    ),
    Options.defaults()
  );
}
