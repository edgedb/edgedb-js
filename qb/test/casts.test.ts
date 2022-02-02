import e from "../dbschema/edgeql";
import {$number} from "../dbschema/edgeql/modules/std";
import {tc} from "./setupTeardown";

test("casting", () => {
  const primitiveCast = e.cast(e.float32, e.float64(3.14));
  tc.assert<
    tc.IsExact<typeof primitiveCast["__element__"], typeof e["float64"]>
  >(true);
  expect(primitiveCast.toEdgeQL()).toEqual(`<std::float32>3.14`);
});
