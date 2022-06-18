import type * as edgedb from "edgedb";
import {$} from "edgedb";
import * as tc from "conditional-type-checks";

import e, {$infer} from "../dbschema/edgeql-js";

import {setupTests, teardownTests, TestData} from "./setupTeardown";
import {version_lt} from "./group.test";

let client: edgedb.Client;
let data: TestData;

beforeAll(async () => {
  const setup = await setupTests();
  ({client, data} = setup);
});

afterAll(async () => {
  await teardownTests(client);
});

test("globals", async () => {
  if (await version_lt(2)) return;
  expect(e.select(e.global.uuid_global).toEdgeQL()).toEqual(
    `SELECT (GLOBAL default::uuid_global)`
  );

  // TODO: add additional tests using .withGlobals once it lands
  const str_required = await e.select(e.global.str_required).run(client);
  expect(str_required).toEqual(`hi mom`);
  const str_required_multi = await e
    .select(e.global.str_required_multi)
    .run(client);
  expect(str_required_multi).toEqual(["hi", "mom"]);

  expect(e.global.arr_global.__element__.__name__).toEqual(`array<std::str>`);
  expect(e.global.arr_global.__cardinality__).toEqual($.Cardinality.AtMostOne);
  expect(e.global.named_tuple_global.__element__.__name__).toEqual(
    `tuple<name: std::str, age: std::int64>`
  );
  expect(e.global.named_tuple_global.__cardinality__).toEqual(
    $.Cardinality.AtMostOne
  );
  expect(e.global.num_global.__element__.__name__).toEqual(`std::int64`);
  expect(e.global.num_global.__cardinality__).toEqual($.Cardinality.AtMostOne);
  expect(e.global.seq_global.__element__.__name__).toEqual(
    `default::global_seq`
  );
  expect(e.global.seq_global.__cardinality__).toEqual($.Cardinality.AtMostOne);
  expect(e.global.str_global.__element__.__name__).toEqual(`std::str`);
  expect(e.global.str_global.__cardinality__).toEqual($.Cardinality.AtMostOne);
  expect(e.global.str_global_with_default.__element__.__name__).toEqual(
    `std::str`
  );
  expect(e.global.str_global_with_default.__cardinality__).toEqual(
    $.Cardinality.One
  );
  expect(e.global.str_multi.__element__.__name__).toEqual(
    `default::str_multi`
  );
  expect(e.global.str_multi.__cardinality__).toEqual($.Cardinality.AtLeastOne);
  expect(e.global.str_required.__element__.__name__).toEqual(`std::str`);
  expect(e.global.str_required.__cardinality__).toEqual($.Cardinality.One);
  expect(e.global.str_required_multi.__element__.__name__).toEqual(
    `default::str_required_multi`
  );
  expect(e.global.str_required_multi.__cardinality__).toEqual(
    $.Cardinality.AtLeastOne
  );
  expect(e.global.tuple_global.__element__.__name__).toEqual(
    `tuple<std::str, std::int64>`
  );
  expect(e.global.tuple_global.__cardinality__).toEqual(
    $.Cardinality.AtMostOne
  );
  expect(e.global.uuid_global.__element__.__name__).toEqual(`std::uuid`);
  expect(e.global.uuid_global.__cardinality__).toEqual(
    $.Cardinality.AtMostOne
  );
  expect(e.extra.global.user_id.__element__.__name__).toEqual(`std::uuid`);
  expect(e.extra.global.user_id.__cardinality__).toEqual(
    $.Cardinality.AtMostOne
  );
});
