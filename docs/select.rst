.. _edgedb-js-select:

Select
------

The full power of the EdgeQL ``select`` statement is available as a top-level ``e.select`` function. All queries on this page assume the Netflix schema described on the :ref:`Objects page <edgedb-js-objects>`.

Selecting scalars
^^^^^^^^^^^^^^^^^

Any scalar expression be passed into ``e.select``, though it's often unnecessary, since expressions are ``run``able without being wrapped by ``e.select``.

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
    heroes: e.Movie,
  });
  /* select {
    name := "Name",
    number := 1234,
    heroes := Movie
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
should return an object that specifies which properties to include in the result. This corresponds to a *shape* in EdgeQL.

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

Note that the type of the query result is properly inferred from the shape. This is true for all queries on this page.

.. code-block:: typescript

  const result = await query.run(client);
  /* {
    id: string;
    title: string;
    runtime?: Duration | undefined;
  }[] */

As you can see, the type of ``runtime`` is ``Duration | undefined`` since it's
an optional property, whereas ``id`` and ``title`` are required.

A value of ``true`` indicates that the property should be included in the
selection set. By contrast, a value of false explicitly exludes it.

.. code-block:: typescript

  e.select(e.Movie, movie => ({
    id: true,
    title: false
  }));

  const result = await query.run(client);
  // {id: string; title: never}[]

You can also pass a non-literal ``boolean`` expression, in which case the field
will be made optional in the result.

As in EdgeQL, shapes can be nested to fetch deeply related objects.

.. code-block:: typescript

  const query = e.select(e.Hero, ()=>({
    id: false,
    name: Math.random() > 0.5
  }));

  const result = await query.run(client);
  /* {
    id: never;
    name: string | undefined;
  }[] */


Why closures?
^^^^^^^^^^^^^

In EdgeQL, a ``select`` statement introduces a new *scope*; within the clauses
of a select statement, you can refer to fields of the *elements being
selected* using leading dot notation.

.. code-block:: edgeql

  select Hero { id, name }
  filter .name = "Groot";

Here, ``.name`` is shorthand for the ``name`` property of the selected
``Hero`` elements. All properties/links on the ``Hero`` type can be referenced
using this shorthand anywhere in the ``select`` expression. In other words,
the ``select`` expression is *scoped* to the ``Hero`` type.

To represent this scoping in the query builder, we use functions. This is a
powerful pattern that makes it painless to represent filters, ordering,
computed fields, and other expressions. Let's see it in action.


Filtering
^^^^^^^^^

To add a filtering clause, just include a ``filter`` key in the returned
params object. This should correspond to a boolean expression.

.. code-block:: typescript

  e.select(e.Movie, movie => ({
    id: true,
    title: true,
    filter: e.op(movie.name, 'ilike', "The Matrix%")
  }));
  /*
    select Movie {
      id,
      title
    } filter .name ilike "The Matrix%"
  */

Since ``filter`` is a reserved keyword in EdgeQL, there is minimal danger of
conflicting with a property or link named ``filter``. All shapes can contain filter clauses, even nested ones.

### Nested filtering

.. code-block:: typescript

  e.select(e.Hero, hero => ({
    name: true,
    villains: villain => ({
      name: true
      filter: e.like(villain.name, "Mr. %"),
    }),
    filter: e.op(hero.name, '=', e.str("Iron Man")),
  }));


Ordering
^^^^^^^^

As with ``filter``, you can pass a value with the special ``order_by`` key. This
key can correspond to an arbitrary expression. To simply order by a property:

.. code-block:: typescript

  e.select(e.Hero, hero => ({
    order_by: hero.name,
  }));

To customize the ordering and empty-handling parameters, you can also pass an
object into ``order_by``:

.. code-block:: typescript

  e.select(e.Hero, hero => ({
    order_by: {
      expression: hero.name,
      direction: e.DESC,
      empty: e.EMPTY_FIRST,
    },
  }));


Or do compound ordering with an array of objects:

.. code-block:: typescript

  e.select(e.Hero, hero => ({
    name: true,
    order_by: [
      {
        expression: hero.name,
        direction: e.DESC,
        empty: e.EMPTY_FIRST,
      },
      {
        expression: hero.secret_identity,
        direction: e.ASC,
        empty: e.EMPTY_LAST,
      },
    ],
  }));


Pagination
^^^^^^^^^^

Use ``offset`` and ``limit`` to paginate queries. Both should correspond to
``int64`` expressions.

.. code-block:: typescript

  e.select(e.Hero, hero => ({
    offset: e.len(hero.name),
    limit: e.int16(15),
  }));


For simplicity, both also support ``number`` literals.

.. code-block:: typescript

  e.select(e.Hero, hero => ({
    offset: 20,
    limit: 10
  }));

As in EdgeQL, passing ``limit: 1`` guarantees that the query will only return
a single item (at most). This is reflected in the resulting type.

.. code-block:: typescript

  e.select(e.Hero, hero => ({
    name: true,
  }));
  // {name: string}[]

  e.select(e.Hero, hero => ({
    name: true,
    limit: 1
  }));
  // {name: string} | null

Computeds
^^^^^^^^^

To add a computed field, just add it to the returned shape alongside the other
elements. All reflected functions are typesafe, so the output type

.. code-block:: typescript

  const query = e.select(e.Hero, hero => ({
    name: true,
    uppercase_name: e.str_upper(hero.name),
    name_len: e.len(hero.name),
  }));

  const result = await query.run(client);
  /* =>
    [
      {
        name:"Iron Man",
        uppercase_name: "IRON MAN",
        name_len: 8
      },
      ...
    ]
  */
  // {name: string; uppercase_name: string, name_len: number}[]


Computables can "override" an actual link/property as long as the type
signatures agree.

.. code-block:: typescript

  e.select(e.Hero, hero => ({
    name: e.str_upper(hero.name), // this works
    secret_identity: e.int64(5), // TypeError

    // you can override links too!
    villains: e.select(e.Villain, _ => ({ name: true })),
  }));


Polymorphism
^^^^^^^^^^^^

EdgeQL supports polymorphic queries using the ``[IS type]`` prefix.

.. code-block:: edgeql

  select Person {
    name,
    [IS Hero].secret_identity,
    [IS Villain].nemesis: { name }
  }

In the query builder, this is represented with the ``e.is`` function.

.. code-block:: typescript

  e.select(e.Person, person => ({
    name: true,
    ...e.is(e.Hero, { secret_identity: true }),
    ...e.is(e.Villain, { nemesis: {name: true}}),
  }));

  const result = await query.run(client);
  /* {
    id: string;
    secret_identity: string | null;
    nemesis: {
        name: string;
    } | null;
  }[] */

The type signature of the result reflects the fact that polymorphic fields
like ``secret_identity`` will only occur in certain objects.

Type intersection
^^^^^^^^^^^^^^^^^

.. code-block:: typescript

  e.select(e.Movie, movie => ({
    characters: movie.characters.is(e.Hero),
  }));
  // select Movie { characters[is Hero]: { id }}


To specify shape, use subqueries:

.. code-block:: typescript

  e.select(e.Movie, movie => ({
    id: true,
    characters: e.select(movie.characters.is(e.default.Hero), hero => ({
      id: true,
      secret_identity: true,
    })),
  }));

Detach
^^^^^^

.. code-block:: typescript

  const detachedVillain = e.detached(e.Villain);
  const villain = e.select(e.Hero, outer => ({
    name: true,
    shared_nemesis: e.select(detachedVillain, inner => ({
      filter: e.op(outer.nemesis, '=', inner.nemesis)
    }))
  }));
