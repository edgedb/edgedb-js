import * as e from "../generated/example";
import {reflection as $} from "edgedb";
import {Cardinality, TypeKind, typeutil} from "../../src/reflection";

test("casting", () => {
  const primitiveCast = e.cast(e.$Float32, e.float64(3.14));
  const _f1: typeutil.assertEqual<
    typeof primitiveCast["__element__"],
    e.$Float32
  > = true;
  expect(primitiveCast.toEdgeQL()).toEqual(`<std::float32><std::float64>3.14`);
});
