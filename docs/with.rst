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

  e.select(e.op(a, '+', b)).toEdgeQL();
  // WITH
  //   a := {1, 2, 3},
  //   b := a
  // SELECT a + b

This hold for expressions of arbitrary complexity.

.. code-block:: typescript

  const robert = e.insert(e.Person, {
    name: "Robert Pattinson"
  });
  const colin = e.insert(e.Person, {
    name: "Colin Farrell"
  });
  const newMovie = e.insert(e.Movie, {
    title: "The Batman",
    actors: e.set(colin, robert)
  });

  /*
  with
    robert := (insert Person {  name := "Robert Pattinson"}),
    colin := (insert Person {  name := "Colin Farrell"}),
  insert Movie {
    title := "The Batman",
    actors := {robert, colin}
  }
  */



To embed ``WITH`` statements inside queries, you can short-circuit this logic
with a "dependency list". It's an error to pass an expr to multiple
``e.with``\ s, and an error to use an expr passed to ``e.with`` outside of that
WITH block in the query.


.. code-block:: typescript

  const robert = e.insert(e.Person, {
    name: "Robert Pattinson"
  });
  const colin = e.insert(e.Person, {
    name: "Colin Farrell"
  });
  const newMovie = e.insert(e.Movie, {
    actors: e.with([robert, colin], // list "dependencies";
      e.set(robert, colin)
    )
  })

  /*
  insert Movie {
    title := "The Batman",
    actors := (
      with
        robert := (insert Person {  name := "Robert Pattinson"}),
        colin := (insert Person {  name := "Colin Farrell"})
      select {robert, colin}
    )
  }
  */



