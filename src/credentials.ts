import {readFileUtf8, path, tls} from "./adapter.node";
import {validTlsSecurityValues, TlsSecurity} from "./conUtils";
import * as platform from "./platform";

export interface Credentials {
  host?: string;
  port?: number;
  user: string;
  password?: string;
  database?: string;
  tlsCAData?: string;
  tlsSecurity?: TlsSecurity;
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
    throw new Error(`cannot read credentials file ${file}: ${e}`);
  }
}

export function validateCredentials(data: any): Credentials {
  const port = data.port;
  if (port != null && (typeof port !== "number" || port < 1 || port > 65535)) {
    throw new Error("invalid `port` value");
  }

  const user = data.user;
  if (user == null) {
    throw new Error("`user` key is required");
  }
  if (typeof user !== "string") {
    throw new Error("`user` must be string");
  }

  const result: Credentials = {user, port};

  const host = data.host;
  if (host != null) {
    if (typeof host !== "string") {
      throw new Error("`host` must be string");
    }
    result.host = host;
  }

  const database = data.database;
  if (database != null) {
    if (typeof database !== "string") {
      throw new Error("`database` must be string");
    }
    result.database = database;
  }

  const password = data.password;
  if (password != null) {
    if (typeof password !== "string") {
      throw new Error("`password` must be string");
    }
    result.password = password;
  }

  const certData = data.tls_cert_data;
  if (certData != null) {
    if (typeof certData !== "string") {
      throw new Error("`tls_cert_data` must be string");
    }
    result.tlsCAData = certData;
  }

  let verifyHostname = data.tls_verify_hostname;
  const tlsSecurity = data.tls_security;
  if (verifyHostname != null) {
    if (typeof verifyHostname === "boolean") {
      verifyHostname = verifyHostname ? "strict" : "no_host_verification";
    } else {
      throw new Error("`tls_verify_hostname` must be boolean");
    }
  }
  if (
    tlsSecurity != null &&
    (typeof tlsSecurity !== "string" ||
      !validTlsSecurityValues.includes(tlsSecurity as any))
  ) {
    throw new Error(
      `\`tls_security\` must be one of ${validTlsSecurityValues
        .map((val) => `"${val}"`)
        .join(", ")}`
    );
  }
  if (
    verifyHostname &&
    tlsSecurity &&
    verifyHostname !== tlsSecurity &&
    !(verifyHostname === "no_host_verification" && tlsSecurity === "insecure")
  ) {
    throw new Error(
      `both 'tls_security' and 'tls_verify_hostname' are defined, ` +
        `and are not in agreement`
    );
  }
  if (tlsSecurity || verifyHostname) {
    result.tlsSecurity = tlsSecurity ?? verifyHostname;
  }

  return result;
}
