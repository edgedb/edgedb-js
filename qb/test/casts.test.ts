import e from "../generated/example";
import {typeutil} from "../../src/reflection";

test("casting", () => {
  const primitiveCast = e.cast(e.float32, e.float64(3.14));
  const _f1: typeutil.assertEqual<
    typeof primitiveCast["__element__"],
    typeof e.float32
  > = true;
  expect(primitiveCast.toEdgeQL()).toEqual(`<std::float32>3.14`);
});
