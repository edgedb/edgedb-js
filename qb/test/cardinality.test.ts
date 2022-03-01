import type {$} from "edgedb";
import {tc} from "./setupTeardown";

test("multiply$.Cardinality", () => {
  tc.assert<
    tc.IsExact<
      $.cardinalityUtil.multiplyCardinalities<
        $.Cardinality.One,
        $.Cardinality.One
      >,
      $.Cardinality.One
    >
  >(true);
  tc.assert<
    tc.IsExact<
      $.cardinalityUtil.multiplyCardinalities<
        $.Cardinality.AtLeastOne,
        $.Cardinality.Many
      >,
      $.Cardinality.Many
    >
  >(true);
  tc.assert<
    tc.IsExact<
      $.cardinalityUtil.multiplyCardinalities<
        $.Cardinality.AtLeastOne,
        $.Cardinality.AtLeastOne
      >,
      $.Cardinality.AtLeastOne
    >
  >(true);
  tc.assert<
    tc.IsExact<
      $.cardinalityUtil.multiplyCardinalities<
        $.Cardinality.AtMostOne,
        $.Cardinality.AtMostOne
      >,
      $.Cardinality.AtMostOne
    >
  >(true);
  tc.assert<
    tc.IsExact<
      $.cardinalityUtil.multiplyCardinalities<
        $.Cardinality.Empty,
        $.Cardinality.Many
      >,
      $.Cardinality.Empty
    >
  >(true);
});

test("merge$.Cardinality", () => {
  tc.assert<
    tc.IsExact<
      $.cardinalityUtil.mergeCardinalities<
        $.Cardinality.AtMostOne,
        $.Cardinality.One
      >,
      $.Cardinality.AtLeastOne
    >
  >(true);

  tc.assert<
    tc.IsExact<
      $.cardinalityUtil.mergeCardinalities<
        $.Cardinality.AtMostOne,
        $.Cardinality.AtMostOne
      >,
      $.Cardinality.Many
    >
  >(true);

  tc.assert<
    tc.IsExact<
      $.cardinalityUtil.mergeCardinalities<
        $.Cardinality.One,
        $.Cardinality.One
      >,
      $.Cardinality.AtLeastOne
    >
  >(true);

  tc.assert<
    tc.IsExact<
      $.cardinalityUtil.mergeCardinalities<
        $.Cardinality.Empty,
        $.Cardinality.AtLeastOne
      >,
      $.Cardinality.AtLeastOne
    >
  >(true);

  tc.assert<
    tc.IsExact<
      $.cardinalityUtil.mergeCardinalities<
        $.Cardinality.One,
        $.Cardinality.Many
      >,
      $.Cardinality.AtLeastOne
    >
  >(true);

  tc.assert<
    tc.IsExact<
      $.cardinalityUtil.mergeCardinalitiesVariadic<
        [$.Cardinality.One, $.Cardinality.Empty, $.Cardinality.AtMostOne]
      >,
      $.Cardinality.AtLeastOne
    >
  >(true);
});
