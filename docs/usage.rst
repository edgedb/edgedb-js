.. _edgedb-js-examples:


Basic Usage
===========

The interaction with the database normally starts with a call to ``connect()``,
which establishes a new database session. This results in getting a
connection ``Promise``.  The connection instance provides methods to
run queries.

.. code-block:: js

    const edgedb = require("edgedb");

    async function main() {
      // Establish a connection to an existing database
      // named "test" as an "edgedb" user.
      const conn = await edgedb.connect("edgedb://edgedb@localhost/test");

      try {
        // Create a User object type.
        await conn.execute(`
          CREATE TYPE User {
              CREATE REQUIRED PROPERTY name -> str;
              CREATE PROPERTY dob -> cal::local_date;
          }
        `);

        // Insert a new User object.
        await conn.query(
          `
          INSERT User {
              name := <str>$name,
              dob := <cal::local_date>$dob
          }
          `,
          {
            name: "Bob",
            dob: new edgedb.LocalDate(1984, 3, 1)
          }
        );

        // Select User objects.
        let userSet = await conn.query(
          "SELECT User {name, dob} FILTER .name = <str>$name",
          { name: "Bob" }
        );

        // *userSet* now contains
        // Set{Object{name := 'Bob',
        //            dob := datetime.date(1984, 3, 1)}}
        console.log(userSet);
      } finally {
        conn.close()
      }
    }

    main();


Type Conversion
---------------

``edgedb`` automatically converts EdgeDB types to the corresponding
JavaScript types and vice versa.  See :ref:`edgedb-js-datatypes` for details.

.. _edgedb-js-connection-pool:


Connection Pools
----------------

For server-side applications that handle frequent requests and need
database connections for short periods of time, it is recommended to use a
connection pool. The edgedb-js API provides an implementation of such pool.

To create a connection pool, use the ``createPool()`` method.
The resulting :js:class:`edgedb.Pool <Pool>` object can be used to maintain
a certain number of open connections and borrow them when needed.

.. code-block:: js

    const edgedb = require("edgedb");

    async function main() {
      // Create a connection pool to an existing database
      const pool = await edgedb.createPool("edgedb://edgedb@localhost/test");

      try {
        // Create a User object type.
        await pool.execute(`
          CREATE TYPE User {
              CREATE REQUIRED PROPERTY name -> str;
              CREATE PROPERTY dob -> cal::local_date;
          }
        `);

        // Insert a new User object.
        await pool.query(
          `
           INSERT User {
             name := <str>$name,
             dob := <cal::local_date>$dob
           }
          `,
          {
            name: "Bob",
            dob: new edgedb.LocalDate(1984, 3, 1)
          }
        );

        // Select User objects.
        let userSet = await pool.query(
          "SELECT User {name, dob} FILTER .name = <str>$name",
          { name: "Bob" }
        );

        // *userSet* now contains
        // Set{Object{name := 'Bob',
        //            dob := datetime.date(1984, 3, 1)}}
        console.log(userSet);
      } finally {
        await pool.close();
      }
    }

    main();

See :ref:`edgedb-js-api-pool` API documentation for
more information.


Transactions
------------

The most robust way to execute transactional code is to use
the ``retry()`` API:

.. code-block:: js

    await pool.retry(tx => {
      await tx.execute("INSERT User {name := 'Don'}");
    });

Note that we execute queries on the ``tx`` object in the above
example, rather than on the original connection pool ``pool``
object.

The ``retry()`` API guarantees that:

1. Transactions are executed atomically;
2. If a transaction is failed for any of the number of transient errors (i.e.
   a network failure or a concurrent update error), the transaction would be retried;
3. If any other, non-retryable exception occurs, the transaction is rolled back,
   and the exception is propagated, immediately aborting the ``retry()`` block.

The key implication of retrying transactions is that the entire
nested code block can be re-run, including any non-querying
JavaScript code. Here is an example:

.. code-block:: js

    pool.retry(tx => {
        let user = await tx.queryOne(
            "SELECT User { email } FILTER .login = <str>$login",
            login=login,
        )
        let query = await fetch(
            'https://service.local/email_info', {
                body: JSON.stringify({email: user.email})
                headers: { 'Content-Type': 'application/json' },
            },
        )
        let data = await query.json()
        user = await tx.queryOne('''
                UPDATE User FILTER .login = <str>$login
                SET { email_info := <json>$data}
            ''',
            login=login,
            data=data,
        )
    })

In the above example, the execution of the HTTP request would be retried
too. The core of the issue is that whenever transaction is interrupted
user might have the email changed (as the result of concurrent
transaction), so we have to redo all the work done.

Generally it's recommended to not execute any long running
code within the transaction unless absolutely necessary.

Transactions allocate expensive server resources and having
too many concurrently running long-running transactions will
negatively impact the performance of the DB server.

See also:

* RFC1004_
* :js:meth:`Connection.retry()`
* :js:meth:`Connection.tryTransaction()`

.. _RFC1004: https://github.com/edgedb/rfcs/blob/master/text/1004-transactions-api.rst
