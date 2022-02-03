.. _edgedb-js-update:

Update
------

Update queries are a represented as a ``.update()`` method on ``e.select``
queries. This way, you ``select`` a set of objects to update first, then
specify how they should be updated.

.. code-block:: typescript

  // update method
  e.update(e.Movie, movie => ({
    filter: e.op(movie.title, '=', e.str("Avengers 4")),
    // order_by: ...,
    // offset: ...,
    set: {

      // reference current value
      title: e.str_upper(movie.title),

      // support literals
      title: "Avengers: Endgame",

      // set link
      characters: e.union(e.Hero, e.Villain),

      // add to link
      characters: {"+=": e.insert(e.Hero, {name: "Gilgamesh"})},

      // subtract from link
      characters: {
        "-=": e.select(e.Villain, villain => ({
          filter: e.eq(villain.name, e.str("Thanos")),
        })),
      },
    }
  }))
