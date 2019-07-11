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
              CREATE PROPERTY dob -> local_date;
          }
          `,
          (err, data) => {
            // Insert a new User object.
            conn.fetchAll(
              `
              INSERT User {
                  name := <str>$name,
                  dob := <local_date>$dob
              }
              `,
              {
                name: "Bob",
                dob: new edgedb.LocalDate(1984, 3, 1)
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
              CREATE PROPERTY dob -> local_date;
          }
        `);

        // Insert a new User object.
        await conn.fetchAll(
          `
          INSERT User {
              name := <str>$name,
              dob := <local_date>$dob
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

Transactions are supported via execution of ``START TRANSACTION``, ``COMMIT``
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
