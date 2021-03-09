import {expect} from "https://deno.land/x/expect/mod.ts";

import {
  readCredentialsFile,
  validateCredentials,
} from "../../edgedb-deno/_src/credentials.ts";

const test = Deno.test;

test("readCredentialsFile", () => {
  let data = readCredentialsFile("test/credentials1.json");
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

test("port", () => {
  expect(() => validateCredentials({user: "u1", port: "abc"})).toThrow(
    "invalid `port` value"
  );
  expect(() => validateCredentials({user: "u1", port: 0})).toThrow(
    "invalid `port` value"
  );
  expect(() => validateCredentials({user: "u1", port: 0.5})).toThrow(
    "invalid `port` value"
  );
  expect(() => validateCredentials({user: "u1", port: -1})).toThrow(
    "invalid `port` value"
  );
  expect(() => validateCredentials({user: "u1", port: 65536})).toThrow(
    "invalid `port` value"
  );
});
