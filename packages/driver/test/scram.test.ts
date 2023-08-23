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

import { getSCRAM, saslprep } from "../src/scram";
import cryptoUtils from "../src/adapter.crypto.node";

const scram = getSCRAM(cryptoUtils);

test("scram: RFC example", async () => {
  // Test SCRAM-SHA-256 against an example in RFC 7677

  const username = "user";
  const password = "pencil";
  const clientNonce = "rOprNGfwEbeRWgbNEkqO";
  const serverNonce = "rOprNGfwEbeRWgbNEkqO%hvYDpWUa2RaTCAfuxFIlj)hNlF$k0";
  const salt = "W22ZaJ0SNY7soEsUEjb6gQ==";
  const channelBinding = "biws";
  const iterations = 4096;

  const client_first = `n=${username},r=${clientNonce}`;
  const server_first = `r=${serverNonce},s=${salt},i=${iterations}`;
  const client_final = `c=${channelBinding},r=${serverNonce}`;

  const authMessage = `${client_first},${server_first},${client_final}`;

  const saltedPassword = await scram._getSaltedPassword(
    Buffer.from(saslprep(password), "utf-8"),
    Buffer.from(salt, "base64"),
    iterations
  );

  const clientKey = await scram._getClientKey(saltedPassword);
  const serverKey = await scram._getServerKey(saltedPassword);
  const storedKey = await cryptoUtils.H(clientKey);

  const clientSignature = await cryptoUtils.HMAC(
    storedKey,
    Buffer.from(authMessage, "utf8")
  );
  const clientProof = scram._XOR(clientKey, clientSignature);
  const serverProof = await cryptoUtils.HMAC(
    serverKey,
    Buffer.from(authMessage, "utf8")
  );

  expect(Buffer.from(clientProof).toString("base64")).toBe(
    "dHzbZapWIk4jUhN+Ute9ytag9zjfMHgsqmmiz7AndVQ="
  );
  expect(Buffer.from(serverProof).toString("base64")).toBe(
    "6rriTRBi23WpRR/wtup+mMhUZUn/dB5nLTJRsjl95G4="
  );
});
