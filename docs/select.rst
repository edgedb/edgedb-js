.. _edgedb-js-select:

Select
------

The full power of the EdgeQL ``select`` statement is available as a top-level
``e.select`` function. All queries on this page assume the Netflix schema
described on the :ref:`Objects page <edgedb-js-objects>`.

Selecting scalars
^^^^^^^^^^^^^^^^^

Any scalar expression be passed into ``e.select``, though it's often
unnecessary, since expressions are ``run``\ able without being wrapped by
``e.select``.

.. code-block:: typescript

  e.select(e.str('Hello world'));
  // select 1234;

  e.select(a.op(e.int64(2), '+', e.int64(2)));
  // select 2 + 2;

Selecting free objects
^^^^^^^^^^^^^^^^^^^^^^

Select a free object by passing an object into ``e.select``

.. code-block:: typescript

  e.select({
    name: e.str("Name"),
    number: e.int64(1234),
    movies: e.Movie,
  });
  /* select {
    name := "Name",
    number := 1234,
    movies := Movie
  } */

Selecting objects
^^^^^^^^^^^^^^^^^

As in EdgeQL, selecting an set of objects without a shape will return their
``id`` property only. This is reflected in the TypeScript type of the result.

.. code-block:: typescript

  const query = e.select(e.Movie);
  // select Movie;

  const result = await query.run(client);
  // {id:string}[]

Shapes
^^^^^^

To specify a shape, pass a function as the second argument. This function
should return an object that specifies which properties to include in the
result. This roughly corresponds to a *shape* in EdgeQL.

.. code-block:: typescript

  const query = e.select(e.Movie, ()=>({
    id: true,
    title: true,
    runtime: true,
  }));
  /*
    select Movie {
      id,
      title,
      runtime
    }
  */

Note that the type of the query result is properly inferred from the shape.
This is true for all queries on this page.

.. code-block:: typescript

  const result = await query.run(client);
  /* {
    id: string;
    title: string;
    runtime: Duration | undefined;
  }[] */

As you can see, the type of ``runtime`` is ``Duration | undefined`` since it's
an optional property, whereas ``id`` and ``title`` are required.


Passing a ``boolean`` value (as opposed to a ``true`` literal), which will
make the property optional. Passing ``false`` will exclude that property.

.. code-block:: typescript

  e.select(e.Movie, movie => ({
    id: true,
    title: Math.random() > 0.5,
    runtime: false,
  }));

  const result = await query.run(client);
  // {id: string; title: string | undefined; runtime: never}[]

Nesting shapes

As in EdgeQL, shapes can be nested to fetch deeply related objects.

.. code-block:: typescript

  const query = e.select(e.Movie, () => ({
    id: true,
    title: true,
    cast: {
      name: true
    }
  }));

  const result = await query.run(client);
  /* {
    id: string;
    title: string;
    cast: { name: string }[]
  }[] */


Why closures?
^^^^^^^^^^^^^

In EdgeQL, a ``select`` statement introduces a new *scope*; within the clauses
of a select statement, you can refer to fields of the *elements being
selected* using leading dot notation.

.. code-block:: edgeql

  select Movie { id, title }
  filter .title = "The Avengers";

Here, ``.title`` is shorthand for the ``title`` property of the selected
``Movie`` elements. All properties/links on the ``Movie`` type can be
referenced using this shorthand anywhere in the ``select`` expression. In
other words, the ``select`` expression is *scoped* to the ``Movie`` type.

To represent this scoping in the query builder, we use function scoping. This
is a powerful pattern that makes it painless to represent filters, ordering,
computed fields, and other expressions. Let's see it in action.


Filtering
^^^^^^^^^

To add a filtering clause, just include a ``filter`` key in the returned
params object. This should correspond to a boolean expression.

.. code-block:: typescript

  e.select(e.Movie, movie => ({
    id: true,
    title: true,
    filter: e.op(movie.title, 'ilike', "The Matrix%")
  }));
  /*
    select Movie {
      id,
      title
    } filter .title ilike "The Matrix%"
  */

Since ``filter`` is a reserved keyword in EdgeQL, there is minimal danger of
conflicting with a property or link named ``filter``. All shapes can contain
filter clauses, even nested ones.

### Nested filtering

.. code-block:: typescript

  e.select(e.Movie, movie => ({
    title: true,
    cast: actor => ({
      name: true,
      filter: e.op(actor.name.slice(0, 1), '=', 'A'),
    }),
    filter: e.op(movie.title, '=', 'Iron Man'),
  }));


Ordering
^^^^^^^^

As with ``filter``, you can pass a value with the special ``order_by`` key. To
simply order by a property:

.. code-block:: typescript

  e.select(e.Movie, movie => ({
    order_by: movie.title,
  }));

The ``order`` key can correspond to an arbitrary expression.

.. code-block:: typescript

  // order by length of title
  e.select(e.Movie, movie => ({
    order_by: e.len(movie.title),
  }));
  /*
    select Movie
    order by len(.title)
  */

  // order by number of cast members
  e.select(e.Movie, movie => ({
    order_by: e.count(movie.cast),
  }));
  /*
    select Movie
    order by count(.cast)
  */

You can customize the sort direction and empty-handling behavior by passing an
object into ``order_by``.

.. code-block:: typescript

  e.select(e.Movie, movie => ({
    order_by: {
      expression: movie.title,
      direction: e.DESC,
      empty: e.EMPTY_FIRST,
    },
  }));
  /*
    select Movie
    order by .title desc empty first
  */

.. list-table::

  * - Order direction
    - ``e.DESC`` ``e.ASC``
  * - Empty handling
    - ``e.EMPTY_FIRST`` ``e.EMPTY_LAST``

Pass an array of objects to do multiple ordering.

.. code-block:: typescript

  e.select(e.Movie, movie => ({
    title: true,
    order_by: [
      {
        expression: movie.title,
        direction: e.DESC,
      },
      {
        expression: e.count(movie.cast),
        direction: e.ASC,
        empty: e.EMPTY_LAST,
      },
    ],
  }));


Pagination
^^^^^^^^^^

Use ``offset`` and ``limit`` to paginate queries. You can pass an expression
with an integer type or a plain JS number.

.. code-block:: typescript

  e.select(e.Movie, movie => ({
    offset: 50,
    limit: e.int64(10),
  }));
  /*
    select Movie
    offset 50
    limit 10
  */

Computeds
^^^^^^^^^

To add a computed field, just add it to the returned shape alongside the other
elements. All reflected functions are typesafe, so the output type

.. code-block:: typescript

  const query = e.select(e.Movie, movie => ({
    title: true,
    uppercase_title: e.str_upper(movie.title),
    title_length: e.len(movie.title),
  }));

  const result = await query.run(client);
  /* =>
    [
      {
        title:"Iron Man",
        uppercase_title: "IRON MAN",
        title_length: 8
      },
      ...
    ]
  */
  // {name: string; uppercase_title: string, title_length: number}[]


Computables can "override" an actual link/property as long as the type
signatures agree.

.. code-block:: typescript

  e.select(e.Movie, movie => ({
    title: e.str_upper(movie.title), // this works
    runtime: e.int64(55), // TypeError

    // you can override links too
    cast: e.Person,
  }));


Polymorphism
^^^^^^^^^^^^

EdgeQL supports polymorphic queries using the ``[is type]`` prefix.

.. code-block:: edgeql

  select Content {
    title,
    [is Movie].runtime,
    [is TVShow].num_episodes
  }

In the query builder, this is represented with the ``e.is`` function.

.. code-block:: typescript

  e.select(e.Content, content => ({
    title: true,
    ...e.is(e.Movie, { runtime: true }),
    ...e.is(e.TVShow, { num_episodes: true }),
  }));

  const result = await query.run(client);
  /* {
    title: string;
    runtime: Duration | null;
    num_episodes: number | null;
  }[] */

The ``runtime`` and ``num_episodes`` properties are nullable to reflect the
fact that they will only occur in certain objects.


Detached
^^^^^^^^

.. code-block:: typescript

  const query = e.select(e.Person, (outer) => ({
    name: true,
    castmates: e.select(detachedPerson, (inner) => ({
      name: true,
      filter: e.op(
        e.op(outer.acted_in, 'in', inner.acted_in),
        'and',
        e.op(outer, '!=', inner) // don't include self
      ),
    })),
  }));
