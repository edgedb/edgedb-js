.. _edgedb-js-select:

Sets
====

Declare sets with ``e.set``.

.. code-block:: typescript

  e.set(e.str("asdf"), e.str("qwer"));
  // {'asdf', 'qwer'}

As in EdgeQL, sets can't contain elements with incompatible types. These semantics are enforced by TypeScript.

.. code-block:: typescript

  e.set(e.int64(1234), e.str(1234));
  // TypeError

Empty sets
^^^^^^^^^^

To declare an empty set, cast an empty set to the desired type. As in EdgeQL, empty sets are not allowed without a cast.

.. code-block:: typescript

  e.cast(e.int64, e.set());
  // <std::int64>{}
