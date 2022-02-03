.. _edgedb-js-with:

With blocks
-----------

:edb-alt-title: With blocks

During the query rendering step, the number of occurrences of each expression
are tracked. All expressions that are referenced more than once and are not
explicitly defined in a ``WITH`` block (with ``e.with``), are extracted into
the nearest ``WITH`` block that encloses all usages of the expression.

.. code-block:: typescript

  const a = e.set(e.int64(1), e.int64(2), e.int64(3));
  const b = e.alias(a);

  e.select(e.plus(a, b)).toEdgeQL();
  // WITH
  //   a := {1, 2, 3},
  //   b := a
  // SELECT a + b

This hold for expressions of arbitrary complexity.

.. code-block:: typescript

  const newHero = e.insert(e.Hero, {
    name: "Batman",
  });

  const newVillain = e.insert(e.Villain, {
    name: "Dr. Evil",
    nemesis: newHero,
  });

  return e.select(newVillain, {
    id: true,
    name: true,
  });


To embed ``WITH`` statements inside queries, you can short-circuit this logic
with a "dependency list". It's an error to pass an expr to multiple
``e.with``s, and an error to use an expr passed to ``e.with`` outside of that
WITH block in the query.

We add a top level e.alias() function. This will create an alias of the expr
passed to it in a WITH block.

.. code-block:: typescript

  return e.select(
    e.with(
      [newHero, newVillain], // list "dependencies";
      e.select(newVillain, {
        id: true,
        name: true,
      })
    )
  );

