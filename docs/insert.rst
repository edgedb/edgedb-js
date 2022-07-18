.. _edgedb-js-insert:

Insert
------

Insert new data with ``e.insert``.

.. code-block:: typescript

  e.insert(e.Movie, {
    title: e.str("Spider-Man: No Way Home"),
    release_year: e.int64(2021)
  });

For convenience, the second argument ``e.insert`` function can also accept
plain JS data.

.. code-block:: typescript

  e.insert(e.Movie, {
    title: "Spider-Man: No Way Home",
    actors: e.select(e.Person, person => ({
      filter: e.op(person.name, "=", "Robert Downey Jr."),
      '@character_name': e.str("Iron Man")
    }))
  });


Link properties
^^^^^^^^^^^^^^^

As in EdgeQL, link properties are inserted inside the shape of a subquery.

.. code-block:: typescript

  const query = e.insert(e.Movie, {
    title: "Iron Man",
    actors: e.select(e.Person, person => ({
      filter: e.op(person.name, '=', "Robert Downey Jr."),
      "@character_name": e.str("Tony Stark")

      // link props must correspond to expressions
      "@character_name": "Tony Stark"  // invalid
    ))
  });


.. note::

  For technical reasons, link properties must correspond to query
  builder expressions, not plain JS data.

Similarly you can directly include link properties inside nested ``e.insert``
queries:

.. code-block:: typescript

  const query = e.insert(e.Movie, {
    title: "Iron Man",
    release_year: 2008,
    actors: e.insert(e.Person, {
      name: "Robert Downey Jr.",
      "@character_name": e.str("Tony Start")
    }),
  });

Handling conflicts
^^^^^^^^^^^^^^^^^^

In EdgeQL, "upsert" functionality is achieved by handling **conflicts** on
``insert`` statements with the ``unless conflict`` clause. In the query
builder, this is possible with the ``.unlessConflict`` method (available only
on ``insert`` expressions).

In the simplest case, adding ``.unlessConflict`` (no arguments) will prevent
EdgeDB from throwing an error if the insertion would violate an exclusivity
contstraint. Instead, the query would return the pre-existing object.

.. code-block:: typescript

  e.insert(e.Movie, {
    title: "Spider-Man: No Way Home",
    release_year: 2021
  }).unlessConflict();


To specify an ``on`` clause:

.. code-block:: typescript

  e.insert(e.Movie, {
    title: "Spider-Man: No Way Home",
    release_year: 2021
  }).unlessConflict(movie => ({
    on: movie.title, // can be any expression
  }));


To specify an ``on...else`` clause:

.. code-block:: typescript

  e.insert(e.Movie, {
    title: "Spider-Man: Homecoming",
    release_year: 2021
  }).unlessConflict(movie => ({
    on: movie.title,
    else: e.update(movie, () => ({
      set: {
        release_year: 2021
      }
    })),
  }));


Bulk inserts
^^^^^^^^^^^^

It's common to  use for loops to perform bulk inserts. The raw data is passed in as a JSON parameter, converted to a set of ``json`` objects, then mapped into

.. code-block:: typescript

  const query = e.params({items: e.json}, (params) => {
    return e.for(e.json_array_unpack(params.items), (item) => {
      return e.insert(e.Movie, {
        title: e.cast(e.str, item.title),
        release_year: e.cast(e.int64, item.release_year),
      });
    });
  });

  const result = await query.run(client, {
    items: JSON.stringify([
      {title: 'Deadpool', release_year: 2016},
      {title: 'Deadpool 2', release_year: 2018},
      {title: 'Deadpool 3', release_year: null},
    ]),
  });
