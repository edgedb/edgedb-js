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
| ``Set``              | ``Array``                                           |
+----------------------+-----------------------------------------------------+
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

    Under the hood, the result of the ``.query`` method is an instance of
    ``edgedb.Set``. This class represents a set of values returned by a query.
    If the query contained an explicit ``ORDER BY`` clause, the values will be
    ordered, otherwise no specific ordering is guaranteed.

    This type also allows to differentiate between a set of values and an
    explicit array.

    .. code-block:: js

        const result = await conn.query(`SELECT {0, 1, 2};`);
        result instanceof edgedb.Set; // true
        result[0]; // 0
        result[1]; // 1
        result[2]; // 2

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
        let data = await conn.querySingle("SELECT [1, 2, 3]");

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
        let data = await conn.querySingle(`
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
        let data = await conn.querySingle(`
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
where the elements are accessible either by their names or indexes.

.. code-block:: js

    // Use the Node.js assert library to test results.
    const assert = require("assert");
    const edgedb = require("edgedb");

    async function main() {
      const conn = await edgedb.connect({
        dsn: "edgedb://edgedb@localhost/"
      });

      try {
        let data = await conn.querySingle(`
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
        month: number, \
        day: number)

    A JavaScript representation of an EdgeDB ``local_date`` value. Implements
    a subset of the `TC39 Temporal Proposal`_ ``PlainDate`` type.

    Assumes the calendar is always `ISO 8601`_.

    .. js:attribute:: year: number

        The year value of the local date.

    .. js:attribute:: month: number

        The numerical month value of the local date.

        .. note::

            Unlike the JS ``Date`` object, months in ``LocalDate`` start at 1.
            ie. Jan = 1, Feb = 2, etc.

    .. js:attribute:: day: number

        The day of the month value of the local date (starting with 1).

    .. js:attribute:: dayOfWeek: number

        The weekday number of the local date. Returns a value between 1 and 7
        inclusive, where 1 = Monday and 7 = Sunday.

    .. js:attribute:: dayOfYear: number

        The ordinal day of the year of the local date. Returns a value between
        1 and 365 (or 366 in a leap year).

    .. js:attribute:: weekOfYear: number

        The ISO week number of the local date. Returns a value between 1 and
        53, where ISO week 1 is defined as the week containing the first
        Thursday of the year.

    .. js:attribute:: daysInWeek: number

        The number of days in the week of the local date. Always returns 7.

    .. js:attribute:: daysInMonth: number

        The number of days in the month of the local date. Returns a value
        between 28 and 31 inclusive.

    .. js:attribute:: daysInYear: number

        The number of days in the year of the local date. Returns either 365 or
        366 if the year is a leap year.

    .. js:attribute:: monthsInYear: number

        The number of months in the year of the local date. Always returns 12.

    .. js:attribute:: inLeapYear: boolean

        Return whether the year of the local date is a leap year.

    .. js:method:: toString(): string

        Get the string representation of the ``LocalDate`` in the
        ``YYYY-MM-DD`` format.

    .. js:method:: toJSON(): number

        Same as :js:meth:`~LocalDate.toString`.

    .. js:method:: valueOf(): never

        Always throws an Error. ``LocalDate`` objects are not comparable.


Local Time
==========

.. js:class:: LocalTime(\
        hour: number = 0, \
        minute: number = 0, \
        second: number = 0, \
        millisecond: number = 0, \
        microsecond: number = 0, \
        nanosecond: number = 0)

    A JavaScript representation of an EdgeDB ``local_time`` value. Implements
    a subset of the `TC39 Temporal Proposal`_ ``PlainTime`` type.

    .. note::

        The EdgeDB ``local_time`` type only has microsecond precision, any
        nanoseconds specified in the ``LocalTime`` will be ignored when
        encoding to an EdgeDB ``local_time``.

    .. js:attribute:: hour: number

        The hours component of the local time in 0-23 range.

    .. js:attribute:: minute: number

        The minutes component of the local time in 0-59 range.

    .. js:attribute:: second: number

        The seconds component of the local time in 0-59 range.

    .. js:attribute:: millisecond: number

        The millisecond component of the local time in 0-999 range.

    .. js:attribute:: microsecond: number

        The microsecond component of the local time in 0-999 range.

    .. js:attribute:: nanosecond: number

        The nanosecond component of the local time in 0-999 range.

    .. js:method:: toString(): string

        Get the string representation of the ``local_time`` in the ``HH:MM:SS``
        24-hour format.

    .. js:method:: toJSON(): number

        Same as :js:meth:`~LocalTime.toString`.

    .. js:method:: valueOf(): never

        Always throws an Error. ``LocalTime`` objects are not comparable.


Local Date and Time
===================

.. js:class:: LocalDateTime(\
        year: number, \
        month: number, \
        day: number, \
        hour: number = 0, \
        minute: number = 0, \
        second: number = 0, \
        millisecond: number = 0, \
        microsecond: number = 0, \
        nanosecond: number = 0) extends LocalDate, LocalTime

    A JavaScript representation of an EdgeDB ``local_datetime`` value.
    Implements a subset of the `TC39 Temporal Proposal`_ ``PlainDateTime``
    type.

    Inherits all properties from the :js:class:`~LocalDate` and
    :js:class:`~LocalTime` types.

    .. js:method:: toString(): string

        Get the string representation of the ``local_datetime`` in the
        ``YYYY-MM-DDTHH:MM:SS`` 24-hour format.

    .. js:method:: toJSON(): number

        Same as :js:meth:`~LocalDateTime.toString`.

    .. js:method:: valueOf(): never

        Always throws an Error. ``LocalDateTime`` objects are not comparable.


Duration
========

.. js:class:: Duration(\
        years: number = 0, \
        months: number = 0, \
        weeks: number = 0, \
        days: number = 0, \
        hours: number = 0, \
        minutes: number = 0, \
        seconds: number = 0, \
        milliseconds: number = 0, \
        microseconds: number = 0, \
        nanoseconds: number = 0)

    A JavaScript representation of an EdgeDB ``duration`` value. Implements
    a subset of the `TC39 Temporal Proposal`_ ``Duration`` type.

    No arguments may be infinite and all must have the same sign.
    Any non-integer arguments will be rounded towards zero.

    .. note::

        The Temporal ``Duration`` type can contain both absolute duration
        components, such as hours, minutes, seconds, etc. and relative
        duration components, such as years, months, weeks, and days, where
        their absolute duration changes depending on the exact date they are
        relative to (eg. different months have a different number of days).

        The EdgeDB ``duration`` type only supports absolute durations, so any
        ``Duration`` with non-zero years, months, weeks, or days will throw
        an error when trying to encode them.

    .. note::

        The EdgeDB ``duration`` type only has microsecond precision, any
        nanoseconds specified in the ``Duration`` will be ignored when
        encoding to an EdgeDB ``duration``.

    .. note::

        Temporal ``Duration`` objects can be unbalanced_, (ie. have a greater
        value in any property than it would naturally have, eg. have a seconds
        property greater than 59), but EdgeDB ``duration`` objects are always
        balanced.

        Therefore in a round-trip of a ``Duration`` object to EdgeDB and back,
        the returned object, while being an equivalent duration, may not
        have exactly the same property values as the sent object.

    .. js:attribute:: years: number

        The number of years in the duration.

    .. js:attribute:: months: number

        The number of months in the duration.

    .. js:attribute:: weeks: number

        The number of weeks in the duration.

    .. js:attribute:: days: number

        The number of days in the duration.

    .. js:attribute:: hours: number

        The number of hours in the duration.

    .. js:attribute:: minutes: number

        The number of minutes in the duration.

    .. js:attribute:: seconds: number

        The number of seconds in the duration.

    .. js:attribute:: milliseconds: number

        The number of milliseconds in the duration.

    .. js:attribute:: microseconds: number

        The number of microseconds in the duration.

    .. js:attribute:: nanoseconds: number

        The number of nanoseconds in the duration.

    .. js:attribute:: sign: number

        Returns -1, 0, or 1 depending on whether the duration is negative,
        zero or positive.

    .. js:attribute:: blank: boolean

        Returns ``true`` if the duration is zero.

    .. js:method:: toString(): string

        Get the string representation of the duration in `ISO 8601 duration`_
        format.

    .. js:method:: toJSON(): number

        Same as :js:meth:`~Duration.toString`.

    .. js:method:: valueOf(): never

        Always throws an Error. ``Duration`` objects are not comparable.


.. _BigInt:
    https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt
.. _TC39 Temporal Proposal: https://tc39.es/proposal-temporal/docs/
.. _ISO 8601: https://en.wikipedia.org/wiki/ISO_8601#Dates
.. _ISO 8601 duration: https://en.wikipedia.org/wiki/ISO_8601#Durations
.. _unbalanced: https://tc39.es/proposal-temporal/docs/balancing.html
