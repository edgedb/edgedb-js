import { BaseClientPool, Client, type ConnectOptions } from "./baseClient.js";
import { parseConnectArguments } from "./conUtils.server.js";
import cryptoUtils from "./adapter.crypto.node.js";
import { Options } from "./options.js";
import { RawConnection } from "./rawConn.js";
import { FetchConnection } from "./fetchConn.js";
import { getHTTPSCRAMAuth } from "./httpScram.js";

class ClientPool extends BaseClientPool {
  isStateless = false;
  _connectWithTimeout = RawConnection.connectWithTimeout.bind(RawConnection);
}

export function createClient(options?: string | ConnectOptions | null): Client {
  return new Client(
    new ClientPool(
      parseConnectArguments,
      typeof options === "string" ? { dsn: options } : options ?? {},
    ),
    Options.defaults(),
  );
}

const httpSCRAMAuth = getHTTPSCRAMAuth(cryptoUtils);

class FetchClientPool extends BaseClientPool {
  isStateless = true;
  _connectWithTimeout = FetchConnection.createConnectWithTimeout(httpSCRAMAuth);
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
