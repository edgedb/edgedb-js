.. _edgedb-js-for:


For loops
---------

.. code-block:: typescript

  e.for(e.set("1", "2", "3"), number => {
    // do stuff
  });

  e.for(e.Movie, movie => {
    // do stuff
  });
