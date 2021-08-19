import {typeutil} from "../../src/reflection";
import e from "../generated/example";

test("simple params", () => {
  const query = e.withParams(
    {
      str: e.str,
      numArr: e.array(e.int64),
      optBool: e.optional(e.bool),
      bool: e.bool,
    },
    (params) =>
      e.select({
        str: params.str,
        nums: e.array_unpack(params.numArr),
        optBool: params.optBool,
        x: e.if_else(e.str("true"), params.bool, e.str("false")),
      })
  );

  expect(query.toEdgeQL()).toEqual(`SELECT {
  str := (<std::str>$str),
  nums := (std::array_unpack((<array<std::int64>>$numArr))),
  x := (("true" IF <OPTIONAL std::bool>$optBool ELSE "false"))
}`);

  expect(() => e.select(query).toEdgeQL()).toThrow();

  type paramsType = typeof query["__paramststype__"];
  const f1: typeutil.assertEqual<
    paramsType,
    {
      str: string;
      numArr: number[];
      optBool: boolean | undefined;
      bool: boolean;
    }
  > = true;
});
