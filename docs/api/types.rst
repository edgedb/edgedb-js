.. _edgedb-js-datatypes:

=========
Datatypes
=========

edgedb-js automatically converts EdgeDB types to the corresponding JavaScript
types and vice versa.

The table below shows the correspondence between EdgeDB and JavaScript types.

+----------------------+-----------------------------------------------------+
| EdgeDB Type          |  JavaScript Type                                    |
+======================+=====================================================+
| ``array<anytype>``   | ``Array``                                           |
+----------------------+-----------------------------------------------------+
| ``anytuple``         | ``Array`` or                                        |
|                      | ``Array``-like ``object``                           |
+----------------------+-----------------------------------------------------+
| ``anyenum``          | ``string``                                          |
+----------------------+-----------------------------------------------------+
| ``Object``           | ``object``                                          |
+----------------------+-----------------------------------------------------+
| ``bool``             | ``boolean``                                         |
+----------------------+-----------------------------------------------------+
| ``bytes``            | ``Buffer``                                          |
+----------------------+-----------------------------------------------------+
| ``str``              | ``string``                                          |
+----------------------+-----------------------------------------------------+
| ``local_date``       | :js:class:`LocalDate`                               |
+----------------------+-----------------------------------------------------+
| ``local_time``       | :js:class:`LocalTime`                               |
+----------------------+-----------------------------------------------------+
| ``local_datetime``   | :js:class:`LocalDateTime`                           |
+----------------------+-----------------------------------------------------+
| ``datetime``         | ``Date``                                            |
+----------------------+-----------------------------------------------------+
| ``duration``         | :js:class:`Duration`                                |
+----------------------+-----------------------------------------------------+
| ``float32``,         | ``number``                                          |
| ``float64``          |                                                     |
| ``int16``,           |                                                     |
| ``int32``,           |                                                     |
| ``int64``            |                                                     |
+----------------------+-----------------------------------------------------+
| ``bigint``           | BigInt_                                             |
+----------------------+-----------------------------------------------------+
| ``decimal``          | n/a                                                 |
+----------------------+-----------------------------------------------------+
| ``json``             | ``string``                                          |
+----------------------+-----------------------------------------------------+
| ``uuid``             | ``edgedb.UUID``                                     |
+----------------------+-----------------------------------------------------+

.. note::

    Inexact single-precision ``float`` values may have a different
    representation when decoded into a JavaScript number.  This is inherent
    to the implementation of limited-precision floating point types.
    If you need the decimal representation to match, cast the expression
    to ``float64`` in your query.

.. note::

    Due to precision limitations the ``decimal`` type cannot be decoded to a
    JavaScript number. Use an explicit cast to ``float64`` if the precision
    degradation is acceptable or a cast to ``str`` for an exact decimal
    representation.


.. _edgedb-js-types-set:

Sets
====

.. js:class:: Set() extends Array

    ``Set`` represents the set of values returned by a query. If a query
    contained an explicit ``ORDER BY`` clause, the values will be ordered,
    otherwise no specific ordering is guaranteed.

    This type also allows to differentiate between a set of values and an
    explicit array.


Arrays
======

EdgeDB ``array``  maps onto the JavaScript ``Array``.

.. code-block:: js

    // Use the Node.js assert library to test results.
    const assert = require("assert");
    const edgedb = require("edgedb");

    async function main() {
      const conn = await edgedb.connect({
        dsn: "edgedb://edgedb@localhost/"
      });

      try {
        let data = await conn.fetchOne("SELECT [1, 2, 3]");

        // The result is an Array.
        assert(data instanceof Array);
        assert(typeof data[0] === "number");
        assert(data.length === 3);
        assert(data[2] === 3);
      } finally {
        conn.close();
      }
    }

    main();

.. _edgedb-js-types-object:

Objects
=======

``Object`` represents an object instance returned from a query. The value of an
object property or a link can be accessed through a corresponding object key:

.. code-block:: js

    // Use the Node.js assert library to test results.
    const assert = require("assert");
    const edgedb = require("edgedb");

    async function main() {
      const conn = await edgedb.connect({
        dsn: "edgedb://edgedb@localhost/"
      });

      try {
        let data = await conn.fetchOne(`
          SELECT schema::Property {
              name,
              annotations: {name, @value}
          }
          FILTER .name = 'listen_port'
              AND .source.name = 'cfg::Config'
          LIMIT 1
        `);

        // The property 'name' is accessible.
        assert(typeof data.name === "string");
        // The link 'annotaions' is accessible and is a Set.
        assert(typeof data.annotations === "object");
        assert(data.annotations instanceof edgedb.Set);
        // The Set of 'annotations' is array-like.
        assert(data.annotations.length > 0);
        assert(data.annotations[0].name === "cfg::system");
        assert(data.annotations[0]["@value"] === "true");
      } finally {
        conn.close();
      }
    }

    main();

Tuples
======

A regular EdgeDB ``tuple`` becomes an ``Array`` in JavaScript.

.. code-block:: js

    // Use the Node.js assert library to test results.
    const assert = require("assert");
    const edgedb = require("edgedb");

    async function main() {
      const conn = await edgedb.connect({
        dsn: "edgedb://edgedb@localhost/"
      });

      try {
        let data = await conn.fetchOne(`
          SELECT (1, 'a', [3])
        `);

        // The resulting tuple is an Array.
        assert(data instanceof Array);
        assert(data.length === 3);
        assert(typeof data[0] === "number");
        assert(typeof data[1] === "string");
        assert(data[2] instanceof Array);
      } finally {
        conn.close();
      }
    }

    main();

Named Tuples
============

A named EdgeDB ``tuple`` becomes an ``Array``-like ``object`` in JavaScript,
where the elelemnts are accessible either by their names or indexes.

.. code-block:: js

    // Use the Node.js assert library to test results.
    const assert = require("assert");
    const edgedb = require("edgedb");

    async function main() {
      const conn = await edgedb.connect({
        dsn: "edgedb://edgedb@localhost/"
      });

      try {
        let data = await conn.fetchOne(`
          SELECT (a := 1, b := 'a', c := [3])
        `);

        // The resulting tuple is an Array.
        assert(data instanceof Array);
        assert(data.length === 3);
        assert(typeof data[0] === "number");
        assert(typeof data[1] === "string");
        assert(data[2] instanceof Array);
        // Elements can be accessed by their names.
        assert(typeof data.a === "number");
        assert(typeof data["b"] === "string");
        assert(data.c instanceof Array);
      } finally {
        conn.close();
      }
    }

    main();

Local Date
==========

.. js:class:: LocalDate(\
        year: number, \
        monthIndex: number = 0, \
        day: number = 1)

    A JavaScript representation of an EdgeDB ``local_date`` value.

    .. js:method:: fromOrdinal(ord: number): LocalDate
        :staticmethod:

        The inverse of :js:meth:`~LocalDate.toOrdinal`.

        Convert the ordinal day index into the corresponding local date.

    .. js:method:: getFullYear(): number

        Get the year value of the local date.

    .. js:method:: getMonth(): number

        Get the numerical month value of the local date (starting with 0).

    .. js:method:: getDate(): number

        Get the day of the month value of the local date (starting with 1).

    .. js:method:: valueOf(): string

        Same as :js:meth:`~LocalDate.toString`.

    .. js:method:: toString(): string

        Get the string representation of the ``local_date`` in the
        ``YYYY-MM-DD`` format.

    .. js:method:: toOrdinal(): number

        Get the index based on the number of days corresponding to the local
        date considering 0001-01-01 as day 1.


Local Time
==========

.. js:class:: LocalTime(\
        hours: number, \
        minutes: number = 0, \
        seconds: number = 0, \
        milliseconds: number = 0)

    A JavaScript representation of an EdgeDB ``local_time`` value.

    .. js:method:: getHours(): number

        Get the hours component of the local time in 0-23 range.

    .. js:method:: getMinutes(): number

        Get the minutes component of the local time in 0-59 range.

    .. js:method:: getSeconds(): number

        Get the seconds component of the local time in 0-59 range.

    .. js:method:: getMilliseconds(): number

        Get the millisecond component of the local time in 0-999 range.

    .. js:method:: valueOf(): string

        Same as :js:meth:`~LocalTime.toString`.

    .. js:method:: toString(): string

        Get the string representation of the ``local_time`` in the ``HH:MM:SS``
        24-hour format.


Local Date and Time
===================

.. js:class:: LocalDateTime(\
        year: number, \
        monthIndex: \
        number = 0, \
        day: number = 1, \
        hours: number, \
        minutes: number = 0, \
        seconds: number = 0, \
        milliseconds: number = 0)

    A JavaScript representation of an EdgeDB ``local_datetime`` value.

    .. js:method:: getTime(): number

        Get the number of milliseconds between midnight of January 1, 1970 and
        the local date and time.

    .. js:method:: getFullYear(): number

        Get the year value of the local date.

    .. js:method:: getMonth(): number

        Get the numerical month value of the local date (starting with 0).

    .. js:method:: getDate(): number

        Get the day of the month value of the local date (starting with 1).

    .. js:method:: getDay(): number

        Get the day of the week of the local date in 0-6 range.

    .. js:method:: getHours(): number

        Get the hours component of the local time in 0-23 range.

    .. js:method:: getMinutes(): number

        Get the minutes component of the local time in 0-59 range.

    .. js:method:: getSeconds(): number

        Get the seconds component of the local time in 0-59 range.

    .. js:method:: getMilliseconds(): number

        Get the millisecond component of the local time in 0-999 range.

    .. js:method:: toDateString(): string

        Same as :js:meth:`~LocalDateTime.toString`.

    .. js:method:: toISOString(): string

        Produce an ISO 8601 string representation of the local date and time
        without time zone.

    .. js:method:: toJSON(): string

        Same as :js:meth:`~LocalDateTime.toISOString`.

    .. js:method:: valueOf(): string

        Same as :js:meth:`~LocalDateTime.getTime`.

    .. js:method:: toString(): string

        Get the string representation of the ``local_datetime``.

    .. js:method:: toDateTime(): Date

        Convert the local date and time into a time-zone aware Date using the
        default time zone for the current environemnt.


Duration
========

.. js:class:: Duration(milliseconds: number = 0)

    A JavaScript  representation of an EdgeDB ``duration`` value.

    .. js:method:: fromMicroseconds(us: BigInt): Duration
        :staticmethod:

        Create duration from BigInt_ number of microseconds.

        Note: new Duration() accepts fractional seconds too but can loose
        precision because it's floating point.

    .. js:method:: toMilliseconds(): number

        Get the number of microseconds in the duration (can be fractional).

    .. js:method:: toSeconds(): number

        Get the number of seconds in the duration (can be fractional).

    .. js:method:: toMicroseconds(): BigInt

        Get the precise number of microseconds in the duration.

    .. js:method:: toString(): string

        Get the string representation of the ``duration`` that is similar to
        the result of a ``str`` cast of a ``duration`` in EdgeDB.


.. _BigInt:
    https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt
