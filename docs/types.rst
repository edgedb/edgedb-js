.. _edgedb-js-types-and-casting:


Types
-----

The entire type system of EdgeDB is reflected in the ``e`` object, including
scalar types, object types, and enums. These types are used in queries for thinks like *casting* and *declaring parameters*.

.. code-block:: typescript

  e.str;
  e.bool;
  e.int16;
  e.int32;
  e.int64;
  e.float32;
  e.float64;
  e.bigint;
  e.decimal;
  e.datetime;
  e.duration;
  e.bytes;
  e.json;
  e.cal.local_datetime;
  e.cal.local_date;
  e.cal.local_time;
  e.cal.relative_duration;

  e.Movie;    // user-defined object type
  e.Genre;    // user-defined enum

You can construct array and tuple types, as in EdgeQL.

.. code-block:: typescript

  e.array(e.bool);
  // array<bool>

  e.tuple([e.str, e.int64]);
  // tuple<str, int64>

  e.tuple({
    name: e.str,
    age: e.int64
  });
  // tuple<name: str, age: int64>


.. _ref_qb_casting:

Casting
^^^^^^^

These types can be used to *cast* one expression to another type.

.. code-block:: typescript

  e.cast(e.json, e.int64('123'));
  // <json>'123'

  e.cast(e.duration, e.str('127 hours'));
  // <duration>'127 hours'

.. note::

  Scalar types like ``e.str`` serve a dual purpose. They can be used as
  functions to instantiate literals (``e.str("hi")``) or used as variables
  (``e.cast(e.str, e.int64(123))``).

Custom literals
^^^^^^^^^^^^^^^

You can use ``e.literal`` to create literals corresponding to collection
types like tuples, arrays, and primitives. The first argument expects a type,
the second expects a *value* of that type.

.. code-block:: typescript

  e.literal(e.str, "sup");
  // equivalent to: e.str("sup")

  e.literal(e.array(e.int16), [1, 2, 3]);
  // <array<int16>>[1, 2, 3]

  e.literal(e.tuple([e.str, e.int64]), ['baz', 9000]);
  // <tuple<str, int64>>("Goku", 9000)

  e.literal(
    e.tuple({name: e.str, power_level: e.int64}),
    {name: 'Goku', power_level: 9000}
  );
  // <tuple<name: str, power_level: bool>>("asdf", false)

Parameters
^^^^^^^^^^

Types are also necessary for declaring *query parameters*.

Pass strongly-typed parameters into your query with ``e.params``.

.. code-block:: typescript

  const query = e.params({name: e.str}, params =>
    e.op(e.str("Yer a wizard, "), "++", params.name)
  );

  await query.run(client, {name: "Harry"});
  // => "Yer a wizard, Harry"


The full documentation on using parameters is :ref:`here
<edgedb-js-parameters>`.


Polymorphism
^^^^^^^^^^^^

Types are also used to write polymorphic queries. For full documentation on
this, see :ref:`Polymorphism <ref_qb_polymorphism>` in the ``e.select``
documentation.

.. code-block:: typescript

  e.select(e.Content, content => ({
    title: true,
    ...e.is(e.Movie, { runtime: true }),
    ...e.is(e.TVShow, { num_seasons: true }),
  }));


TypeScript types
----------------

The query builder also generates TypeScript ``interfaces`` representing your
current schema. These are generated as a convenience for use in your
server-side code. Since the query builder can infer the result type of your
queries, these are not necessary to actually construct queries.

.. code-block::

  import e, {Person, Movie} from "./dbschema/edgeql-js";

Given this SDL:

.. code-block:: sdl

  module default {

    scalar type Genre extending enum<Horror, Comedy, Drama>;

    type Person {
      required property name -> str;
    }

    abstract type Content {
      required property title -> str {constraint exclusive};
      property genre -> Genre;
      multi link actors -> Person {
        property character_name -> str;
      };
    }

    type Movie extending Content {
      property runtime -> duration;
    }

    type TVShow extending Content {
      property num_seasons -> int64;
    }
  }

The following interfaces will be generated:

.. code-block:: typescript

  interface BaseObject { id: string; }

  enum Genre {
    Horror = "Horror",
    Comedy = "Comedy",
    Drama = "Drama"
  }

  interface Person extends BaseObject {
    name: string;
    genre?: Genre | null;
  }

  interface Content extends BaseObject {
    title: string;
    actors: Person[];
  }

  interface Movie extends Content {
    runtime?: edgedb.Duration | null;
  }

  interface TVShow extends Content {
    num_seasons?: number | null;
  }
