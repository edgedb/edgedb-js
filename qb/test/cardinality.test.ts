import {Cardinality, typeutil} from "../../src/reflection";
import {cardinalityUtil} from "../../src/reflection/util/cardinalityUtil";

test("multiplyCardinality", () => {
  const _f0: typeutil.assertEqual<
    cardinalityUtil.multiplyCardinalities<Cardinality.One, Cardinality.One>,
    Cardinality.One
  > = true;
  const _f2: typeutil.assertEqual<
    cardinalityUtil.multiplyCardinalities<
      Cardinality.AtLeastOne,
      Cardinality.Many
    >,
    Cardinality.Many
  > = true;
  const _f3: typeutil.assertEqual<
    cardinalityUtil.multiplyCardinalities<
      Cardinality.AtLeastOne,
      Cardinality.AtLeastOne
    >,
    Cardinality.AtLeastOne
  > = true;
  const _f4: typeutil.assertEqual<
    cardinalityUtil.multiplyCardinalities<
      Cardinality.AtMostOne,
      Cardinality.AtMostOne
    >,
    Cardinality.AtMostOne
  > = true;
  const _f5: typeutil.assertEqual<
    cardinalityUtil.multiplyCardinalities<Cardinality.Empty, Cardinality.Many>,
    Cardinality.Empty
  > = true;
});

test("mergeCardinality", () => {
  const _f0: typeutil.assertEqual<
    cardinalityUtil.mergeCardinalities<Cardinality.AtMostOne, Cardinality.One>,
    Cardinality.AtLeastOne
  > = true;

  const _f1: typeutil.assertEqual<
    cardinalityUtil.mergeCardinalities<
      Cardinality.AtMostOne,
      Cardinality.AtMostOne
    >,
    Cardinality.Many
  > = true;

  const _f2: typeutil.assertEqual<
    cardinalityUtil.mergeCardinalities<Cardinality.One, Cardinality.One>,
    Cardinality.AtLeastOne
  > = true;

  const _f3: typeutil.assertEqual<
    cardinalityUtil.mergeCardinalities<
      Cardinality.Empty,
      Cardinality.AtLeastOne
    >,
    Cardinality.AtLeastOne
  > = true;

  const _f4: typeutil.assertEqual<
    cardinalityUtil.mergeCardinalities<Cardinality.One, Cardinality.Many>,
    Cardinality.AtLeastOne
  > = true;

  const _f5: typeutil.assertEqual<
    cardinalityUtil.mergeCardinalitiesVariadic<
      [Cardinality.One, Cardinality.Empty, Cardinality.AtMostOne]
    >,
    Cardinality.AtLeastOne
  > = true;
});
