.. _edgedb-js-update:

Update
------

Update objects with the ``e.update`` function.

.. code-block:: typescript

  e.update(e.Movie, movie => ({
    filter_single: {title: "Avengers 4"},
    set: {
      title: "Avengers: Endgame"
    }
  }))


The parameter object supports the full set of clauses for filtering, ordering,
and pagination.

.. code-block:: typescript

  e.update(e.Movie, movie => ({
    filter: ...,
    filter_single: ...,
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
    actors := Person,

    # add to link
    actors += Person,

    # subtract from link
    actors -= Person
  }

In the query builder this is represented with the following syntax.

**Overwrite a link**

.. code-block:: typescript

  const actors = e.select(e.Person, ...);
  e.update(e.Movie, movie => ({
    filter_single: {title: 'The Eternals'},
    set: {
      actors: actors,
    }
  }))

**Add to a link**

.. code-block:: typescript

  const actors = e.select(e.Person, ...);
  e.update(e.Movie, movie => ({
    filter_single: {title: 'The Eternals'},
    set: {
      actors: { "+=": actors },
    }
  }))


**Subtract from a link**

.. code-block:: typescript

  const actors = e.select(e.Person, ...);
  e.update(e.Movie, movie => ({
    filter_single: {title: 'The Eternals'},
    set: {
      actors: { "-=": actors },
    }
  }))

Bulk updates
^^^^^^^^^^^^

Just like with inserts, you can run bulk updates using a ``for`` loop. Pass in
your data, iterate over it, and build an ``update`` query for each item.

In this example, we use ``name`` to filter for the character to be updated
since ``name`` has an exclusive constraint in the schema (meaning a given name
will correspond to, at most, a single object). That filtering is done using the
``filter_single`` property of the object returned from your ``update``
callback. Then the ``last_appeared`` value is updated by including it in the
nested ``set`` object.

.. code-block:: typescript

    const query = e.params(
      {
        characters: e.array(
          e.tuple({
            name: e.str,
            last_appeared: e.int64,
          })
        ),
      },
      (params) => {
        return e.for(e.array_unpack(params.characters), (character) => {
          return e.update(e.Character, () => ({
            filter_single: { name: character.name },
            set: {
              last_appeared: character.last_appeared,
            },
          }));
        });
      }
    );

    await query.run(client, {
      characters: [
        { name: "Iron Man", last_appeared: 2019 },
        { name: "Captain America", last_appeared: 2019 },
        { name: "The Hulk", last_appeared: 2021 },
      ],
    });
