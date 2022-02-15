.. _edgedb-js-update:

Update
------

Update objects with the ``e.update`` function.

.. code-block:: typescript

  e.update(e.Movie, movie => ({
    filter: e.op(movie.title, '=', e.str("Avengers 4")),
    set: {
      title: "Avengers: Endgame"
    }
  }))


The parameter object supports the full set of clauses for filtering, ordering,
and pagination.

.. code-block:: typescript

  e.update(e.Movie, movie => ({
    filter: ...,
    order_by: ...,
    offset: ...,
    limit: ...,
    set: {
      // ...
    }
  }))


You can reference the current value of the object's properties.

.. code-block:: typescript

  e.update(e.Movie, movie => ({
    filter: e.op(movie.title[0], '=', ' '),
    set: {
      title: e.str_trim(movie.title)
    }
  }))


Updating links
^^^^^^^^^^^^^^

EdgeQL supports some convenient syntax for appending to, subtracting from, and
overwriting links.

.. code-block:: edgeql

  update Movie set {
    # overwrite
    cast := Person,

    # add to link
    cast += Person,

    # subtract from link
    cast -= Person
  }

In the query builder this is represented with the following syntax.

**Overwrite a link**

.. code-block:: typescript

  const actors = e.select(e.Person, ...);
  e.update(e.Movie, movie => ({
    filter: e.op(movie.title, '=', 'The Eternals'),
    set: {
      actors: actors,
    }
  }))

**Add to a link**

.. code-block:: typescript

  const actors = e.select(e.Person, ...);
  e.update(e.Movie, movie => ({
    filter: e.op(movie.title, '=', 'The Eternals'),
    set: {
      actors: { "+=": actors },
    }
  }))


**Subtract from a link**

.. code-block:: typescript

  const actors = e.select(e.Person, ...);
  e.update(e.Movie, movie => ({
    filter: e.op(movie.title, '=', 'The Eternals'),
    set: {
      actors: { "-=": actors },
    }
  }))


