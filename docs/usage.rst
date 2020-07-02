.. _edgedb-js-examples:


Basic Usage
===========

**edgedb-js** has two APIs: Promise-based and callback-based.

The interaction with the database normally starts with a call to ``connect()``,
which establishes a new database session. This either results in setting up a
callback or getting a connection ``Promise``.  The connection instance
provides methods to run queries.

Callback connection example:

.. code-block:: js

    const edgedb = require("edgedb");

    // Establish a connection to an existing database
    // named "test" as an "edgedb" user.
    edgedb.connect(
      {
        dsn: "edgedb://edgedb@localhost/test"
      },
      (err, conn) => {
        // Create a User object type.
        conn.execute(
          `
          CREATE TYPE User {
              CREATE REQUIRED PROPERTY name -> str;
              CREATE PROPERTY dob -> cal::local_date;
          }
          `,
          (err, data) => {
            // Insert a new User object.
            conn.fetchAll(
              `
              INSERT User {
                  name := <str>$name,
                  dob := <cal::local_date>$dob
              }
              `,
              {
                name: "Bob",
                dob: new edgedb.LocalDate(1984, 3, 1) // 1 April 1984
              },
              (err, data) => {
                // Select User objects.
                conn.fetchAll(
                  `
                    SELECT User {name, dob}
                    FILTER .name = <str>$name
                  `,
                  { name: "Bob" },
                  (err, userSet) => {
                    // *user_set* now contains
                    // Set{Object{name := 'Bob',
                    //            dob := datetime.date(1984, 3, 1)}}
                    console.log(userSet);

                    // Close the connection.
                    conn.close();
                  }
                );
              }
            );
          }
        );
      }
    );

An equivalent example using the Promise-based API:

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
        await conn.fetchAll(
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
        let userSet = await conn.fetchAll(
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
and ``ROLLBACK`` EdgeDB commands. The :js:meth:`AwaitConnection.execute` can be
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

Below is an example of a connection pool usage, using the Promise-based API:

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
        await pool.fetchAll(
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
        let userSet = await pool.fetchAll(
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

Below is an example using the callback API:

.. code-block:: js

    const edgedb = require("edgedb");

    edgedb.createPool({
      connectOptions: {
        user: "edgedb",
        host: "127.0.0.1"
      },
    }, (err, pool) => {
      if (err) {
        throw err;
      }

      pool.fetchOne("select <int64>$i + 1", { i: 10 }, (err2, data2) => {
        if (err2) {
          throw err2;
        }

        console.log(data2);

        pool.close();
      });
    });


See :ref:`edgedb-js-api-pool` API documentation for
more information.
