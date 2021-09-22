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

import {
  path,
  homeDir,
  crypto,
  fs,
  readFileUtf8Sync,
  tls,
} from "./adapter.node";
import * as errors from "./errors";
import {getCredentialsPath, readCredentialsFile} from "./credentials";
import * as platform from "./platform";

const EDGEDB_PORT = 5656;

export type Address = string | [string, number];

interface PartiallyNormalizedConfig {
  addrs: Address[];
  user: string;
  password?: string;
  database: string;
  serverSettings?: {[key: string]: string};
  tlsOptions?: tls.ConnectionOptions;

  // true if the program is run in a directory with `edgedb.toml`
  inProject: boolean;
  // true if the connection params were initialized from a project
  fromProject: boolean;
  // true if any of the connection params were sourced from environment
  fromEnv: boolean;
}

export interface NormalizedConnectConfig extends PartiallyNormalizedConfig {
  connectTimeout?: number;

  commandTimeout?: number;
  waitUntilAvailable: number;
  legacyUUIDMode: boolean;

  logging: boolean;
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
  tlsCAFile?: string;
  tlsVerifyHostname?: boolean;
  logging?: boolean;
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

function parseVerifyHostname(s: string): boolean {
  switch (s.toLowerCase()) {
    case "true":
    case "t":
    case "yes":
    case "y":
    case "on":
    case "1":
      return true;
    case "false":
    case "f":
    case "no":
    case "n":
    case "off":
    case "0":
      return false;
    default:
      throw new Error(`invalid tls_verify_hostname value: ${s}`);
  }
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

  const cwd = process.cwd();
  const inProject = fs.existsSync(path.join(cwd, "edgedb.toml"));

  return {
    ...parseConnectDsnAndArgs(opts, cwd, inProject),
    connectTimeout: opts.timeout,
    commandTimeout: opts.commandTimeout,
    waitUntilAvailable: opts.waitUntilAvailable ?? 30_000,
    legacyUUIDMode: !!opts.legacyUUIDMode,
    logging: opts.logging ?? true,
  };
}

function stashPath(projectDir: string): string {
  let projectPath = fs.realpathSync(projectDir);
  if (platform.isWindows && !projectPath.startsWith("\\\\")) {
    projectPath = "\\\\?\\" + projectPath;
  }

  const hash = crypto.createHash("sha1").update(projectPath).digest("hex");
  const baseName = path.basename(projectPath);
  const dirName = baseName + "-" + hash;

  return platform.searchConfigDir("projects", dirName);
}

function parseConnectDsnAndArgs(
  {
    dsn,
    host,
    port,
    user,
    password,
    database,
    admin,
    tlsCAFile,
    tlsVerifyHostname,
    serverSettings,
    // @ts-ignore
    server_settings,
  }: ConnectConfig,
  cwd: string,
  inProject: boolean
): PartiallyNormalizedConfig {
  let usingCredentials: boolean = false;
  const tlsCAData: string[] = [];
  let fromProject = false;
  let fromEnv = false;

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

  if (
    !(
      dsn ||
      host ||
      port ||
      process.env.EDGEDB_HOST ||
      process.env.EDGEDB_PORT
    )
  ) {
    if (process.env.EDGEDB_INSTANCE) {
      dsn = process.env.EDGEDB_INSTANCE;
      fromEnv ||= true;
    } else {
      if (!inProject) {
        throw new errors.ClientConnectionError(
          "no `edgedb.toml` found and no connection options specified" +
            " either via arguments to connect API or via environment" +
            " variables EDGEDB_HOST/EDGEDB_PORT or EDGEDB_INSTANCE"
        );
      }
      const stashDir = stashPath(cwd);
      if (fs.existsSync(stashDir)) {
        dsn = readFileUtf8Sync(path.join(stashDir, "instance-name")).trim();
      } else {
        throw new errors.ClientConnectionError(
          "Found `edgedb.toml` but the project is not initialized. " +
            "Run `edgedb project init`."
        );
      }

      fromProject = true;
    }
  }

  if (dsn && /^edgedb(?:admin)?:\/\//.test(dsn)) {
    // Comma-separated hosts and empty hosts cannot always be parsed
    // correctly with new URL(), so if we detect them, we need to replace the
    // whole host before parsing. The comma-separated host list can then be
    // handled in the same way as if it came from any other source
    // (such as EDGEDB_HOST).
    const dsnHostMatch = /\/\/(.+?@)?(.*?)([/?])/.exec(dsn);
    let dsnHost: string | null = null;

    if (dsnHostMatch && typeof dsnHostMatch[2] === "string") {
      dsnHost = dsnHostMatch[2];
      if (dsnHost === "" || dsnHost.includes(",")) {
        const rep = dsnHostMatch[1] ? "@" : "//";
        const suffix = dsnHostMatch[3];

        dsn = dsn.replace(
          rep + dsnHost + suffix,
          rep + "replaced_host" + suffix
        );
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
      if (dsnHost !== null) {
        if (dsnHost !== "") {
          let portFromEnv: boolean;
          [host, port, portFromEnv] = parseHostlist(dsnHost, port);
          fromEnv ||= portFromEnv;
        }
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
          let portFromEnv: boolean;
          [host, port, portFromEnv] = parseHostlist(phost, port);
          fromEnv ||= portFromEnv;
        }
        parsed.searchParams.delete("host");
      }

      const parsedQ: Map<string, string> = new Map();
      // when given multiple params of the same name, keep the last one only
      for (const [key, param] of parsed.searchParams.entries()) {
        parsedQ.set(key, param);
      }

      if (parsedQ.has("dbname")) {
        if (!database) {
          database = parsedQ.get("dbname");
        }
        parsedQ.delete("dbname");
      }

      if (parsedQ.has("database")) {
        if (!database) {
          database = parsedQ.get("database");
        }
        parsedQ.delete("database");
      }

      if (parsedQ.has("user")) {
        if (!user) {
          user = parsedQ.get("user");
        }
        parsedQ.delete("user");
      }

      if (parsedQ.has("password")) {
        if (!password) {
          password = parsedQ.get("password");
        }
        parsedQ.delete("password");
      }

      if (parsedQ.has("tls_cert_file")) {
        if (!tlsCAFile) {
          tlsCAFile = parsedQ.get("tls_cert_file");
        }
        parsedQ.delete("tls_cert_file");
      }

      if (parsedQ.has("tls_verify_hostname")) {
        if (tlsVerifyHostname == null) {
          tlsVerifyHostname = parseVerifyHostname(
            parsedQ.get("tls_verify_hostname") || ""
          );
        }
        parsedQ.delete("tls_verify_hostname");
      }

      // if there are more query params left, interpret them as serverSettings
      if (parsedQ.size) {
        if (serverSettings == null) {
          serverSettings = {};
        }

        for (const [key, val] of parsedQ) {
          serverSettings[key] = val;
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
    const credentialsFile = getCredentialsPath(dsn);
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
    if (tlsCAFile == null && credentials.tlsCAData != null) {
      tlsCAData.push(credentials.tlsCAData);
    }
    if (tlsVerifyHostname == null && "tlsVerifyHostname" in credentials) {
      tlsVerifyHostname = credentials.tlsVerifyHostname;
    }
  }

  // figure out host setting
  if (!host) {
    const hostspec = process.env.EDGEDB_HOST;
    if (hostspec) {
      fromEnv ||= true;
      const hl = parseHostlist(hostspec, port);
      host = hl[0];
      port = hl[1];
    } else {
      host = [];
      if (admin) {
        if (!(platform.isWindows || usingCredentials)) {
          host.push("/run/edgedb", "/var/run/edgedb");
        }
      } else {
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
      fromEnv ||= true;
      port = portspec.split(",").map(mapParseInt);
    } else {
      port = EDGEDB_PORT;
    }
  }

  // validate and normalize host and port
  port = validatePortSpec(host, port);

  if (!user) {
    user = process.env.EDGEDB_USER;
    fromEnv ||= !!user;
  }
  if (!user) {
    user = "edgedb";
  }

  if (!password) {
    password = process.env.EDGEDB_PASSWORD;
    fromEnv ||= !!password;
  }

  if (!database) {
    database = process.env.EDGEDB_DATABASE;
    fromEnv ||= !!database;
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

  let tlsOptions: tls.ConnectionOptions | undefined;
  if (!admin) {
    if (tlsCAFile) {
      tlsCAData.push(readFileUtf8Sync(tlsCAFile));
    }

    tlsOptions = {ALPNProtocols: ["edgedb-binary"]};

    if (tlsCAData.length !== 0) {
      if (tlsVerifyHostname == null) {
        tlsVerifyHostname = false;
      }

      // this option replaces the system CA certificates with the one provided.
      tlsOptions.ca = tlsCAData;
    } else {
      if (tlsVerifyHostname == null) {
        tlsVerifyHostname = true;
      }
    }

    if (!tlsVerifyHostname) {
      tlsOptions.checkServerIdentity = (hostname: string, cert: any) => {
        const err = tls.checkServerIdentity(hostname, cert);

        if (err === undefined) {
          return undefined;
        }

        // ignore failed hostname check
        if (err.message.startsWith("Hostname/IP does not match certificate")) {
          return undefined;
        }

        return err;
      };
    }
  }

  return {
    addrs,
    user,
    password,
    database,
    serverSettings,
    tlsOptions,
    fromProject,
    fromEnv,
    inProject,
  };
}

function parseHostlist(
  hostlist: string | string[],
  inputPort?: number | number[]
): [string[], number[], boolean] {
  let hostspecs: string[];
  const hosts: string[] = [];
  const hostlistPorts: number[] = [];
  let defaultPort: number[] = [];
  let ports: number[] = [];
  let fromEnv = false;

  if (hostlist instanceof Array) {
    hostspecs = hostlist;
  } else {
    hostspecs = hostlist.split(",");
  }

  if (!inputPort) {
    const portspec = process.env.EDGEDB_PORT;
    if (portspec) {
      fromEnv = true;
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

  return [hosts, ports, fromEnv];
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
