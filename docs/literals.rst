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


Temporal literals
^^^^^^^^^^^^^^^^^

.. list-table::

  * - Temporal types
    - ``e.datetime`` ``duration`` ``cal::local_date`` ``cal::local_time``
      ``cal::local_datetime``

With the exception of ``datetime``, EdgeDB's temporal datatypes don't have equivalents in the JavaScript type system. There are a couple way to declare literal values As such, these constructors expect an instance of a corresponding class that can be imported from the ``edgedb`` NPM package. These classes are documented on the :ref:`Datatypes <edgedb-js-datatypes>` page.

.. list-table::

  * - ``e.datetime``
    - ``Date``
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

  const my_date = new Date();
  e.datetime(my_date);

  const myDuration = new edgedb.Duration(0, 0, 0, 0, 1, 2, 3);
  e.duration(myDuration);
  // <duration>'1 hours 2 minutes 3 seconds'

  const myLocalDate = new edgedb.LocalDate(1776, 07, 04);
  e.cal.local_date(myLocalDate);
  // <cal::local_date>'1776-07-04';

  const myLocalTime = new edgedb.LocalTime(13, 15, 0);
  e.cal.local_time(myLocalTime);
  // <cal::local_time>'13:15:00';

  const myLocalDateTime = new edgedb.LocalDateTime(1776, 07, 04, 13, 15, 0);
  e.cal.local_datetime(myLocalDateTime);
  // <cal::local_datetime>'1776-07-04T13:15:00';

Enums
^^^^^

.. code-block:: typescript

  e.Colors('green');
  e.sys.VersionStage('beta');

JSON
^^^^

JSON literals are created with the ``e.json`` function. Similar to

* - ``e.json({asdf: 1234})``
    - ``<json>(asdf := 1234)``

Arrays
^^^^^^

.. code-block:: typescript

  e.array([e.str(1), e.str(2), e.str(3)]);
  // [1, 2, 3]


EdgeQL semantics are enforced by TypeScript, so arrays can't contain elements
with incompatible types.

.. code-block:: typescript

  e.array([e.int64(5), e.str("foo")]);
  // TypeError!



Tuples
^^^^^^

Declare a tuple.

.. code-block:: typescript

  e.tuple([e.str("Peter Parker"), e.int64(18), e.bool(true)]);
  // ("Peter Parker", 18, true)

Declare a named tuple.

.. code-block:: typescript

  e.tuple({
    name: e.str("Peter Parker"),
    age: e.int64(18),
    is_spiderman: e.bool(true)
  });
  // (name := "Peter Parker", age := 18, is_spiderman := true)

