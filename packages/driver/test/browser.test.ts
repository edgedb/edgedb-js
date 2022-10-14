/**
 * @jest-environment jsdom
 */

const {TextEncoder, TextDecoder} = require("util");
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// @ts-ignore
if (typeof fetch === "undefined") {
  // Pre 17.5 NodeJS environment.
  // @ts-ignore
  globalThis.fetch = require("node-fetch"); // tslint:disable-line
}

// @ts-ignore
crypto.subtle = require("crypto").webcrypto.subtle;

for (const nodeModule of [
  "assert",
  "async_hooks",
  "buffer",
  "child_process",
  "cluster",
  "console",
  "constants",
  "crypto",
  "dgram",
  "dns",
  "domain",
  "events",
  "fs",
  "http",
  "http2",
  "https",
  "inspector",
  "module",
  "net",
  "os",
  "path",
  "perf_hooks",
  "process",
  "punycode",
  "querystring",
  "readline",
  "repl",
  "stream",
  "string_decoder",
  "timers",
  "tls",
  "trace_events",
  "tty",
  "url",
  "util",
  "v8",
  "vm",
  "worker_threads",
  "zlib"
]) {
  jest.mock(nodeModule, () => {
    throw new Error(`Cannot use node module '${nodeModule}' in browser`);
  });
}

import {
  createClient,
  createHttpClient,
  EdgeDBError
} from "../src/index.browser";

const brokenConnectOpts = JSON.parse(
  process.env._JEST_EDGEDB_CONNECT_CONFIG || ""
);

const connectOpts = {
  ...brokenConnectOpts,
  tlsCAFile: undefined,
  tlsSecurity: "insecure"
};

test("createClient fails", () => {
  expect(() => createClient()).toThrowError(EdgeDBError);
});

test("createHttpClient no options", async () => {
  const client = createHttpClient();

  await expect(client.ensureConnected()).rejects.toThrowError(
    /no connection options specified/
  );
});

test("basic queries", async () => {
  const client = createHttpClient(connectOpts);

  expect(
    await client.querySingle(`select 'Querying from the ' ++ <str>$env`, {
      env: "browser"
    })
  ).toEqual("Querying from the browser");
});
