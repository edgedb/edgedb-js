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
import * as path from "path";
import * as url from "url";
import * as os from "os";
import {readCredentialsFile} from "./credentials";

const EDGEDB_PORT = 5656;

export type Address = string | [string, number];

export interface NormalizedConnectConfig {
  addrs: Address[];
  user: string;
  password?: string;
  database: string;
  connect_timeout?: number;
  server_settings?: {[key: string]: string};
  command_timeout?: number;
}

export interface ConnectConfig {
  dsn?: string;
  credentialsFile?: string;
  host?: string | string[];
  port?: number | number[];
  user?: string;
  password?: string;
  database?: string;
  admin?: boolean;
  timeout?: number;
  command_timeout?: number;
  server_settings?: any;
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
  if (opts.command_timeout != null) {
    if (typeof opts.command_timeout !== "number" || opts.command_timeout < 0) {
      throw new Error(
        "invalid command_timeout value: " +
          "expected greater than 0 float (got " +
          JSON.stringify(opts.command_timeout) +
          ")"
      );
    }
  }

  return {
    ...parseConnectDsnAndArgs(opts),
    connect_timeout: opts.timeout,
    command_timeout: opts.command_timeout,
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
  server_settings,
}: ConnectConfig): NormalizedConnectConfig {
  if (admin) {
    // tslint:disable-next-line: no-console
    console.warn(
      "The `admin: true` parameter is deprecated and is scheduled " +
        "to be removed. Admin socket should never be used in " +
        "applications. Use command-line tool `edgedb` to setup " +
        "proper credentials."
    );
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
    const parsed = url.parse(dsn, true);

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

    if (parsed.auth) {
      const [puser, ppass] = parsed.auth.split(":");
      if (puser && user == null) {
        user = puser;
      }
      if (ppass && password == null) {
        password = ppass;
      }
    }

    // extract the connection parameters from the query
    if (parsed.query) {
      if ("port" in parsed.query) {
        if (!port && parsed.query.port) {
          let pport: string;
          if (parsed.query.port instanceof Array) {
            pport = parsed.query.port[parsed.query.port.length - 1];
          } else {
            pport = parsed.query.port;
          }
          port = pport.split(",").map(mapParseInt);
        }
        delete parsed.query.port;
      }

      if ("host" in parsed.query) {
        if (!host && parsed.query.host) {
          [host, port] = parseHostlist(parsed.query.host, port);
        }
        delete parsed.query.host;
      }

      const parsedQ: {[key: string]: string} = {};
      // when given multiple params of the same name, keep the last one only
      for (const key of Object.keys(parsed.query)) {
        const param = parsed.query[key]!;
        if (typeof param === "string") {
          parsedQ[key] = param;
        } else {
          parsedQ[key] = param.pop() as string;
        }
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

      // if there are more query params left, interpret them as server_settings
      if (Object.keys(parsedQ).length) {
        if (server_settings == null) {
          server_settings = {...parsedQ};
        } else {
          server_settings = {...parsedQ, ...server_settings};
        }
      }
    }
  } else if (dsn) {
    if (!/[A-Za-z_][A-Za-z_0-9]*/.test(dsn)) {
        throw Error(`dsn "${dsn}" is neither a edgedb:// URI \
            nor valid instance name`)
    }
    const credentials_file = path.join(os.homedir(),
        ".edgedb", "credentials", dsn + ".json");
    const credentials = readCredentialsFile(credentials_file);
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
      if (process.platform === "win32") {
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
    throw new Error("could not determine user name to connect with");
  }

  if (!password) {
    password = process.env.EDGEDB_PASSWORD;
  }

  if (!database) {
    database = process.env.EDGEDB_DATABASE;
  }
  if (!database) {
    database = user;
  }
  if (!database) {
    throw new Error("could not determine database name to connect to");
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
    server_settings,
  };
}

function parseHostlist(
  hostlist: string | string[],
  inputPort?: number | number[]
): [string[], number[]] {
  let hostspecs: string[];
  const hosts: string[] = [];
  const hostlist_ports: number[] = [];
  let default_port: number[] = [];
  let ports: number[] = [];

  if (hostlist instanceof Array) {
    hostspecs = hostlist;
  } else {
    hostspecs = hostlist.split(",");
  }

  if (!inputPort) {
    const portspec = process.env.EDGEDB_PORT;
    if (portspec) {
      default_port = portspec.split(",").map(mapParseInt);
      default_port = validatePortSpec(hostspecs, default_port);
    } else {
      default_port = validatePortSpec(hostspecs, EDGEDB_PORT);
    }
  } else {
    ports = validatePortSpec(hostspecs, inputPort);
  }

  for (let i = 0; i < hostspecs.length; i++) {
    const [addr, hostspec_port] = hostspecs[i].split(":");
    hosts.push(addr);

    if (!inputPort) {
      if (hostspec_port) {
        hostlist_ports.push(mapParseInt(hostspec_port));
      } else {
        hostlist_ports.push(default_port[i]);
      }
    }
  }

  if (!inputPort) {
    ports = hostlist_ports;
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
