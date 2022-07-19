.. _edgedb-js-for:


For Loops
---------

For loops let you iterate over any set of values. The

.. code-block:: typescript

  const query = e.for(e.set(1, 2, 3, 4), (number) => {
    return e.op(2, '^', number);
  });
  const result = query.run(client);
  // [2, 4, 8, 16]

Bulk inserts
^^^^^^^^^^^^

It's common to  use for loops to perform bulk inserts. The raw data is passed
in as a ``json`` parameter, converted to a set of ``json`` objects with
``json_array_unpack``, then passed into a ``for`` loop for insertion.

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
    items: [
      {title: 'Deadpool', release_year: 2016},
      {title: 'Deadpool 2', release_year: 2018},
      {title: 'Deadpool 3', release_year: null},
    ],
  });

Note that any optional properties values must be explicitly set to ``null``.
They cannot be set to ``undefined`` or ommitted; doing so will cause a runtime
error.
