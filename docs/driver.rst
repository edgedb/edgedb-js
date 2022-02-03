.. _edgedb-js-examples:


Driver
======

The driver implements the core functionality required to establish a connection to your database and execute queries.

.. _edgedb-js-create-client:

Creating clients
----------------

A *client* represents a connection to your database and provides methods for executing queries.

.. note::

  In actuality, the client maintains an *pool* of connections under the hood. When your server is under load, queries will be run in parallel across many connections, instead of being bottlenecked by a single connection.

To create a client:

.. code-block:: js

    const edgedb = require("edgedb");

    const client = edgedb.createClient();

Configuring the connection
--------------------------

Notice we didn't pass any arguments into ``createClient``. That's intentional; we recommend using EdgeDB projects or environment variables to configure your database connections. See the :ref:`Client Library Connection
<edgedb_client_connection>` docs for details on configuring connections.

Running queries
---------------

To execute a basic query:

.. code-block:: js

  const edgedb = require("edgedb");

  const client = edgedb.createClient();

  async function main() {
    const result = await client.query(`select 2 + 2;`);
    console.log(result); // [4]
  }


.. _edgedb-js-typescript:

In TypeScript, you can supply a type hint to receive a strongly typed result.

.. code-block:: js

  const result = await client.query<number>(`select 2 + 2;`);
  // number[]


Type conversion
---------------

The driver converts EdgeDB types into a corresponding JavaScript data structure. Some EdgeDB types like ``duration`` don't have a corresponding type in the JavaScript type system, so we've implemented classes like :js:class:`Duration` to represent them.

.. list-table::

  * - **EdgeDB type**
    - **JavaScript type**
  * - Sets
    - ``Array``
  * - Arrays
    - ``Array``
  * - Tuples ``tuple<x, y, ...>``
    - ``Array``
  * - Named tuples ``tuple<foo: x, bar: y, ...>``
    - ``object``
  * - Enums
    - ``string``
  * - ``Object``
    - ``object``
  * - ``str``
    - ``string``
  * - ``bool``
    - ``boolean``
  * - ``float32`` ``float64`` ``int16`` ``int32`` ``int64``
    - ``number``
  * - ``json``
    - ``string``
  * - ``uuid``
    - ``string``
  * - ``bigint``
    - ``BigInt``
  * - ``decimal``
    - N/A (not supported)
  * - ``bytes``
    - ``Buffer``
  * - ``datetime``
    - ``Date``
  * - ``duration``
    - :js:class:`Duration`
  * - ``cal::local_date``
    - :js:class:`LocalDate`
  * - ``cal::local_time``
    - :js:class:`LocalTime`
  * - ``cal::local_datetime``
    - :js:class:`LocalDateTime`
  * - ``cfg::memory``
    - :js:class:`ConfigMemory`


To learn more about the driver's built-in type classes, refer to the reference documentation.

- :js:class:`LocalDate`
- :js:class:`LocalTime`
- :js:class:`LocalDateTime`
- :js:class:`Duration`
- :js:class:`ConfigMemory`


.. .. note::

..   **A message for query builder users**

..   Everything below this point isn't necessary/applicable for query builder users. Continue to the :ref:`Query Builder <edgedb-js-qb>` docs.


Enforcing cardinality
---------------------

There are additional methods for running queries that have an *expected cardinality*. This is a useful way to tell the driver how many elements you expect the query to return.

``.query`` method
^^^^^^^^^^^^^^^^^

The ``query`` method places no constraints on cardinality. It returns an array, no matter what.

.. code-block:: js

  await client.query(`select 2 + 2;`); // [4]
  await client.query(`select <int64>{};`); // []
  await client.query(`select {1, 2, 3};`); // [1, 2, 3]

``.querySingle`` method
^^^^^^^^^^^^^^^^^^^^^^^

Use ``querySingle`` if you expect your query to return *zero or one* elements. Unlike ``query``, it either returns a single element or ``null``. Note that if you're selecting an array, tuple, or

.. code-block:: js

  await client.querySingle(`select 2 + 2;`); // [4]
  await client.querySingle(`select <int64>{};`); // null
  await client.querySingle(`select {1, 2, 3};`); // Error

``.queryRequiredSingle`` method
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Use ``queryRequiredSingle`` for queries that return *exactly one* element.

.. code-block:: js

  await client.queryRequiredSingle(`select 2 + 2;`); // 4
  await client.queryRequiredSingle(`select <int64>{};`); // Error
  await client.queryRequiredSingle(`select {1, 2, 3};`); // Error

The TypeScript signatures of these methods reflects their behavior.

.. code-block:: typescript

  await client.querySingle<number>(`select 2 + 2;`);
  // number | null

  await client.queryRequiredSingle<number>(`select 2 + 2;`);
  // number


JSON results
------------

There are dedicated methods for running queries and retrieving results as a serialized JSON string. This serialization happens inside the database.

.. code-block:: js

  await client.query(`select {1, 2, 3};`);
  // "[1, 2, 3]"

  await client.querySingle(`select <int64>{};`);
  // "null"

  await client.queryRequiredSingle(`select 3.14;`);
  // "3.14"

Non-returning queries
---------------------

To execute a query without retrieving a result, use the ``.execute`` method. This is especially useful for mutations, where there's often no need for the query to return a value.

.. code-block:: js

  await client.execute(`insert Movie {
    title := "Avengers: Endgame"
  };`);

Parameters
----------

If your query contains parameters (e.g. ``$foo``), you can pass in values as the second argument. This is true for all ``query*`` methods and ``execute``.

.. code-block:: js

  const INSERT_MOVIE = `insert Movie {
    title := <str>$title
  }`
  const result = await client.querySingle(INSERT_MOVIE, {
    title: "Iron Man"
  });
  console.log(result);
  // {id: "047c5893..."}

Remember that :ref:`parameters <ref_eql_params>` can only be *scalars* or *arrays of scalars*.

Checking connection status
--------------------------

The client maintains a dynamically sized *pool* of connections under the hood. These connections are initialized *lazily*, so no connection will be established until the first time you execute a query.

If you want to explicitly ensure that the client is connected without running a query, use the ``.ensureConnected()`` method.

.. code-block:: js

  const edgedb = require("edgedb");

  const client = edgedb.createClient();

  async function main() {
    await client.ensureConnected();
  }

.. _edgedb-js-api-transaction:

Transactions
------------

The most robust way to execute transactional code is to use
the ``transaction()`` API:

.. code-block:: js

    await client.transaction(tx => {
      await tx.execute("insert User {name := 'Don'}");
    });

Note that we execute queries on the ``tx`` object in the above
example, rather than on the original ``client`` object.

The ``transaction()`` API guarantees that:

1. Transactions are executed atomically;
2. If a transaction fails due to retryable error (like
   a network failure or a concurrent update error), the transaction
   would be retried;
3. If any other, non-retryable error occurs, the transaction is rolled
   back and the ``transaction()`` block throws.

The key implication of retrying transactions is that the entire
nested code block can be re-run, including any non-querying
JavaScript code. Here is an example:

.. code-block:: js

    const email = "timmy@edgedb.com"

    await client.transaction(async tx => {
      await tx.execute(
        `insert User { email := <str>$email }`,
        { email },
      )

      await sendWelcomeEmail(email);

      await tx.execute(
        `insert LoginHistory {
          user := (select User filter .email = <str>$email),
          timestamp := datetime_current()
        }`,
        { email },
      )
    })

In the above example, the welcome email may be sent multiple times if the
transaction block is retried. Generally, the code inside the transaction block
shouldn't have side effects or run for a significant amount of time.

.. note::

  Transactions allocate expensive server resources and having
  too many concurrently running long-running transactions will
  negatively impact the performance of the DB server.

.. note::

  * RFC1004_
  * :js:meth:`Client.transaction\<T\>`

  .. _RFC1004: https://github.com/edgedb/rfcs/blob/master/text/1004-transactions-api.rst


Next up
-------

If you're using plain JavaScript, the driver API will likely meet your needs. If you're a TypeScript user and want autocompletion and type inference, head over to the :ref:`Query Builder docs <edgedb-js-qb>`.
