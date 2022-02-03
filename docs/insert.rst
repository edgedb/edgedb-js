.. _edgedb-js-insert:

Insert
------

.. code-block:: typescript

  e.insert(e.Movie, {
    title: "Spider-Man 2",
    characters: e.select(e.Person, person => ({
      filter: e.in(person.name, e.set("Spider-Man", "Doc Ock")),
    })),
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
    title: "Spider-Man: Homecoming",
  }).unlessConflict();


To specify an ``on`` clause:

.. code-block:: typescript

  e.insert(e.Movie, {
    title: "Spider-Man 2",
  }).unlessConflict(movie => ({
    on: movie.title, // can be any expression
  }));


To specify an ``on...else`` clause:

.. code-block:: typescript

  e.insert(e.Movie, {
    title: "Spider-Man 2",
  }).unlessConflict(movie => ({
    on: movie.title,
    else: e.select(movie).update({
      title: "Spider-Man 2",
    }),
  }));

