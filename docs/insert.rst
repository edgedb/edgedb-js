.. _edgedb-js-insert:

Insert
------

Insert new data with ``e.insert``:

.. cast: e.select(e.Person, person => ({
..   filter: e.op(person.name, 'in', e.set("Tom Holland", "Zendaya")),
.. })),

.. code-block:: typescript

  const runtime = new edgedb.Duration(0,0,0,0,2,28);
  e.insert(e.Movie, {
    title: e.str("Spider-Man: No Way Home"),
    runtime: e.duration(runtime),
  });

For convenience, the second argument ``e.insert`` function can also accept
plain JS data.

.. code-block:: typescript

  const runtime = new edgedb.Duration(0,0,0,0,2,28);
  e.insert(e.Movie, {
    title: "Spider-Man: No Way Home",
    runtime: runtime,
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

  const runtime = new edgedb.Duration(0,0,0,0,2,28);
  e.insert(e.Movie, {
    title: "Spider-Man: No Way Home",
    runtime: runtime
  }).unlessConflict();


To specify an ``on`` clause:

.. code-block:: typescript

  const runtime = new edgedb.Duration(0,0,0,0,2,28);
  e.insert(e.Movie, {
    title: "Spider-Man: No Way Home",
    runtime: runtime
  }).unlessConflict(movie => ({
    on: movie.title, // can be any expression
  }));


To specify an ``on...else`` clause:

.. code-block:: typescript

  const runtime = new edgedb.Duration(0,0,0,0,2,28);
  e.insert(e.Movie, {
    title: "Spider-Man: Homecoming",
    runtime: runtime
  }).unlessConflict(movie => ({
    on: movie.title,
    else: e.update(movie, () => ({
      set: {
        runtime: runtime
      }
    })),
  }));

