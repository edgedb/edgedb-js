.. _edgedb-js-types-and-casting:

Types and casting
-----------------

The literal functions (e.g. ``e.str``, ``e.int64``, etc.) serve a dual
purpose. They can be used as functions to instantiate literals
(``e.str("hi")``) or can be used as variables to represent the *type itself*
(``e.str``).

Constructing types
^^^^^^^^^^^^^^^^^^

The literal constructor (e.g. ``e.str``, ``e.int64``, etc.) serve a dual
purpose. They can be used as functions to instantiate literals
(``e.str("hi")``) or can be used to represent the *type itself* (``e.str``).

.. code-block:: typescript

  e.str;                      // str
  e.int64;                    // int64
  e.array(e.bool);            // array<bool>
  e.tuple([e.str, e.int64]);  // tuple<str, int64>
  e.tuple({             // tuple<name: str, age: int64>
    name: e.str,
    age: e.int64
  });

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



.. _ref_qb_casting:

Casting
^^^^^^^

These types can be used to *cast* an expression to another type.

.. code-block:: typescript

  e.cast(e.json, e.array(e.str("Hello"), e.str("world!")));
  // <json>["Hello", "world!"]
