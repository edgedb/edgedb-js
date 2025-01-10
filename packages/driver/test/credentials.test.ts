import { test, expect } from "./config.ts";
import {
  readCredentialsFile,
  validateCredentials,
} from "../src/credentials.ts";
import { serverUtils } from "../src/conUtils.server.ts";

// Define tests
test("readCredentialsFile", async () => {
  const data = await readCredentialsFile("test/credentials1.json", serverUtils);
  expect(data).toEqual({
    database: "test3n",
    password: "lZTBy1RVCfOpBAOwSCwIyBIR",
    port: 10702,
    user: "test3n",
  });
});

test("emptyCredentials", () => {
  expect(() => validateCredentials({})).toThrow("`user` key is required");
});

test("port validation", () => {
  expect(() => validateCredentials({ user: "u1", port: "abc" })).toThrow(
    "invalid `port` value",
  );
  expect(() => validateCredentials({ user: "u1", port: 0 })).toThrow(
    "invalid `port` value",
  );
  expect(() => validateCredentials({ user: "u1", port: 0.5 })).toThrow(
    "invalid `port` value",
  );
  expect(() => validateCredentials({ user: "u1", port: -1 })).toThrow(
    "invalid `port` value",
  );
  expect(() => validateCredentials({ user: "u1", port: 65536 })).toThrow(
    "invalid `port` value",
  );
});
