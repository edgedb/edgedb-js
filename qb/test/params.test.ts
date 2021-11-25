import * as edgedb from "edgedb";
import e from "../dbschema/edgeql";
import {setupTests, teardownTests, tc} from "./setupTeardown";

let client: edgedb.Client;

beforeAll(async () => {
  const setup = await setupTests();
  ({client} = setup);
});

afterAll(async () => {
  await teardownTests(client);
});

test("simple params", () => {
  const query = e.withParams(
    {
      str: e.str,
      numArr: e.array(e.int64),
      optBool: e.optional(e.bool),
    },
    params =>
      e.select({
        str: params.str,
        nums: e.array_unpack(params.numArr),
        x: e.if_else(e.str("true"), params.optBool, e.str("false")),
      })
  );

  expect(query.toEdgeQL()).toEqual(`SELECT {
  str := (<std::str>$str),
  nums := (std::array_unpack((<array<std::int64>>$numArr))),
  x := (("true" IF <OPTIONAL std::bool>$optBool ELSE "false"))
}`);

  expect(() => e.select(query).toEdgeQL()).toThrow();

  type paramsType = typeof query["__paramststype__"];
  tc.assert<
    tc.IsExact<
      paramsType,
      {
        str: string;
        numArr: number[];
        optBool: boolean | null;
      }
    >
  >(true);
});

test("all param types", async () => {
  const query = e.withParams(
    {
      int16: e.int16,
      int32: e.int32,
      int64: e.int64,
      float32: e.float32,
      float64: e.float64,
      bigint: e.bigint,
      // decimal not supported by edgedb-js
      bool: e.bool,
      json: e.json,
      str: e.str,
      bytes: e.bytes,
      uuid: e.uuid,
      datetime: e.datetime,
      duration: e.duration,
      local_date: e.cal.local_date,
      local_time: e.cal.local_time,
      local_datetime: e.cal.local_datetime,
      relative_duration: e.cal.relative_duration,
      memory: e.cfg.memory,
    },
    p =>
      e.select({
        int16: p.int16,
        int32: p.int32,
        int64: p.int64,
        float32: p.float32,
        float64: p.float64,
        bigint: p.bigint,
        bool: p.bool,
        json: p.json,
        str: p.str,
        bytes: p.bytes,
        uuid: p.uuid,
        local_date: p.local_date,
        local_time: p.local_time,
        local_datetime: p.local_datetime,
        datetime: p.datetime,
        duration: p.duration,
        relative_duration: p.relative_duration,
        memory: p.memory,
      })
  );

  const args = {
    int16: 1,
    int32: 2,
    int64: 3,
    float32: 4,
    float64: 5,
    bigint: BigInt(6),
    bool: true,
    json: '{"name": "test"}',
    str: "test str",
    bytes: Buffer.from("buffer"),
    uuid: "d476ccc23e7b11ecaf130f07004006ce",
    datetime: new Date(),
    duration: new edgedb.Duration(0, 0, 0, 0, 1),
    local_date: new edgedb.LocalDate(2021, 11, 25),
    local_time: new edgedb.LocalTime(12, 34),
    local_datetime: new edgedb.LocalDateTime(2021, 11, 25, 1, 2, 3),
    relative_duration: new edgedb.RelativeDuration(1, 2, 3),
    memory: new edgedb.ConfigMemory(BigInt(125952)),
  };

  const result = await query.run(client, args);

  expect(result).toEqual({
    // @ts-ignore
    id: result.id,
    ...args,
  });

  type IsEqual<A, B> = B extends A ? true : false;

  tc.assert<
    IsEqual<
      typeof result,
      {
        int16: number;
        int32: number;
        int64: number;
        float32: number;
        float64: number;
        bigint: BigInt;
        bool: boolean;
        json: string;
        str: string;
        bytes: Buffer;
        uuid: string;
        datetime: Date;
        duration: edgedb.Duration;
        local_date: edgedb.LocalDate;
        local_time: edgedb.LocalTime;
        local_datetime: edgedb.LocalDateTime;
        relative_duration: edgedb.RelativeDuration;
        memory: edgedb.ConfigMemory;
      }
    >
  >(true);
});
