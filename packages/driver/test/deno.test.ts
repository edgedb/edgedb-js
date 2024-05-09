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

import { execFile } from "child_process";

jest.setTimeout(120000);
test("run deno test", async () => {
  return await new Promise<void>((resolve, reject) => {
    return execFile(
      "deno",
      [
        "test",
        "--unstable",
        "--allow-net",
        "--allow-env",
        "--allow-read",
        "--allow-write",
        "--unsafely-ignore-certificate-errors",
        "test",
      ],
      {
        env: process.env,
        timeout: 120_000,
        cwd: "../deno",
      },
      (error, stdout, stderr) => {
        console.log(stdout);
        if (error) {
          console.error(stderr);
          reject(error);
        }
        resolve();
      }
    );
  });
});

test("deno check", async () => {
  return await new Promise<void>((resolve, reject) => {
    return execFile(
      "deno",
      ["eval", 'import * as edgedb from "./mod.ts"'],
      {
        env: process.env,
        timeout: 60_000,
        cwd: "../deno",
      },
      (error, _stdout, stderr) => {
        if (error) {
          console.error(stderr);
          reject(error);
        }
        resolve();
      }
    );
  });
});
