import {Cardinality, typeutil} from "../../src/reflection";
import {
  mergeCardinalities,
  mergeCardinalitiesTuple,
  pointerCardinality,
} from "../../src/reflection/util/cardinalityUtil";

test("pointerCardinality", () => {
  const _f0: typeutil.assertEqual<
    pointerCardinality<Cardinality.One, Cardinality.One>,
    Cardinality.One
  > = true;
  const _f2: typeutil.assertEqual<
    pointerCardinality<Cardinality.AtLeastOne, Cardinality.Many>,
    Cardinality.Many
  > = true;
  const _f3: typeutil.assertEqual<
    pointerCardinality<Cardinality.AtLeastOne, Cardinality.AtLeastOne>,
    Cardinality.AtLeastOne
  > = true;
  const _f4: typeutil.assertEqual<
    pointerCardinality<Cardinality.AtMostOne, Cardinality.AtMostOne>,
    Cardinality.AtMostOne
  > = true;
  const _f5: typeutil.assertEqual<
    pointerCardinality<Cardinality.Empty, Cardinality.Many>,
    Cardinality.Empty
  > = true;
});

test("mergeCardinality", () => {
  const _f0: typeutil.assertEqual<
    mergeCardinalities<Cardinality.AtMostOne, Cardinality.One>,
    Cardinality.AtLeastOne
  > = true;

  const _f1: typeutil.assertEqual<
    mergeCardinalities<Cardinality.AtMostOne, Cardinality.AtMostOne>,
    Cardinality.Many
  > = true;

  const _f2: typeutil.assertEqual<
    mergeCardinalities<Cardinality.One, Cardinality.One>,
    Cardinality.AtLeastOne
  > = true;

  const _f3: typeutil.assertEqual<
    mergeCardinalities<Cardinality.Empty, Cardinality.AtLeastOne>,
    Cardinality.AtLeastOne
  > = true;

  const _f4: typeutil.assertEqual<
    mergeCardinalities<Cardinality.One, Cardinality.Many>,
    Cardinality.AtLeastOne
  > = true;

  const _f5: typeutil.assertEqual<
    mergeCardinalitiesTuple<
      [Cardinality.One, Cardinality.Empty, Cardinality.AtMostOne]
    >,
    Cardinality.AtLeastOne
  > = true;
});
