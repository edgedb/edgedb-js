import e from "../dbschema/edgeql-js";

test("simple for loop", () => {
  expect(e.for(e.set(1, 2, 3), x => e.op(e.op(x, "*", 2), "+", x)).toEdgeQL())
    .toEqual(`FOR __forVar__0 IN {{ 1, 2, 3 }}
UNION (
  ((__forVar__0 * 2) + __forVar__0)
)`);
});
