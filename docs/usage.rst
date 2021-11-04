.. _edgedb-js-examples:


Basic Usage
===========

The interaction with the database normally starts with a call to
``createClient()``, which returns a new ``Client`` object. The client will
maintain a pool of connections to your EdgeDB instance, and provides methods
to run queries.

.. code-block:: js

    const edgedb = require("edgedb");

    async function main() {
      // If you're running in an EdgeDB project directory, there's no need
      // to provide any connection config to 'createClient', edgedb-js will
      // find your database instance automatically
      const client = edgedb.createClient();

      // The 'Client' creates connections lazily as they are needed, so until
      // you run a query no connection will be made. If you want to explicitly
      // ensure that the client is connected, use the 'ensureConnected' method:
      // await client.ensureConnected();

      // Create a User object type.
      await client.execute(`
        CREATE TYPE User {
          CREATE REQUIRED PROPERTY name -> str;
          CREATE PROPERTY dob -> cal::local_date;
        }
      `);

      // Insert a new User object.
      await client.query(
        `insert User {
          name := <str>$name,
          dob := <cal::local_date>$dob
        }`,
        {
          name: "Bob",
          dob: new edgedb.LocalDate(1984, 3, 1)
        }
      );

      // Select User objects.
      const userBob = await client.querySingle(
        `select User {name, dob}
         filter .name = <str>$name`,
        { name: "Bob" }
      );
      console.log(userBob);
      // { name: 'Bob', dob: edgedb.LocalDate(1984, 3, 1) }

      // Try running multiple queries at once
      const results = await Promise.all([
        client.query(`select User`),
        client.querySingle(`select 1 + 2`),
      ]);
      console.log(results);
      // [
      //   [{ name: 'Bob', dob: edgedb.LocalDate(1984, 3, 1) }],
      //   3
      // ]

      client.close();
    }

    main();

TypeScript
---------------

For details on usage with TypeScript, go to :ref:`edgedb-js-typescript`.


Type Conversion
---------------

``edgedb`` automatically converts EdgeDB types to the corresponding
JavaScript types and vice versa.  See :ref:`edgedb-js-datatypes` for details.


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
2. If a transaction is failed for any of the number of transient errors (i.e.
   a network failure or a concurrent update error), the transaction
   would be retried;
3. If any other, non-retryable exception occurs, the transaction is rolled
   back, and the exception is propagated, immediately aborting the
   ``transaction()`` block.

The key implication of retrying transactions is that the entire
nested code block can be re-run, including any non-querying
JavaScript code. Here is an example:

.. code-block:: js

    client.transaction(tx => {
      const user = await tx.querySingle(
        `select User { email } filter .login = <str>$login`,
        {login},
      )
      const query = await fetch(
        'https://service.local/email_info', {
          body: JSON.stringify({email: user.email})
          headers: { 'Content-Type': 'application/json' },
        },
      )
      const data = await query.json()
      await tx.querySingle(`
        update User filter .login = <str>$login
        set { email_info := <json>$data}
      `, {
        login,
        data,
      })
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
* :js:meth:`Client.transaction\<T\>`
* :js:meth:`Client.rawTransaction\<T\>`

.. _RFC1004: https://github.com/edgedb/rfcs/blob/master/text/1004-transactions-api.rst
