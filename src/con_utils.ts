/*!
 * This source file is part of the EdgeDB open source project.
 *
 * Copyright 2019-present MagicStack Inc. and the EdgeDB authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {path, homeDir} from "./adaptor.node";
import {readCredentialsFile} from "./credentials";

const EDGEDB_PORT = 5656;

export type Address = string | [string, number];

export interface NormalizedConnectConfig {
  addrs: Address[];
  user: string;
  password?: string;
  database: string;
  connectTimeout?: number;
  serverSettings?: {[key: string]: string};
  commandTimeout?: number;
  waitUntilAvailable?: number;
  legacyUUIDMode?: boolean;
}

export interface ConnectConfig {
  dsn?: string;
  host?: string | string[];
  port?: number | number[];
  user?: string;
  password?: string;
  database?: string;
  admin?: boolean;
  timeout?: number;
  commandTimeout?: number;
  waitUntilAvailable?: number;
  serverSettings?: any;
  legacyUUIDMode?: boolean;
}

function mapParseInt(x: any): number {
  const res = parseInt(x, 10);
  if (isNaN(res)) {
    throw new Error(
      "could not convert " + JSON.stringify(x) + " to an integer"
    );
  }

  return res;
}

export function parseConnectArguments(
  opts: ConnectConfig = {}
): NormalizedConnectConfig {
  if (opts.commandTimeout != null) {
    if (typeof opts.commandTimeout !== "number" || opts.commandTimeout < 0) {
      throw new Error(
        "invalid commandTimeout value: " +
          "expected greater than 0 float (got " +
          JSON.stringify(opts.commandTimeout) +
          ")"
      );
    }
  }

  if (opts.legacyUUIDMode) {
    // tslint:disable-next-line: no-console
    console.warn(
      "The `legacyUUIDMode` parameter is deprecated and is scheduled " +
        "to be removed. Upgrade to the default behavior of string UUID values."
    );
  }

  return {
    ...parseConnectDsnAndArgs(opts),
    connectTimeout: opts.timeout,
    commandTimeout: opts.commandTimeout,
    waitUntilAvailable: opts.waitUntilAvailable ?? 30_000,
    legacyUUIDMode: opts.legacyUUIDMode,
  };
}

function parseConnectDsnAndArgs({
  dsn,
  host,
  port,
  user,
  password,
  database,
  admin,
  serverSettings,
  // @ts-ignore
  server_settings,
}: ConnectConfig): NormalizedConnectConfig {
  let usingCredentials: boolean = false;

  if (admin) {
    // tslint:disable-next-line: no-console
    console.warn(
      "The `admin: true` parameter is deprecated and is scheduled " +
        "to be removed. Admin socket should never be used in " +
        "applications. Use command-line tool `edgedb` to setup " +
        "proper credentials."
    );
  }
  if (server_settings) {
    // tslint:disable-next-line: no-console
    console.warn(
      "The `server_settings` parameter is deprecated and is scheduled " +
        "to be removed. Use `serverSettings` instead."
    );
    serverSettings = server_settings;
  }
  if (dsn && /^edgedb(?:admin)?:\/\//.test(dsn)) {
    // Comma-separated hosts cannot be parsed correctly with url.parse, so if
    // we detect them, we need to replace the whole host before parsing. The
    // comma-separated host list can then be handled in the same way as if it
    // came from any other source (such as EDGEDB_HOST).
    const dsnHostMatch = /\/\/(.+?@)?(.*)\//.exec(dsn);
    let dsnHost: string | null = null;

    if (dsnHostMatch && typeof dsnHostMatch[2] === "string") {
      dsnHost = dsnHostMatch[2];
      if (dsnHost.indexOf(",") !== -1) {
        let rep: string;

        if (dsnHostMatch[1]) {
          rep = "@";
        } else {
          rep = "//";
        }
        dsn = dsn.replace(rep + dsnHost + "/", rep + "replaced_host/");
      } else {
        dsnHost = null;
      }
    }
    const parsed = new URL(dsn);

    if (typeof parsed.protocol === "string") {
      if (parsed.protocol === "edgedbadmin:") {
        // tslint:disable-next-line: no-console
        console.warn(
          "The `edgedbadmin` scheme is deprecated and is scheduled " +
            "to be removed. Admin socket should never be used in " +
            "applications. Use command-line tool `edgedb` to setup " +
            "proper credentials."
        );
      }
      if (["edgedb:", "edgedbadmin:"].indexOf(parsed.protocol) === -1) {
        throw new Error(
          "invalid DSN: scheme is expected to be " +
            '"edgedb" or "edgedbadmin", got ' +
            (parsed.protocol ? parsed.protocol.slice(0, -1) : parsed.protocol)
        );
      }
    } else {
      throw new Error(
        "invalid DSN: scheme is expected to be " +
          '"edgedb" or "edgedbadmin", but it\'s missing'
      );
    }

    if (admin == null) {
      admin = parsed.protocol === "edgedbadmin:";
    }

    if (!host && parsed.host) {
      // if the host was replaced, use the original value to
      // process comma-separated hosts
      if (dsnHost) {
        [host, port] = parseHostlist(dsnHost, port);
      } else {
        host = parsed.hostname ?? undefined;
        if (parsed.port) {
          port = parseInt(parsed.port, 10);
        }
      }
    }

    if (parsed.pathname && database == null) {
      database = parsed.pathname;
      if (database[0] === "/") {
        database = database.slice(1);
      }
    }

    if (parsed.username && user == null) {
      user = parsed.username;
    }
    if (parsed.password && password == null) {
      password = parsed.password;
    }

    // extract the connection parameters from the query
    if (parsed.searchParams) {
      if (parsed.searchParams.has("port")) {
        const pport = parsed.searchParams.get("port")!;
        if (!port && pport) {
          port = pport.split(",").map(mapParseInt);
        }
        parsed.searchParams.delete("port");
      }

      if (parsed.searchParams.has("host")) {
        const phost = parsed.searchParams.get("host")!;
        if (!host && phost) {
          [host, port] = parseHostlist(phost, port);
        }
        parsed.searchParams.delete("host");
      }

      const parsedQ: {[key: string]: string} = {};
      // when given multiple params of the same name, keep the last one only
      for (const [key, param] of parsed.searchParams.entries()) {
        parsedQ[key] = param;
      }

      if ("dbname" in parsedQ) {
        if (!database) {
          database = parsedQ.dbname;
        }
        delete parsedQ.dbname;
      }

      if ("database" in parsedQ) {
        if (!database) {
          database = parsedQ.database;
        }
        delete parsedQ.database;
      }

      if ("user" in parsedQ) {
        if (!user) {
          user = parsedQ.user;
        }
        delete parsedQ.user;
      }

      if ("password" in parsedQ) {
        if (!password) {
          password = parsedQ.password;
        }
        delete parsedQ.password;
      }

      // if there are more query params left, interpret them as serverSettings
      if (Object.keys(parsedQ).length) {
        if (serverSettings == null) {
          serverSettings = {...parsedQ};
        } else {
          serverSettings = {...parsedQ, ...serverSettings};
        }
      }
    }
  } else if (dsn) {
    if (!/^[A-Za-z_][A-Za-z_0-9]*$/.test(dsn)) {
      throw Error(
        `dsn "${dsn}" is neither a edgedb:// URI nor valid instance name`
      );
    }
    usingCredentials = true;
    const credentialsFile = path.join(
      homeDir(),
      ".edgedb",
      "credentials",
      dsn + ".json"
    );
    const credentials = readCredentialsFile(credentialsFile);
    port = credentials.port;
    user = credentials.user;
    if (host == null && "host" in credentials) {
      host = credentials.host;
    }
    if (password == null && "password" in credentials) {
      password = credentials.password;
    }
    if (database == null && "database" in credentials) {
      database = credentials.database;
    }
  }

  // figure out host setting
  if (!host) {
    const hostspec = process.env.EDGEDB_HOST;
    if (hostspec) {
      const hl = parseHostlist(hostspec, port);
      host = hl[0];
      port = hl[1];
    } else {
      if (process.platform === "win32" || usingCredentials) {
        host = [];
      } else {
        host = ["/run/edgedb", "/var/run/edgedb"];
      }
      if (!admin) {
        host.push("localhost");
      }
    }
  } else if (!(host instanceof Array)) {
    host = [host];
  }

  // figure out port setting
  if (!port) {
    const portspec = process.env.EDGEDB_PORT;
    if (portspec) {
      port = portspec.split(",").map(mapParseInt);
    } else {
      port = EDGEDB_PORT;
    }
  }

  // validate and normalize host and port
  port = validatePortSpec(host, port);

  if (!user) {
    user = process.env.EDGEDB_USER;
  }
  if (!user) {
    user = "edgedb";
  }

  if (!password) {
    password = process.env.EDGEDB_PASSWORD;
  }

  if (!database) {
    database = process.env.EDGEDB_DATABASE;
  }
  if (!database) {
    database = "edgedb";
  }

  let haveUnixSockets = false;
  const addrs: Address[] = [];
  for (let i = 0; i < host.length; i++) {
    let h = host[i];
    const p = port[i];

    if (h[0] === "/") {
      // UNIX socket name
      if (h.indexOf(".s.EDGEDB.") === -1) {
        let sockName: string;
        if (admin) {
          sockName = ".s.EDGEDB.admin." + p;
        } else {
          sockName = ".s.EDGEDB." + p;
        }
        h = path.join(h, sockName);
        haveUnixSockets = true;
      }
      addrs.push(h);
    } else if (!admin) {
      // TCP host/port
      addrs.push([h, p]);
    }
  }

  if (admin && !haveUnixSockets) {
    throw new Error("admin connections are only supported over UNIX sockets");
  }
  if (addrs.length === 0) {
    throw new Error("could not determine the database address to connect to");
  }

  return {
    addrs,
    user,
    password,
    database,
    serverSettings,
  };
}

function parseHostlist(
  hostlist: string | string[],
  inputPort?: number | number[]
): [string[], number[]] {
  let hostspecs: string[];
  const hosts: string[] = [];
  const hostlistPorts: number[] = [];
  let defaultPort: number[] = [];
  let ports: number[] = [];

  if (hostlist instanceof Array) {
    hostspecs = hostlist;
  } else {
    hostspecs = hostlist.split(",");
  }

  if (!inputPort) {
    const portspec = process.env.EDGEDB_PORT;
    if (portspec) {
      defaultPort = portspec.split(",").map(mapParseInt);
      defaultPort = validatePortSpec(hostspecs, defaultPort);
    } else {
      defaultPort = validatePortSpec(hostspecs, EDGEDB_PORT);
    }
  } else {
    ports = validatePortSpec(hostspecs, inputPort);
  }

  for (let i = 0; i < hostspecs.length; i++) {
    const [addr, hostspecPort] = hostspecs[i].split(":");
    hosts.push(addr);

    if (!inputPort) {
      if (hostspecPort) {
        hostlistPorts.push(mapParseInt(hostspecPort));
      } else {
        hostlistPorts.push(defaultPort[i]);
      }
    }
  }

  if (!inputPort) {
    ports = hostlistPorts;
  }

  return [hosts, ports];
}

function validatePortSpec(
  inputHosts: string[],
  inputPort: number | number[]
): number[] {
  let ports: number[];

  if (inputPort instanceof Array) {
    // If there is a list of ports, its length must
    // match that of the host list.
    if (inputPort.length !== inputHosts.length) {
      throw new Error(
        "could not match " +
          inputPort.length +
          " port numbers to " +
          inputHosts.length +
          " hosts"
      );
    }
    ports = inputPort;
  } else {
    ports = Array(inputHosts.length).fill(inputPort);
  }

  // defensively convert ports into integers
  ports = ports.map(mapParseInt);

  return ports;
}
