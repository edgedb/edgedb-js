import * as edgedb from "edgedb";
import e from "../dbschema/edgeql-js";
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
  const query = e.params(
    {
      str: e.str,
      numArr: e.array(e.int64),
      optBool: e.optional(e.bool),
    },
    params =>
      e.select({
        str: params.str,
        nums: e.array_unpack(params.numArr),
        x: e.op("true", "if", params.optBool, "else", "false"),
      })
  );

  expect(query.toEdgeQL()).toEqual(`WITH
  __param__str := <std::str>$str,
  __param__numArr := <array<std::int64>>$numArr,
  __param__optBool := <OPTIONAL std::bool>$optBool
SELECT (SELECT {
  single str := __param__str,
  multi nums := std::array_unpack(__param__numArr),
  single x := ("true" IF __param__optBool ELSE "false")
})`);

  expect(() => e.select(query).toEdgeQL()).toThrow();

  type paramsType = Parameters<typeof query.run>[1];
  tc.assert<
    tc.IsExact<
      paramsType,
      {
        str: string;
        numArr: number[];
        optBool?: boolean | null;
      }
    >
  >(true);

  expect(
    // @ts-expect-error
    query.run(client)
  ).rejects.toThrowError();
});

test("complex params", async () => {
  const query = e.params(
    {
      str: e.str,
      numArr: e.array(e.int64),
      optBool: e.optional(e.bool),
      tuple: e.tuple([e.str, e.int32, e.array(e.bool)]),
      namedTuple: e.tuple({a: e.float64, b: e.array(e.bigint), c: e.str}),
      jsonTuple: e.tuple([e.json]),
      people: e.array(
        e.tuple({name: e.str, age: e.int64, tags: e.array(e.str)})
      ),
    },
    params =>
      e.select({
        str: params.str,
        nums: e.array_unpack(params.numArr),
        x: e.op("true", "if", params.optBool, "else", "false"),
        tuple: params.tuple,
        tupleArrSlice: params.tuple[2].slice(1, null),
        namedTuple: params.namedTuple,
        namedTupleA: params.namedTuple.a,
        jsonTuple: params.jsonTuple,
        people: params.people,
      })
  );

  type paramsType = Parameters<typeof query.run>[1];
  tc.assert<
    tc.IsExact<
      paramsType,
      {
        str: string;
        numArr: number[];
        optBool?: boolean | null;
        tuple: [string, number, boolean[]];
        namedTuple: {a: number; b: bigint[]; c: string};
        jsonTuple: [string];
        people: {name: string; age: number; tags: string[]}[];
      }
    >
  >(true);

  const result = await query.run(client, {
    str: "test string",
    numArr: [1, 2, 3],
    tuple: ["str", 123, [true, false]],
    namedTuple: {a: 123, b: [BigInt(4), BigInt(5)], c: "str"},
    jsonTuple: [`{"a": 123, "b": ["c", "d"]}`],
    people: [
      {name: "person a", age: 23, tags: ["a", "b"]},
      {name: "person b", age: 45, tags: ["b", "c"]},
    ],
  });

  expect({
    ...result,
    nums: [...result.nums],
    tuple: [...result.tuple],
    namedTuple: {
      a: result.namedTuple.a,
      b: result.namedTuple.b,
      c: result.namedTuple.c,
    },
    jsonTuple: [...result.jsonTuple],
    people: result.people.map(p => ({
      name: p.name,
      age: p.age,
      tags: [...p.tags],
    })),
  }).toEqual({
    id: (result as any).id,
    str: "test string",
    nums: [1, 2, 3],
    x: null,
    tuple: ["str", 123, [true, false]],
    tupleArrSlice: [false],
    namedTuple: {a: 123, b: [BigInt(4), BigInt(5)], c: "str"},
    namedTupleA: 123,
    jsonTuple: [`{"a": 123, "b": ["c", "d"]}`],
    people: [
      {name: "person a", age: 23, tags: ["a", "b"]},
      {name: "person b", age: 45, tags: ["b", "c"]},
    ],
  });
});

// test("non castable scalars", async () => {
//   e.params(
//     {
//       // @ts-expect-error
//       num: e.int64,
//       // @ts-expect-error
//       tuple: e.tuple([e.int64]),
//     },
//     p => e.select({num: p.num, tuple: p.num})
//   );
// });

test("all param types", async () => {
  const params = {
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
    date_duration: e.cal.date_duration,
    memory: e.cfg.memory,
  };

  const query = e.params(params, p => e.select(p));

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
    date_duration: new edgedb.DateDuration(1, 2, 3, 4),
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
        bigint: bigint;
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
        date_duration: edgedb.DateDuration;
        memory: edgedb.ConfigMemory;
      }
    >
  >(true);

  const complexQuery = e.params(
    {
      tuple: e.tuple(params),
    },
    p => e.select(p)
  );

  const complexResult = await complexQuery.run(client, {
    tuple: args,
  });

  expect(Object.values(complexResult.tuple as any)).toEqual(
    Object.values(args)
  );
});
