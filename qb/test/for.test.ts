import e from "../dbschema/edgeql";

test("simple for loop", () => {
  expect(
    e
      .for(e.set(e.int64(1), e.int64(2), e.int64(3)), x =>
        e.plus(e.mult(x, e.int32(2)), x)
      )
      .toEdgeQL()
  ).toEqual(`FOR __forVar__0 IN {{ 1, 2, 3 }}
UNION (
  ((__forVar__0 * <std::int32>2) + __forVar__0)
)`);
});
