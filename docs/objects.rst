.. _edgedb-js-objects:


Objects and paths
=================

All queries on this page assume the following schema.

.. code-block:: sdl

  module default {
    type Person {
      required property name -> str;
    }

    abstract type Media {
      required property title -> str {constraint exclusive};
      multi link actors -> Person {
        property character_name -> str;
      };
    }

    type Movie extending Media {
      property runtime -> duration;
    }

    type Show extending Media {
      property number_of_seasons -> int64;
    }
  }

Object types
^^^^^^^^^^^^

All object types in your schema are reflected into the query builder, properly
namespaced by module.

.. code-block:: typescript

  e.default.Person;
  e.default.Movie;
  e.default.Show;
  e.my_module.SomeType;

For convenience, the contents of the ``default`` module are also available at
the top-level of ``e``.

.. code-block:: typescript

  e.Person;
  e.Movie;
  e.Show;

.. As in EdgeQL, type names like ``Movie`` serve two purposes.

.. - They can be used to represent the set of all Movie objects: ``select Movie``.
.. - They can be used to represent the Movie *type* in operations like type intersections: ``select Media[is Movie]``

Paths
^^^^^

EdgeQL-style *paths* are supported on object type references.

.. code-block:: typescript

  e.Person.name;              // Person.name
  e.Movie.title;              // Movie.title
  e.Show.actors.name;          // Movie.actors.name

Paths can be constructed from any object expression, not just the root types.

.. code-block:: typescript

  e.select(e.Person).name;
  // (select Person).name

  e.op(e.Movie, 'union', e.Show).actors;
  // (Movie union Show).actors

  const ironMan = e.insert(e.Movie, {
    title: "Iron Man"
  });
  ironMan.title;
  // (insert Movie { title := "Iron Man" }).title


Type intersections
^^^^^^^^^^^^^^^^^^

Use the type intersection operator to narrow the type of a set of objects. For
instance, to represent the elements of an Account's watchlist that are of type
``Show``:

.. code-block:: typescript

  e.Person.acted_in.is(e.Show);
  // Person.acted_in[is Show]


Backlinks
^^^^^^^^^

All possible backlinks are auto-generated and can be auto-completed by
TypeScript. They behave just like forward links. However, because they contain
special characters, you must use bracket syntax instead of simple dot notation.

.. code-block:: typescript

  e.Person["<director[is Movie]"]
  // Person.<director[is Movie]

For convenience, these backlinks automatically combine the backlink operator
and type intersection into a single key. However, the query builder also
provides "naked" backlinks; these can be refined with the ``.is`` type
intersection method.

.. code-block:: typescript

  e.Person['<director'].is(e.Movie);
  // Person.<director[is Movie]
