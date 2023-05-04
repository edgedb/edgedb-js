import { BaseClientPool, Client, ConnectOptions } from "./baseClient";
import { FetchClientPool } from "./browserClient";
import { parseConnectArguments } from "./conUtils.server";
import { Options } from "./options";
import { RawConnection } from "./rawConn";

class ClientPool extends BaseClientPool {
  isStateless = false;
  _connectWithTimeout = RawConnection.connectWithTimeout.bind(RawConnection);
}

export function createClient(options?: string | ConnectOptions | null): Client {
  return new Client(
    new ClientPool(
      parseConnectArguments,
      typeof options === "string" ? { dsn: options } : options ?? {}
    ),
    Options.defaults()
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
