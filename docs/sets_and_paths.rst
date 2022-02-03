.. _edgedb-js-sets-and-paths:


Sets and paths
==============

Creating sets
-------------

.. code-block:: typescript

  e.set(e.str("asdf"), e.str("qwer"));
  // {'asdf', 'qwer'}

EdgeQL semantics are enforced by TypeScript. Sets can't contain elements
with incompatible types, but implicit casting works as expected.

.. code-block:: typescript

  e.set(e.int16(1234), e.int64(1234)); // set of int64
  e.set(e.int64(1234), e.float32(12.34)); // set of float64
  e.set(e.str("asdf"), e.int32(12)); // TypeError

Empty sets
^^^^^^^^^^

To declare an empty set, pass a type as the first and only argument:

.. code-block:: typescript

  e.set(e.int64);
  // <std::int64>{}


Object types
^^^^^^^^^^^^

All object types in your schema are reflected into the query builder, properly
namespaced by module.

.. code-block:: typescript

  e.default.Hero;
  e.default.Villain;
  e.default.Movie;
  e.my_module.SomeType;

For convenience, all types in the ``default`` module are also available at the
top-level.

.. code-block:: typescript

  e.Hero;
  e.Villain;
  e.Movie;

Paths
^^^^^

As in EdgeQL, you can declare *path expressions*.

.. code-block:: typescript

  e.Hero.name;
  e.Movie.title;
  e.Movie.characters.name;

Type intersections
^^^^^^^^^^^^^^^^^^

Use the type intersection operator to narrow the type of the set. For
instance, to represent the chararacters in a movie that are of type ``Hero``:

.. code-block:: typescript

  e.Movie.characters.is(e.Hero);
  // Movie.characters[is Hero]


Backlinks
^^^^^^^^^

All possible backlinks are auto-generated and behave just like forward links.
However, because they contain special characters, you must use bracket syntax
instead of simple dot notation.

.. code-block:: typescript

  e.Hero["<nemesis[is default::Villain]"];
  // Hero.<nemesis[is default::Villain];

  e.Hero['<characters[is default::Movie]'];
  // Hero.<characters[is default::Movie];

  e.Villain['<characters[is default::Movie]'];
  // Villain.<characters[is default::Movie];

For convenience, these backlinks automatically combine the backlink operator
and type intersection into a single key. However, the query builder also
provides "naked" backlinks; these can be refined with the ``.is`` type
intersection method.

.. code-block:: typescript

  e.Hero['<nemesis'].is(e.Villain);
  // Hero.<nemesis[is Villain]
