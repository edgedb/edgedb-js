import {fs} from "./adapter.node";

export interface Credentials {
  host?: string;
  port: number;
  user: string;
  password?: string;
  database?: string;
}

export function readCredentialsFile(file: string): Credentials {
  try {
    const data: string = fs.readFileSync(file, {encoding: "utf8"});
    return validateCredentials(JSON.parse(data));
  } catch (e) {
    throw Error(`cannot read credentials file ${file}: ${e}`);
  }
}

export function validateCredentials(data: any): Credentials {
  let port = data.port;
  if (port == null) {
    port = 5656;
  }
  if (typeof port !== "number" || port < 1 || port > 65535) {
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

  return result;
}
