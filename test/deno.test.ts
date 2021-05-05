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

import {execFile} from "child_process";

test("run deno test", async () => {
  jest.setTimeout(60_000);

  return new Promise<void>((resolve, reject) => {
    execFile(
      "deno",
      [
        "test",
        "--unstable",
        "--allow-net",
        "--allow-env",
        "--allow-read",
        "--allow-write",
        "test/deno",
      ],
      {
        env: process.env,
      },
      (error, stdout, stderr) => {
        if (error) {
          console.error(stderr);
          reject(error);
        }
        console.log(stdout);
        resolve();
      }
    );
  });
});
