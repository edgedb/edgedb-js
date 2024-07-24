/*!
 * This source file is part of the EdgeDB open source project.
 *
 * Copyright 2020-present MagicStack Inc. and the EdgeDB authors.
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

import type { ResolvedConnectConfigReadonly } from "./conUtils";
import type { HttpSCRAMAuth } from "./httpScram";
import type { ProtocolVersion } from "./ifaces";

const idCounter: { [key: string]: number } = {};

export function getUniqueId(prefix = ""): string {
  if (!idCounter[prefix]) {
    idCounter[prefix] = 0;
  }
  const id = ++idCounter[prefix];
  return `_edgedb_${prefix}_${id.toString(16)}_`;
}

export function sleep(durationMillis: number): Promise<void> {
  return new Promise((accept) => {
    setTimeout(() => accept(), durationMillis);
  });
}

export function versionGreaterThan(
  left: ProtocolVersion,
  right: ProtocolVersion,
): boolean {
  if (left[0] > right[0]) {
    return true;
  }

  if (left[0] < right[0]) {
    return false;
  }

  return left[1] > right[1];
}

export function versionGreaterThanOrEqual(
  left: ProtocolVersion,
  right: ProtocolVersion,
): boolean {
  if (left[0] === right[0] && left[1] === right[1]) {
    return true;
  }

  return versionGreaterThan(left, right);
}

export interface CryptoUtils {
  makeKey: (key: Uint8Array) => Promise<Uint8Array | CryptoKey>;
  randomBytes: (size: number) => Uint8Array;
  H: (msg: Uint8Array) => Promise<Uint8Array>;
  HMAC: (key: Uint8Array | CryptoKey, msg: Uint8Array) => Promise<Uint8Array>;
}

const _tokens = new WeakMap<ResolvedConnectConfigReadonly, string>();

export type AuthenticatedFetch = (
  path: string,
  init: RequestInit,
) => Promise<Response>;

export async function getAuthenticatedFetch(
  config: ResolvedConnectConfigReadonly,
  httpSCRAMAuth: HttpSCRAMAuth,
  basePath?: string,
): Promise<AuthenticatedFetch> {
  let token = config.secretKey ?? _tokens.get(config);

  const { address, tlsSecurity, database } = config;

  const protocol = tlsSecurity === "insecure" ? "http" : "https";
  const baseUrl = `${protocol}://${address[0]}:${address[1]}`;
  const databaseUrl = `${baseUrl}/db/${database}/${basePath ?? ""}`;

  if (!token && config.password != null) {
    token = await httpSCRAMAuth(baseUrl, config.user, config.password);
    _tokens.set(config, token);
  }

  return (path: string, init: RequestInit) => {
    const url = new URL(path, databaseUrl);

    const headers = new Headers(init.headers);

    if (config.user !== undefined) {
      headers.append("X-EdgeDB-User", config.user);
    }

    if (token !== undefined) {
      headers.append("Authorization", `Bearer ${token}`);
    }

    return fetch(url, {
      ...init,
      headers,
    });
  };
}
