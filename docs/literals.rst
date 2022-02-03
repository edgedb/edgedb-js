.. _edgedb-js-literals:


.. Modules
.. -------

.. All *types*, *functions*, and *commands* are available on the ``e`` object, properly namespaced by module.

.. .. code-block:: typescript

..   // commands
..   e.select;
..   e.insert;
..   e.update;
..   e.delete;

..   // types
..   e.std.str;
..   e.std.int64;
..   e.std.bool;
..   e.cal.local_datetime;
..   e.default.User; // user-defined object type
..   e.my_module.Foo; // object type in user-defined module

..   // functions
..   e.std.len;
..   e.std.str_upper;
..   e.math.floor;
..   e.sys.get_version;

.. For convenience, the contents of the ``std`` and ``default`` modules are also exposed at the top-level of ``e``.

.. .. code-block:: typescript

..   e.str;
..   e.int64;
..   e.bool;
..   e.len;
..   e.str_upper;
..   e.User;

.. .. note::

..   If there are any name conflicts (e.g. a user-defined module called ``len``),
..   ``e.len`` will point to the user-defined module; in that scenario, you must
..   explicitly use ``e.std.len`` to access the built-in ``len`` function.

Literals
--------

Primitives
^^^^^^^^^^

Primitive literals are created using constructor functions that correspond to EdgeDB datatypes.

.. list-table::

  * - **Query builder**
    - **EdgeQL equivalent**
  * - ``e.str("asdf")``
    - ``"asdf"``
  * - ``e.int64(123)``
    - ``1234``
  * - ``e.float64(123.456)``
    - ``123.456``
  * - ``e.bool(true)``
    - ``true``
  * - ``e.bigint(12345n)``
    - ``12345n``
  * - ``e.decimal("1234.1234n")``
    - ``1234.1234n``
  * - ``e.uuid("599236a4...")``
    - ``<uuid>"599236a4..."``

Enums
^^^^^

.. code-block:: typescript

  e.Colors('green');
  e.sys.VersionStage('beta');

Dates and times
^^^^^^^^^^^^^^^

To create an instance of ``datetime``, pass a JavaScript ``Date`` object into ``e.datetime``:

.. code-block::

  e.datetime(new Date());


EdgeDB's other temporal datatypes don't have equivalents in the JavaScript type system: ``duration``, ``cal::local_date``, ``cal::local_time``, and ``cal::local_datetime``.

.. There are a couple way to declare literals for these types.

.. **Casting strings**

.. As in EdgeQL, you can cast string values.

.. .. code-block::

..   e.cast(e.duration, e.str('5 minutes'));
..   // <std::duration>'5 minutes'

..   e.cast(e.cal.local_datetime, e.str('1999-03-31T15:17:00'));
..   // <cal::local_datetime>'1999-03-31T15:17:00'

..   e.cast(e.cal.local_date, e.str('1999-03-31'));
..   // <cal::local_date>'1999-03-31'

..   e.cast(e.cal.local_time, e.str('15:17:00'));
..   // <cal::local_time>'15:17:00'

.. **Using the built-in classes**

Each of these datatypes can be represented with an instance of a corresponding class, as defined in ``edgedb`` NPM package. These classes are used in the results of queries that return these types. They are documented on the :ref:`Driver <edgedb-js-datatypes>` page.

.. list-table::

  * - ``e.duration``
    - :js:class:`Duration`
  * - ``e.cal.local_date``
    - :js:class:`LocalDate`
  * - ``e.cal.local_time``
    - :js:class:`LocalTime`
  * - ``e.cal.local_datetime``
    - :js:class:`LocalDateTime`

The code below demonstrates how to declare each kind of temporal literal, along with the equivalent EdgeQL.

.. code-block:: typescript

  import * as edgedb from "edgedb";

  const myDuration = new edgedb.Duration(0, 0, 0, 0, 1, 2, 3);
  e.duration(myDuration);

  const myLocalDate = new edgedb.LocalDate(1776, 07, 04);
  e.cal.local_date(myLocalDate);

  const myLocalTime = new edgedb.LocalTime(13, 15, 0);
  e.cal.local_time(myLocalTime);

  const myLocalDateTime = new edgedb.LocalDateTime(1776, 07, 04, 13, 15, 0);
  e.cal.local_datetime(myLocalDateTime);


JSON
^^^^

JSON literals are created with the ``e.json`` function. You can pass in any data structure of EdgeDB-encodable data, including all primitive JS data types, arrays, objects, and instances of classes like ``edgedb.Duration``, etc.

.. code-block:: typescript

  const data = e.json({
    name: "Billie",
    numbers: [1,2,3],
    nested: { foo: "bar"},
    duration: new edgedb.Duration(1, 3, 3)
  })

JSON expressions support indexing. Indexing returns another JSON expression.

.. code-block:: typescript

  const myJSON = e.json({ numbers: [0,1,2] });
  // to_json('{"numbers":[0,1,2]}')

  myJSON.numbers[0];
  // to_json('{"numbers":[0,1,2]}')['numbers'][0]

Keep in mind that JSON expressions are represented as strings when returned from a query.

.. code-block:: typescript

  await e.json({
    name: "Billie",
    numbers: [1,2,3]
  }).run(client)
  // => '{"name": "Billie", "numbers": [1, 2, 3]}';

Arrays
^^^^^^

Declare array expressions with ``e.array``.

.. code-block:: typescript

  e.array([e.str(1), e.str(2), e.str(3)]);
  // [1, 2, 3]

.. code-block:: typescript

  e.array([e.str(1), e.str(2), e.str(3)]);
  // [1, 2, 3]

EdgeQL semantics are enforced by TypeScript, so arrays can't contain elements
with incompatible types.

.. code-block:: typescript

  e.array([e.int64(5), e.str("foo")]);
  // TypeError!


For convenience, ``e.array`` can also accept arrays of plain JavaScript values.

.. code-block:: typescript

  e.array([1, 2, 3]);
  // [1, 2, 3]

  e.array([1, 2, e.int64(3)]); // intermixing expressions and plain values
  // [1, 2, 3]

Array expressions support indexing.

.. code-block::

  const myArray = e.array(['a', 'b', 'c']);
  // ['a', 'b', 'c']

  myArray[0];
  // ['a', 'b', 'c'][0]

Tuples
^^^^^^

Declare tuples with ``e.tuple``.

.. code-block:: typescript

  const spidey = e.tuple([e.str("Peter Parker"), e.int64(18)]);
  // ("Peter Parker", 18)


As with arrays, the tuple constructor also supports plain JavaScript data and indexing.

.. code-block:: typescript

  const spidey = e.tuple([e.str("Peter Parker"), e.int64(18)]);
  // ("Peter Parker", 18)

  spidey[0];
  // ("Peter Parker", 18)[0]

Named tuples
^^^^^^^^^^^^

Declare a named tuple.

.. code-block:: typescript

  const myTuple = e.tuple({
    name: e.str("Peter Parker"),
    age: e.int64(18),
  });
  // (name := "Peter Parker", age := 18)

  // supports plain data
  const myTuple = e.tuple({
    name: "Peter Parker",
    age: 18,
  });
  // (name := "Peter Parker", age := 18)

  // supports indexing
  spidey.name;
  // (name := "Peter Parker", age := 18).name
