import e from "../dbschema/edgeql";
import {tc} from "./setupTeardown";

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
