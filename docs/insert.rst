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

As in EdgeQL, link properties are inserted inside the shape of a subquery:

.. code-block:: typescript

  e.insert(e.Movie, {
    title: "Iron Man",
    release_year: 2021,
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

