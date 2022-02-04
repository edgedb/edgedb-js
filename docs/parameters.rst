.. _edgedb-js-parameters:

Parameters
----------

You can pass strongly-typed parameters into your query with ``e.params``.

.. code-block:: typescript

  const helloQuery = e.params({ title: e.str }, params =>
    e.op(params.name)
  );
  /*  with name := <str>$name
      select name;
  */


The first argument is an object defining the parameter names and their corresponding types. The second argument is a closure that returns an expression; use the ``params`` argument to construct the rest of your query.

Passing parameter data
^^^^^^^^^^^^^^^^^^^^^^

To executing a query with parameters, pass the parameter data as the second argument to ``.run()``; this argument is *fully typed*!

.. code-block:: typescript

  await helloQuery.run(client, { name: "Harry Styles" })
  // => "Yer a wizard, Harry Styles"

  await query.run(client, { name: 16 })
  // => TypeError: number is not assignable to string

Top-level usage
^^^^^^^^^^^^^^^

Note that the expression being ``run`` must be the one declared with ``e.params``; in other words, you can only use ``e.params`` at the *top level* of your query, not as an expression inside a larger query.

.. code-block:: typescript

  const wrappedQuery = e.select(helloQuery);

  await e.select(helloQuery).run(client, {name: "Harry Styles"});
  // TypeError


Parameter types
^^^^^^^^^^^^^^^
In EdgeQL, parameters can only be primitives or arrays of primitives. That's not true with the query builder! Parameter types can be arbitrarily complex. Under the hood, the query builder serializes the parameters to JSON and deserializes them on the server.

.. code-block:: typescript

  const complexParams = e.params(
    {
      title: e.str,
      runtime: e.duration,
      cast: e.array(
        e.tuple({
          name: e.str,
          character_name: e.str,
        })
      ),
    },
    params => e.insert(e.Movie, {
      // ...
    })
  );

  await insertMovie.run(client, {
    title: "Dune",
    runtime: new edgedb.Duration(0, 0, 0, 0, 2, 35),
    cast: [
      {name: "Timmy", character_name: "Paul"},
      {name: "JMo", character_name: "Idaho"},
    ]
  })

