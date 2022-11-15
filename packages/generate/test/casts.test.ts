import e from "../dbschema/edgeql-js";
import {setupTests, tc, TestData, teardownTests} from "./setupTeardown";
import type {Client} from "edgedb";
let client: Client;
let data: TestData;

beforeAll(async () => {
  const setup = await setupTests();
  ({client, data} = setup);
});

afterAll(async () => {
  await teardownTests(client);
});

test("casting", () => {
  const primitiveCast = e.cast(e.float32, e.float64(3.14));
  tc.assert<
    tc.IsExact<typeof primitiveCast["__element__"], typeof e["float64"]>
  >(true);
  expect(primitiveCast.toEdgeQL()).toEqual(
    `<std::float32>(<std::float64>3.14)`
  );
});

test("enums", async () => {
  expect(e.cast(e.Genre, e.str("Horror")).toEdgeQL()).toEqual(
    `<default::Genre>("Horror")`
  );
  const result = await e.cast(e.Genre, e.str("Horror")).run(client);
  expect(result).toEqual("Horror");
});

test("scalar literals", () => {
  expect(e.cast(e.json, "hello").toEdgeQL()).toEqual(`<std::json>("hello")`);
});
