.. _edgedb-js-types-and-casting:


Types and casting
-----------------

The functions (e.g. ``e.str``, ``e.int64``, etc.) serve a dual
purpose. They can be used as functions to instantiate literals
(``e.str("hi")``). They are also used to represent the *type itself*
for certain operations such as casting.


.. _ref_qb_casting:

Casting
^^^^^^^

These types can be used to *cast* an expression to another type.

.. code-block:: typescript

  e.cast(e.json, e.int64('123'));
  // '123'

  e.cast(e.duration, e.str('127 hours'));
  // <duration>'127 hours'


Reflected types
^^^^^^^^^^^^^^^

The entire type system of EdgeDB is reflected in the ``e`` object, including scalar types, object types, and enums.

.. code-block:: typescript

  e.str;
  e.bool;
  e.int16;
  e.int32;
  e.int64;
  e.float32;
  e.float64;
  e.bigin;
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


Constructed types
^^^^^^^^^^^^^^^^^

These basic types can be combined into new array and tuple types.

.. code-block::

  e.array(e.bool);
  // array<bool>

  e.tuple([e.str, e.int64]);
  // tuple<str, int64>

  e.tuple({
    name: e.str,
    age: e.int64
  });
  // tuple<name: str, age: int64>

All types—primitives, object types, arrays, tuples, etc—can be used for casting and other *type operations*.

Custom literals
^^^^^^^^^^^^^^^

You can use ``e.literal`` to create literals corresponding to collection
types like tuples, arrays, and primitives. The first argument expects a type, the second expects a *value* of that type.

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
  // <tuple<str, bool>>("asdf", false)
