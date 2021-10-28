import {readFileUtf8, path} from "./adapter.node";
import * as platform from "./platform";

export interface Credentials {
  host?: string;
  port?: number;
  user: string;
  password?: string;
  database?: string;
  tlsCAData?: string;
  tlsVerifyHostname?: boolean;
}

export async function getCredentialsPath(
  instanceName: string
): Promise<string> {
  return platform.searchConfigDir("credentials", instanceName + ".json");
}

export async function readCredentialsFile(file: string): Promise<Credentials> {
  try {
    const data: string = await readFileUtf8(file);
    return validateCredentials(JSON.parse(data));
  } catch (e) {
    throw Error(`cannot read credentials file ${file}: ${e}`);
  }
}

export function validateCredentials(data: any): Credentials {
  const port = data.port;
  if (port != null && (typeof port !== "number" || port < 1 || port > 65535)) {
    throw Error("invalid `port` value");
  }

  const user = data.user;
  if (user == null) {
    throw Error("`user` key is required");
  }
  if (typeof user !== "string") {
    throw Error("`user` must be string");
  }

  const result: Credentials = {user, port};

  const host = data.host;
  if (host != null) {
    if (typeof host !== "string") {
      throw Error("`host` must be string");
    }
    result.host = host;
  }

  const database = data.database;
  if (database != null) {
    if (typeof database !== "string") {
      throw Error("`database` must be string");
    }
    result.database = database;
  }

  const password = data.password;
  if (password != null) {
    if (typeof password !== "string") {
      throw Error("`password` must be string");
    }
    result.password = password;
  }

  const certData = data.tls_cert_data;
  if (certData != null) {
    if (typeof certData !== "string") {
      throw Error("`tls_cert_data` must be string");
    }
    result.tlsCAData = certData;
  }

  const verifyHostname = data.tls_verify_hostname;
  if (verifyHostname != null) {
    if (typeof verifyHostname !== "boolean") {
      throw Error("`tls_verify_hostname` must be boolean");
    }
    result.tlsVerifyHostname = verifyHostname;
  }

  return result;
}
