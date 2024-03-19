/**
 * @jest-environment ./test/jsdom-with-fetch.ts
 */

const { TextEncoder, TextDecoder } = require("util");
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
import { getEdgeDBVersion } from "./testbase";

const nodeVersion = parseInt(process.version.slice(1).split(".")[0], 10);

if (nodeVersion >= 15) {
  // @ts-ignore
  crypto.subtle = require("crypto").webcrypto.subtle;
}

const version = getEdgeDBVersion();

beforeAll(async () => {
  for (const nodeModule of [
    "node:assert",
    "node:async_hooks",
    "node:buffer",
    "node:child_process",
    "node:cluster",
    "node:console",
    "node:constants",
    "node:crypto",
    "node:dgram",
    "node:dns",
    "node:domain",
    "node:events",
    "node:fs",
    "node:http",
    "node:http2",
    "node:https",
    "node:inspector",
    "node:module",
    "node:net",
    "node:os",
    "node:path",
    "node:perf_hooks",
    "node:process",
    "node:punycode",
    "node:querystring",
    "node:readline",
    "node:repl",
    "node:stream",
    "node:string_decoder",
    "node:timers",
    "node:tls",
    "node:trace_events",
    "node:tty",
    "node:url",
    "node:util",
    "node:v8",
    "node:vm",
    "node:worker_threads",
    "node:zlib",
  ]) {
    jest.mock(nodeModule, () => {
      throw new Error(`Cannot use node module '${nodeModule}' in browser`);
    });
  }
});

import {
  createClient,
  createHttpClient,
  EdgeDBError,
} from "../src/index.browser";

const brokenConnectOpts = JSON.parse(
  process.env._JEST_EDGEDB_CONNECT_CONFIG || ""
);

const connectOpts = {
  ...brokenConnectOpts,
  tlsCAFile: undefined,
  tlsSecurity: "insecure",
};

// Skip tests on node < 15, since webcrypto api not available
if (nodeVersion >= 15) {
  test("createClient fails", () => {
    if (version.major < 2) return;
    expect(() => createClient()).toThrowError(EdgeDBError);
  });

  test("createHttpClient no options", async () => {
    if (version.major < 2) return;
    const client = createHttpClient();

    await expect(client.ensureConnected()).rejects.toThrowError(
      /no connection options specified/
    );
  });

  test("basic queries", async () => {
    if (version.major < 2) return;
    const client = createHttpClient(connectOpts);

    expect(
      await client.querySingle(`select 'Querying from the ' ++ <str>$env`, {
        env: "browser",
      })
    ).toEqual("Querying from the browser");
  });
} else {
  test.skip("skipping browser test", () => {
    // dummy test to satisfy jest
  });
}
