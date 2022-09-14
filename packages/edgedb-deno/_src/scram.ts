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

import {Buffer} from "./globals.deno.ts";

import {randomBytes, H, HMAC} from "./adapter.deno.ts";
import {ProtocolError} from "./errors/index.ts";

export {H, HMAC};

const RAW_NONCE_LENGTH = 18;

export function saslprep(str: string): string {
  // An actual implementation of SASLPrep requires a Unicode database.
  // One of the most important tasks is to do the NFKC normalization though.
  // usernames/password validation happens on the server side (where
  // SASLPrep is implemented fully) when a role is created, so worst case
  // scenario would be that invalid usernames/passwords can be sent to the
  // server, in which case they will be rejected.
  return str.normalize("NFKC");
}

export async function generateNonce(
  length: number = RAW_NONCE_LENGTH
): Promise<Buffer> {
  return await randomBytes(length);
}

export function buildClientFirstMessage(
  clientNonce: Buffer,
  username: string
): [string, string] {
  const bare = `n=${saslprep(username)},r=${clientNonce.toString("base64")}`;
  return [`n,,${bare}`, bare];
}

export function parseServerFirstMessage(
  msg: string
): [Buffer, Buffer, number] {
  const attrs = msg.split(",");

  if (attrs.length < 3) {
    throw new ProtocolError("malformed SCRAM message");
  }

  const nonceAttr = attrs[0];
  if (!nonceAttr || nonceAttr[0] !== "r") {
    throw new ProtocolError("malformed SCRAM message");
  }
  const nonceB64 = nonceAttr.split("=", 2)[1];
  if (!nonceB64) {
    throw new ProtocolError("malformed SCRAM message");
  }
  const nonce = Buffer.from(nonceB64, "base64");

  const saltAttr = attrs[1];
  if (!saltAttr || saltAttr[0] !== "s") {
    throw new ProtocolError("malformed SCRAM message");
  }
  const saltB64 = saltAttr.split("=", 2)[1];
  if (!saltB64) {
    throw new ProtocolError("malformed SCRAM message");
  }
  const salt = Buffer.from(saltB64, "base64");

  const iterAttr = attrs[2];
  if (!iterAttr || iterAttr[0] !== "i") {
    throw new ProtocolError("malformed SCRAM message");
  }
  const iter = iterAttr.split("=", 2)[1];
  if (!iter || !iter.match(/^[0-9]*$/)) {
    throw new ProtocolError("malformed SCRAM message");
  }
  const iterCount = parseInt(iter, 10);
  if (iterCount <= 0) {
    throw new ProtocolError("malformed SCRAM message");
  }

  return [nonce, salt, iterCount];
}

export function parseServerFinalMessage(msg: string): Buffer {
  const attrs = msg.split(",");

  if (attrs.length < 1) {
    throw new ProtocolError("malformed SCRAM message");
  }

  const nonceAttr = attrs[0];
  if (!nonceAttr || nonceAttr[0] !== "v") {
    throw new ProtocolError("malformed SCRAM message");
  }
  const signatureB64 = nonceAttr.split("=", 2)[1];
  if (!signatureB64) {
    throw new ProtocolError("malformed SCRAM message");
  }
  const sig = Buffer.from(signatureB64, "base64");
  return sig;
}

export function buildClientFinalMessage(
  password: string,
  salt: Buffer,
  iterations: number,
  clientFirstBare: string,
  serverFirst: string,
  serverNonce: Buffer
): [string, Buffer] {
  const clientFinal = `c=biws,r=${serverNonce.toString("base64")}`;
  const authMessage = Buffer.from(
    `${clientFirstBare},${serverFirst},${clientFinal}`,
    "utf8"
  );
  const saltedPassword = getSaltedPassword(
    Buffer.from(saslprep(password), "utf8"),
    salt,
    iterations
  );
  const clientKey = getClientKey(saltedPassword);
  const storedKey = H(clientKey);
  const clientSignature = HMAC(storedKey, authMessage);
  const clientProof = XOR(clientKey, clientSignature);

  const serverKey = getServerKey(saltedPassword);
  const serverProof = HMAC(serverKey, authMessage);

  return [`${clientFinal},p=${clientProof.toString("base64")}`, serverProof];
}

export function getSaltedPassword(
  password: Buffer,
  salt: Buffer,
  iterations: number
): Buffer {
  // U1 := HMAC(str, salt + INT(1))

  let Hi = HMAC(password, salt, Buffer.from("00000001", "hex"));
  let Ui = Hi;

  for (let _ = 0; _ < iterations - 1; _++) {
    Ui = HMAC(password, Ui);
    Hi = XOR(Hi, Ui);
  }

  return Hi;
}

export function getClientKey(saltedPassword: Buffer): Buffer {
  return HMAC(saltedPassword, Buffer.from("Client Key", "utf8"));
}

export function getServerKey(saltedPassword: Buffer): Buffer {
  return HMAC(saltedPassword, Buffer.from("Server Key", "utf8"));
}

export function XOR(a: Buffer, b: Buffer): Buffer {
  const len = a.length;
  if (len !== b.length) {
    throw new ProtocolError("scram.XOR: buffers are of different lengths");
  }
  const res = Buffer.allocUnsafe(len);
  for (let i = 0; i < len; i++) {
    res[i] = a[i] ^ b[i];
  }
  return res;
}
