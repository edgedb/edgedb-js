/**
 * @jest-environment jsdom
 */

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
  "zlib",
]) {
  jest.mock(nodeModule, () => {
    throw new Error(`Cannot use node module '${nodeModule}' in browser`);
  });
}

import {_CodecsRegistry} from "../src/index.browser";

test("create codec registry", () => {
  const registry = new _CodecsRegistry();

  expect(registry instanceof _CodecsRegistry).toBe(true);
});
