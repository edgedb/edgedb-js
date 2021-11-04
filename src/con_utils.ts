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

import {path, crypto, fs, readFileUtf8, tls, exists} from "./adapter.node";
import * as errors from "./errors";
import {getCredentialsPath, readCredentialsFile} from "./credentials";
import * as platform from "./platform";

export type Address = [string, number];

export const validTlsSecurityValues = [
  "insecure",
  "no_host_verification",
  "strict",
  "default",
] as const;

export type TlsSecurity = typeof validTlsSecurityValues[number];

interface PartiallyNormalizedConfig {
  connectionParams: ResolvedConnectConfig;

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

  logging: boolean;
}

export interface ConnectConfig {
  dsn?: string;
  credentialsFile?: string;
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  serverSettings?: any;
  tlsCAFile?: string;
  tlsSecurity?: TlsSecurity;

  timeout?: number;
  commandTimeout?: number;
  waitUntilAvailable?: number;
  logging?: boolean;
}

export async function parseConnectArguments(
  opts: ConnectConfig = {}
): Promise<NormalizedConnectConfig> {
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

  const projectDir = await findProjectDir();

  return {
    ...(await parseConnectDsnAndArgs(opts, projectDir)),
    connectTimeout: opts.timeout,
    commandTimeout: opts.commandTimeout,
    waitUntilAvailable: opts.waitUntilAvailable ?? 30_000,
    logging: opts.logging ?? true,
  };
}

type ConnectConfigParams =
  | "host"
  | "port"
  | "database"
  | "user"
  | "password"
  | "tlsCAData"
  | "tlsSecurity";

export class ResolvedConnectConfig {
  _host: string | null = null;
  _hostSource: string | null = null;

  _port: number | null = null;
  _portSource: string | null = null;

  _database: string | null = null;
  _databaseSource: string | null = null;

  _user: string | null = null;
  _userSource: string | null = null;

  _password: string | null = null;
  _passwordSource: string | null = null;

  _tlsCAData: string | null = null;
  _tlsCADataSource: string | null = null;

  _tlsSecurity: TlsSecurity | null = null;
  _tlsSecuritySource: string | null = null;

  serverSettings: {[key: string]: string} = {};

  constructor() {
    this.setHost = this.setHost.bind(this);
    this.setPort = this.setPort.bind(this);
    this.setDatabase = this.setDatabase.bind(this);
    this.setUser = this.setUser.bind(this);
    this.setPassword = this.setPassword.bind(this);
    this.setTlsCAData = this.setTlsCAData.bind(this);
    this.setTlsCAFile = this.setTlsCAFile.bind(this);
    this.setTlsSecurity = this.setTlsSecurity.bind(this);
  }

  _setParam<Param extends ConnectConfigParams, Value extends any>(
    param: Param,
    value: Value,
    source: string,
    validator?: (value: NonNullable<Value>) => this[`_${Param}`]
  ): boolean {
    if (this[`_${param}`] === null) {
      this[`_${param}Source`] = source;
      if (value !== null) {
        this[`_${param}`] = validator
          ? validator(value as any)
          : (value as any);
        return true;
      }
    }
    return false;
  }
  async _setParamAsync<Param extends ConnectConfigParams, Value extends any>(
    param: Param,
    value: Value,
    source: string,
    validator?: (value: NonNullable<Value>) => Promise<this[`_${Param}`]>
  ): Promise<boolean> {
    if (this[`_${param}`] === null) {
      this[`_${param}Source`] = source;
      if (value !== null) {
        this[`_${param}`] = validator
          ? await validator(value as any)
          : (value as any);
        return true;
      }
    }
    return false;
  }

  setHost(host: string | null, source: string): boolean {
    return this._setParam("host", host, source, validateHost);
  }

  setPort(port: string | number | null, source: string): boolean {
    return this._setParam("port", port, source, parseValidatePort);
  }

  setDatabase(database: string | null, source: string): boolean {
    return this._setParam("database", database, source, (db: string) => {
      if (db === "") {
        throw new Error(`invalid database name: '${db}'`);
      }
      return db;
    });
  }

  setUser(user: string | null, source: string): boolean {
    return this._setParam("user", user, source, (_user: string) => {
      if (_user === "") {
        throw new Error(`invalid user name: '${_user}'`);
      }
      return _user;
    });
  }

  setPassword(password: string | null, source: string): boolean {
    return this._setParam("password", password, source);
  }

  setTlsCAData(caData: string | null, source: string): boolean {
    return this._setParam("tlsCAData", caData, source);
  }

  setTlsCAFile(caFile: string | null, source: string): Promise<boolean> {
    return this._setParamAsync("tlsCAData", caFile, source, (caFilePath) =>
      readFileUtf8(caFilePath)
    );
  }

  setTlsSecurity(tlsSecurity: string | null, source: string): boolean {
    return this._setParam(
      "tlsSecurity",
      tlsSecurity,
      source,
      (_tlsSecurity: string) => {
        if (!validTlsSecurityValues.includes(_tlsSecurity as any)) {
          throw new Error(
            `invalid 'tlsSecurity' value: '${_tlsSecurity}', ` +
              `must be one of ${validTlsSecurityValues
                .map((val) => `'${val}'`)
                .join(", ")}`
          );
        }
        return _tlsSecurity as TlsSecurity;
      }
    );
  }

  addServerSettings(settings: {[key: string]: string}): void {
    this.serverSettings = {
      ...settings,
      ...this.serverSettings,
    };
  }

  get address(): Address {
    return [this._host ?? "localhost", this._port ?? 5656];
  }

  get database(): string {
    return this._database ?? "edgedb";
  }

  get user(): string {
    return this._user ?? "edgedb";
  }

  get password(): string | undefined {
    return this._password ?? undefined;
  }

  get tlsSecurity(): Exclude<TlsSecurity, "default"> {
    return this._tlsSecurity && this._tlsSecurity !== "default"
      ? this._tlsSecurity
      : this._tlsCAData !== null
      ? "no_host_verification"
      : "strict";
  }

  private _tlsOptions?: tls.ConnectionOptions;
  get tlsOptions(): tls.ConnectionOptions {
    if (this._tlsOptions) {
      return this._tlsOptions;
    }

    let tlsSecurity = this.tlsSecurity;
    const clientSecurity = process.env.EDGEDB_CLIENT_SECURITY;
    if (clientSecurity !== undefined) {
      if (!["default", "insecure_dev_mode"].includes(clientSecurity)) {
        throw new Error(
          `invalid EDGEDB_CLIENT_SECURITY value: '${clientSecurity}', ` +
            `must be either 'default' or 'insecure_dev_mode'`
        );
      }
      if (clientSecurity === "insecure_dev_mode") {
        tlsSecurity = "insecure";
      }
    }

    this._tlsOptions = {
      ALPNProtocols: ["edgedb-binary"],
      rejectUnauthorized: tlsSecurity !== "insecure",
    };

    if (this._tlsCAData !== null) {
      // this option replaces the system CA certificates with the one provided.
      this._tlsOptions.ca = this._tlsCAData;
    }

    if (tlsSecurity === "no_host_verification") {
      this._tlsOptions.checkServerIdentity = (hostname: string, cert: any) => {
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

    return this._tlsOptions;
  }

  explainConfig(): string {
    const output: string[] = [
      `Parameter          Value                                    Source`,
      `---------          -----                                    ------`,
    ];

    const outputLine = (param: string, val: any, rawVal: any, source: any) => {
      const isDefault = rawVal === null;
      const maxValLength = 40 - (isDefault ? 10 : 0);
      let value = String(val);
      if (value.length > maxValLength) {
        value = value.slice(0, maxValLength - 3) + "...";
      }
      output.push(
        param.padEnd(19, " ") +
          (value + (isDefault ? " (default)" : "")).padEnd(42, " ") +
          source ?? "default"
      );
    };

    outputLine("host", this.address[0], this._host, this._hostSource);
    outputLine("port", this.address[1], this._port, this._portSource);
    outputLine(
      "database",
      this.database,
      this._database,
      this._databaseSource
    );
    outputLine("user", this.user, this._user, this._userSource);
    outputLine(
      "password",
      this.password &&
        this.password.slice(0, 3).padEnd(this.password.length, "*"),
      this._password,
      this._passwordSource
    );
    outputLine(
      "tlsCAData",
      this._tlsCAData && this._tlsCAData.replace("\n", ""),
      this._tlsCAData,
      this._tlsCADataSource
    );
    outputLine(
      "tlsSecurity",
      this.tlsSecurity,
      this._tlsSecurity,
      this._tlsSecuritySource
    );

    return output.join("\n");
  }
}

function parseValidatePort(port: string | number): number {
  let parsedPort: number;
  if (typeof port === "string") {
    if (!/^\d*$/.test(port)) {
      throw new Error(`invalid port: ${port}`);
    }
    parsedPort = parseInt(port, 10);
    if (Number.isNaN(parsedPort)) {
      throw new Error(`invalid port: ${port}`);
    }
  } else {
    parsedPort = port;
  }
  if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
    throw new Error(`invalid port: ${port}`);
  }
  return parsedPort;
}

function validateHost(host: string): string {
  if (host.includes("/")) {
    throw new Error(`unix socket paths not supported`);
  }
  if (!host.length || host.includes(",")) {
    throw new Error(`invalid host: '${host}'`);
  }
  return host;
}

async function parseConnectDsnAndArgs(
  config: ConnectConfig,
  projectDir: string | null
): Promise<PartiallyNormalizedConfig> {
  const resolvedConfig = new ResolvedConnectConfig();
  let fromEnv = false;
  let fromProject = false;

  const [dsn, instanceName]: [string | undefined, string | undefined] =
    config.dsn && /^[a-z]+:\/\//i.test(config.dsn)
      ? [config.dsn, undefined]
      : [undefined, config.dsn];

  // resolve explicit config options
  let {hasCompoundOptions} = await resolveConfigOptions(
    resolvedConfig,
    {
      dsn,
      instanceName,
      credentialsFile: config.credentialsFile,
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      tlsCAFile: config.tlsCAFile,
      tlsSecurity: config.tlsSecurity,
      serverSettings: config.serverSettings,
    },
    {
      dsn: `'dsnOrInstanceName' option (parsed as dsn)`,
      instanceName: `'dsnOrInstanceName' option (parsed as instance name)`,
      credentialsFile: `'credentialsFile' option`,
      host: `'host' option`,
      port: `'port' option`,
      database: `'database' option`,
      user: `'user' option`,
      password: `'password' option`,
      tlsCAFile: `'tlsCAFile' option`,
      tlsSecurity: `'tlsSecurity' option`,
      serverSettings: `'serverSettings' option`,
    },
    `Cannot have more than one of the following connection options: ` +
      `'dsnOrInstanceName', 'credentialsFile' or 'host'/'port'`
  );

  if (!hasCompoundOptions) {
    // resolve config from env vars

    let port: string | undefined = process.env.EDGEDB_PORT;
    if (resolvedConfig._port === null && port?.startsWith("tcp://")) {
      // EDGEDB_PORT is set by 'docker --link' so ignore and warn
      // tslint:disable-next-line: no-console
      console.warn(
        `EDGEDB_PORT in 'tcp://host:port' format, so will be ignored`
      );
      port = undefined;
    }

    ({hasCompoundOptions, anyOptionsUsed: fromEnv} =
      await resolveConfigOptions(
        resolvedConfig,
        {
          dsn: process.env.EDGEDB_DSN,
          instanceName: process.env.EDGEDB_INSTANCE,
          credentialsFile: process.env.EDGEDB_CREDENTIALS_FILE,
          host: process.env.EDGEDB_HOST,
          port,
          database: process.env.EDGEDB_DATABASE,
          user: process.env.EDGEDB_USER,
          password: process.env.EDGEDB_PASSWORD,
          tlsCAFile: process.env.EDGEDB_TLS_CA_FILE,
          tlsSecurity: process.env.EDGEDB_CLIENT_TLS_SECURITY,
        },
        {
          dsn: `'EDGEDB_DSN' environment variable`,
          instanceName: `'EDGEDB_INSTANCE' environment variable`,
          credentialsFile: `'EDGEDB_CREDENTIALS_FILE' environment variable`,
          host: `'EDGEDB_HOST' environment variable`,
          port: `'EDGEDB_PORT' environment variable`,
          database: `'EDGEDB_DATABASE' environment variable`,
          user: `'EDGEDB_USER' environment variable`,
          password: `'EDGEDB_PASSWORD' environment variable`,
          tlsCAFile: `'EDGEDB_TLS_CA_FILE' environment variable`,
          tlsSecurity: `'EDGEDB_CLIENT_TLS_SECURITY' environment variable`,
        },
        `Cannot have more than one of the following connection environment variables: ` +
          `'EDGEDB_DSN', 'EDGEDB_INSTANCE', 'EDGEDB_CREDENTIALS_FILE' or 'EDGEDB_HOST'`
      ));
  }

  if (!hasCompoundOptions) {
    // resolve config from project
    if (!projectDir) {
      throw new errors.ClientConnectionError(
        "no 'edgedb.toml' found and no connection options specified" +
          " either via arguments to `connect()` API or via environment" +
          " variables EDGEDB_HOST, EDGEDB_INSTANCE, EDGEDB_DSN or EDGEDB_CREDENTIALS_FILE"
      );
    }
    const stashDir = await stashPath(projectDir);
    const instName = await readFileUtf8(path.join(stashDir, "instance-name"))
      .then((name) => name.trim())
      .catch(() => null);

    if (instName !== null) {
      await resolveConfigOptions(
        resolvedConfig,
        {instanceName: instName},
        {instanceName: `project linked instance ('${instName}')`},
        ""
      );
      fromProject = true;
    } else {
      throw new errors.ClientConnectionError(
        "Found 'edgedb.toml' but the project is not initialized. " +
          "Run `edgedb project init`."
      );
    }
  }

  return {
    connectionParams: resolvedConfig,
    inProject: !!projectDir,
    fromEnv,
    fromProject,
  };
}

async function stashPath(projectDir: string): Promise<string> {
  let projectPath = await fs.realpath(projectDir);
  if (platform.isWindows && !projectPath.startsWith("\\\\")) {
    projectPath = "\\\\?\\" + projectPath;
  }

  const hash = crypto.createHash("sha1").update(projectPath).digest("hex");
  const baseName = path.basename(projectPath);
  const dirName = baseName + "-" + hash;

  return platform.searchConfigDir("projects", dirName);
}

const projectDirCache = new Map<string, string | null>();

async function findProjectDir(): Promise<string | null> {
  const workingDir = process.cwd();

  if (projectDirCache.has(workingDir)) {
    return projectDirCache.get(workingDir)!;
  }

  let dir = workingDir;
  const cwdDev = (await fs.stat(dir)).dev;
  while (true) {
    if (await exists(path.join(dir, "edgedb.toml"))) {
      projectDirCache.set(workingDir, dir);
      return dir;
    }
    const parentDir = path.join(dir, "..");
    if (parentDir === dir || (await fs.stat(parentDir)).dev !== cwdDev) {
      projectDirCache.set(workingDir, null);
      return null;
    }
    dir = parentDir;
  }
}

interface ResolveConfigOptionsConfig {
  dsn: string;
  instanceName: string;
  credentialsFile: string;
  host: string;
  port: number | string;
  database: string;
  user: string;
  password: string;
  tlsCAFile: string;
  tlsSecurity: string;
  serverSettings: {[key: string]: string};
}

async function resolveConfigOptions<
  Config extends Partial<ResolveConfigOptionsConfig>
>(
  resolvedConfig: ResolvedConnectConfig,
  config: Config,
  sources: {[key in keyof Config]: string},
  compoundParamsError: string
): Promise<{hasCompoundOptions: boolean; anyOptionsUsed: boolean}> {
  let anyOptionsUsed = false;

  anyOptionsUsed =
    resolvedConfig.setDatabase(config.database ?? null, sources.database!) ||
    anyOptionsUsed;
  anyOptionsUsed =
    resolvedConfig.setUser(config.user ?? null, sources.user!) ||
    anyOptionsUsed;
  anyOptionsUsed =
    resolvedConfig.setPassword(config.password ?? null, sources.password!) ||
    anyOptionsUsed;
  anyOptionsUsed =
    (await resolvedConfig.setTlsCAFile(
      config.tlsCAFile ?? null,
      sources.tlsCAFile!
    )) || anyOptionsUsed;
  anyOptionsUsed =
    resolvedConfig.setTlsSecurity(
      config.tlsSecurity ?? null,
      sources.tlsSecurity!
    ) || anyOptionsUsed;
  resolvedConfig.addServerSettings(config.serverSettings ?? {});

  const compoundParamsCount = [
    config.dsn,
    config.instanceName,
    config.credentialsFile,
    config.host ?? config.port,
  ].filter((param) => param !== undefined).length;

  if (compoundParamsCount > 1) {
    throw new Error(compoundParamsError);
  }

  if (compoundParamsCount === 1) {
    if (
      config.dsn !== undefined ||
      config.host !== undefined ||
      config.port !== undefined
    ) {
      let dsn = config.dsn;
      if (dsn === undefined) {
        if (config.port !== undefined) {
          resolvedConfig.setPort(config.port, sources.port!);
        }
        dsn = `edgedb://${
          config.host != null ? validateHost(config.host) : ""
        }`;
      }
      await parseDSNIntoConfig(
        dsn,
        resolvedConfig,
        config.dsn
          ? sources.dsn!
          : config.host !== undefined
          ? sources.host!
          : sources.port!
      );
    } else {
      let credentialsFile = config.credentialsFile;
      if (credentialsFile === undefined) {
        if (!/^[A-Za-z_][A-Za-z_0-9]*$/.test(config.instanceName!)) {
          throw new Error(
            `invalid DSN or instance name: '${config.instanceName}'`
          );
        }
        credentialsFile = await getCredentialsPath(config.instanceName!);
      }
      const creds = await readCredentialsFile(credentialsFile);

      const source = config.credentialsFile
        ? sources.credentialsFile!
        : sources.instanceName!;

      resolvedConfig.setHost(creds.host ?? null, source);
      resolvedConfig.setPort(creds.port ?? null, source);
      resolvedConfig.setDatabase(creds.database ?? null, source);
      resolvedConfig.setUser(creds.user ?? null, source);
      resolvedConfig.setPassword(creds.password ?? null, source);
      resolvedConfig.setTlsCAData(creds.tlsCAData ?? null, source);
      resolvedConfig.setTlsSecurity(creds.tlsSecurity ?? null, source);
    }
    return {hasCompoundOptions: true, anyOptionsUsed: true};
  }

  return {hasCompoundOptions: false, anyOptionsUsed};
}

async function parseDSNIntoConfig(
  dsnString: string,
  config: ResolvedConnectConfig,
  source: string
): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(dsnString);
  } catch (e) {
    throw new Error(`invalid DSN or instance name: '${dsnString}'`);
  }

  if (parsed.protocol !== "edgedb:") {
    throw new Error(
      `invalid DSN: scheme is expected to be ` +
        `'edgedb', got '${parsed.protocol.slice(0, -1)}'`
    );
  }

  const searchParams = new Map<string, string>();
  for (const [key, value] of parsed.searchParams) {
    if (searchParams.has(key)) {
      throw new Error(`invalid DSN: duplicate query parameter '${key}'`);
    }
    searchParams.set(key, value);
  }

  async function handleDSNPart(
    paramName: string,
    value: string | null,
    currentValue: any,
    setter: (value: string | null, source: string) => any | Promise<unknown>,
    formatter: (val: string) => string = (val) => val
  ): Promise<void> {
    if (
      [
        value || null,
        searchParams.get(paramName),
        searchParams.get(`${paramName}_env`),
        searchParams.get(`${paramName}_file`),
      ].filter((param) => param != null).length > 1
    ) {
      throw new Error(
        `invalid DSN: more than one of ${
          value !== null ? `'${paramName}', ` : ""
        }'?${paramName}=', ` +
          `'?${paramName}_env=' or '?${paramName}_file=' was specified ${dsnString}`
      );
    }

    if (currentValue === null) {
      let param = value || (searchParams.get(paramName) ?? null);
      let paramSource = source;
      if (param === null) {
        const env = searchParams.get(`${paramName}_env`);
        if (env != null) {
          param = process.env[env] ?? null;
          if (param === null) {
            throw new Error(
              `'${paramName}_env' environment variable '${env}' doesn't exist`
            );
          }
          paramSource += ` (${paramName}_env: ${env})`;
        }
      }
      if (param === null) {
        const file = searchParams.get(`${paramName}_file`);
        if (file != null) {
          param = await readFileUtf8(file);
          paramSource += ` (${paramName}_file: ${file})`;
        }
      }

      param = param !== null ? formatter(param) : null;

      await setter(param, paramSource);
    }

    searchParams.delete(paramName);
    searchParams.delete(`${paramName}_env`);
    searchParams.delete(`${paramName}_file`);
  }

  await handleDSNPart("host", parsed.hostname, config._host, config.setHost);

  await handleDSNPart("port", parsed.port, config._port, config.setPort);

  const stripLeadingSlash = (str: string) => str.replace(/^\//, "");
  await handleDSNPart(
    "database",
    stripLeadingSlash(parsed.pathname),
    config._database,
    config.setDatabase,
    stripLeadingSlash
  );

  await handleDSNPart("user", parsed.username, config._user, config.setUser);

  await handleDSNPart(
    "password",
    parsed.password,
    config._password,
    config.setPassword
  );

  await handleDSNPart(
    "tls_cert_file",
    null,
    config._tlsCAData,
    config.setTlsCAFile
  );

  await handleDSNPart(
    "tls_security",
    null,
    config._tlsSecurity,
    config.setTlsSecurity
  );

  const serverSettings: any = {};
  for (const [key, value] of searchParams) {
    serverSettings[key] = value;
  }
  config.addServerSettings(serverSettings);
}
