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

import type {TLSSocket} from "tls";

interface PatchedTLSSocket extends TLSSocket {
  abortOnMessageType: number | null;
  abortOnNextMessageType(messageType: number): void;
}

let currentSocket: PatchedTLSSocket | null = null;

jest.mock("tls", () => {
  const actualTls = jest.requireActual("tls");

  function patchTlsSocket(_socket: TLSSocket) {
    const socket = _socket as PatchedTLSSocket;
    socket.abortOnMessageType = null;
    socket.abortOnNextMessageType = function (messageType: number) {
      this.abortOnMessageType = messageType;
    };
    const oldOnHandler = socket.on.bind(socket);
    socket.on = function (event: string, listener: (...args: any[]) => void) {
      const wrappedListener =
        event === "data"
          ? (...args: any[]) => {
              const data = args[0] as Buffer;
              const messageType = data[0];
              if (messageType === this.abortOnMessageType) {
                this.destroy();
              } else {
                listener(...args);
              }
            }
          : listener;

      return oldOnHandler(event, wrappedListener);
    };
    return socket;
  }

  return {
    ...actualTls,
    connect(...args: any[]) {
      const socket = patchTlsSocket(actualTls.connect(...args));
      currentSocket = socket;
      return socket;
    },
  };
});

import {getClient} from "./testbase";
import * as chars from "../src/primitives/chars";
import {sleep} from "../src/utils";

test("transaction retry on connection error after start", async () => {
  const client = getClient({concurrency: 1});

  let retryCount = 0;
  const result = await client.transaction(async tx => {
    retryCount++;

    if (retryCount === 1) {
      currentSocket!.destroy();
    }

    return await tx.querySingle(`select 'Hello EdgeDB!'`);
  });

  expect(result).toBe("Hello EdgeDB!");
  expect(retryCount).toBe(2);

  await client.close();
});

test("transaction retry on connection error before commit", async () => {
  const client = getClient({concurrency: 1});

  let retryCount = 0;
  const result = await client.transaction(async tx => {
    retryCount++;

    const result = await tx.querySingle(`select 'Hello EdgeDB!'`);

    if (retryCount === 1) {
      currentSocket!.destroy();
      await sleep(0);
    }

    return result;
  });

  expect(result).toBe("Hello EdgeDB!");
  expect(retryCount).toBe(2);

  await client.close();
});

test("transaction retry on connection error after commit", async () => {
  const client = getClient({concurrency: 1});

  let retryCount = 0;
  await expect(
    client.transaction(async tx => {
      retryCount++;

      const result = await tx.querySingle(`select 'Hello EdgeDB!'`);

      if (retryCount === 1) {
        // abort connection on CommandComplete message from 'COMMIT'
        currentSocket!.abortOnNextMessageType(chars.$C);
      }

      return result;
    })
  ).rejects.toThrow();

  // did not retry failed commit
  expect(retryCount).toBe(1);

  await client.close();
});
