.. _edgedb-js-examples:


Basic Usage
===========

**edgedb-js** has two APIs: Promise-based and callback-based.

The interaction with the database normally starts with a call to ``connect()``,
which establishes a new database session. This results in getting a
connection ``Promise``.  The connection instance provides methods to
run queries.

.. code-block:: js

    const edgedb = require("edgedb");

    async function main() {
      // Establish a connection to an existing database
      // named "test" as an "edgedb" user.
      const conn = await edgedb.connect({
        dsn: "edgedb://edgedb@localhost/test"
      });

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

``edgedb`` automatically converts EdgeDB types to the corresponding Python
types and vice versa.  See :ref:`edgedb-js-datatypes` for details.


Transactions
------------

Transactions are supported via execution of ``START TRANSACTION``, ``COMMIT``,
and ``ROLLBACK`` EdgeDB commands. The :js:meth:`Connection.execute` can be
used for this purpose.

.. code-block:: js

    await conn.execute("START TRANSACTION");
    try {
      await conn.execute("INSERT User {name := 'Don'}");
      // All done - commit.
      await conn.execute("COMMIT");
    } catch (err) {
      // Something went wrong - rollback.
      console.log(err);
      await conn.execute("ROLLBACK");
    }

.. note::

   When not in an explicit transaction block, any changes to the database
   will be applied immediately.

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
      const pool = await edgedb.createPool({
        connectOptions: {
          user: "edgedb",
          host: "127.0.0.1"
        },
      });

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
