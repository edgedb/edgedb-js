.. _edgedb-js-select:

Select
------

The full power of the ``select`` statement is available as an overloaded,
top-level ``e.select`` function.

Scalars
^^^^^^^

.. code-block:: typescript

  e.select(e.int64(1234));
  // select 1234;

  e.select(a.add(e.int64(2), e.int64(2)));
  // select 2 + 2;

  e.select(e.concat('aaaa', e.to_str(e.int64(111)));
  // select 'aaaa' ++ to_str(111)

Free shapes
^^^^^^^^^^^

.. code-block:: typescript

  e.select({
    name: e.str("Name"),
    number: e.int64(1234),
    heroes: e.Hero,
  });
  /* select {
    name := "Name",
    number := 1234,
    heroes := Hero
  } */

Shapes
^^^^^^

As in EdgeQL, selecting an set of objects without a shape will return their
IDs only.

.. code-block:: typescript

  const query = e.select(e.Hero); // select Hero;
  const result = await query.run(client); // {id:string}[]


To specify a shape, pass a function as the second argument. This function
should return an object, which is analagous to an EdgeQL shape.

.. code-block:: typescript

  const query = e.select(e.Hero, ()=>({
    id: true,
    name: true,
    secret_identity: true,
  }));

  const result = await query.run(client);
  /* {
    id: string;
    name: string;
    secret_identity: string | undefined;
  }[] */

As you can see, the type of ``secret_identity`` is ``string | undefined`` in
the output, as it's an optional property, whereas ``id`` and ``name`` are
required.

A value of ``true`` indicates that the property should be included in the
selection set. By contrast, a value of false explicitly exludes it. You
can also pass a non-literal ``boolean`` expression, in which case the field
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

  e.select(e.Hero, hero => ({
    id: true,
    name: true,
    filter: e.or(e.ilike(hero.name, "%Man"), e.ilike(hero.name, "The %")))
  }))

Since ``filter`` is a reserved keyword in EdgeQL, there is minimal danger of
conflicting with a property or link named ``filter``. Since the ``filter`` key
is special, it isn't possible to include a computed property named
``filter`` at the moment.

All shapes can contain filter clauses, even nested ones.

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

.. code-block::

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

  // select Movie { characters[is Hero]: { id }}
  e.select(e.Movie, movie => ({
    characters: movie.characters.is(e.Hero),
  }));


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
