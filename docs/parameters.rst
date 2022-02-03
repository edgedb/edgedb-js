.. _edgedb-js-parameters:

Parameters
----------

.. code-block:: typescript

  const query = e.withParams({ name: e.str }, params => e.select(params.name));
  /*
    with name := <str>$name
    select name;
  */


.. code-block:: typescript

  const fetchPerson = e.params(
    {
      // scalar parameters
      bool: e.bool,
      data: e.array(e.str),

      // supports any type
      nested: e.array(e.tuple({test: e.str})),

      // optional params
      optional: e.optional(e.str),
    },
    params =>
      e.select(e.Person, person => ({
        id: true,
        maybe: params.optional, // computable
        filter: e.in(person.name, e.array_unpack(params.name)),
      }))
  );

  await fetchPerson.run(client, {
    bool: true,
    data: ['aaa','bbb', 'ccc,],
    nested: [{test:"sup"}],
    optional: null
  })
