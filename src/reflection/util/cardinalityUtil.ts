// Cardinality  Empty  AtMostOne  One         Many  AtLeastOne
// Empty        0      0          0           0     0
// AtMostOne    0      AtMostOne  AtMostOne   Many  Many
// One          0      AtMostOne  One         Many  AtLeastOne
// Many         0      Many       Many        Many  Many
// AtLeastOne   0      Many       AtLeastOne  Many  AtLeastOne

import {Cardinality} from "../typesystem";

export type mergeCardinalities<
  C1 extends Cardinality,
  C2 extends Cardinality
> = C1 extends Cardinality.Empty
  ? Cardinality.Empty
  : C1 extends Cardinality.One
  ? C2
  : C1 extends Cardinality.AtMostOne
  ? C2 extends Cardinality.One
    ? Cardinality.AtMostOne
    : C2 extends Cardinality.AtLeastOne
    ? Cardinality.Many
    : C2
  : C1 extends Cardinality.Many
  ? C2 extends Cardinality.Empty
    ? Cardinality.Empty
    : Cardinality.Many
  : C1 extends Cardinality.AtLeastOne
  ? C2 extends Cardinality.AtMostOne
    ? Cardinality.Many
    : C2 extends Cardinality.One
    ? Cardinality.AtLeastOne
    : C2
  : never;

export function mergeCardinalities(
  c1: Cardinality,
  c2: Cardinality
): Cardinality {
  if (c1 === Cardinality.Empty) return Cardinality.Empty;

  if (c1 === Cardinality.One) return c2;
  if (c1 === Cardinality.AtMostOne) {
    if (c2 === Cardinality.One) return Cardinality.AtMostOne;
    if (c2 === Cardinality.AtLeastOne) return Cardinality.Many;
    return c2;
  }
  if (c1 === Cardinality.Many) {
    if (c2 === Cardinality.Empty) return Cardinality.Empty;
    return Cardinality.Many;
  }
  if (c1 === Cardinality.AtLeastOne) {
    if (c2 === Cardinality.AtMostOne) return Cardinality.Many;
    if (c2 === Cardinality.One) return Cardinality.AtLeastOne;
    return c2;
  }
  throw new Error(`Invalid Cardinality ${c1}`);
}
