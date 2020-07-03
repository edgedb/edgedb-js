.. _edgedb-js-api-reference:

===
API
===

.. _edgedb-js-api-connection:

Connection
==========

.. js:function:: connect(options)
                 connect(options, callback)

    Establish a connection to an EdgeDB server.

    :param options: Connection parameters object.

    :param string options.dsn:
        Connection arguments specified using as a single string in the
        connection URI format:
        ``edgedb://user:password@host:port/database?option=value``.
        The following options are recognized: host, port,
        user, database, password.

    :param string|string[] options.host:
        Database host address as one of the following:

        - an IP address or a domain name;
        - an absolute path to the directory containing the database
          server Unix-domain socket (not supported on Windows);
        - an array of any of the above, in which case the addresses
          will be tried in order, and the first successful connection
          will be returned.

        If not specified, the following will be tried, in order:

        - host address(es) parsed from the *dsn* argument,
        - the value of the ``EDGEDB_HOST`` environment variable,
        - on Unix, common directories used for EdgeDB Unix-domain
          sockets: ``"/run/edgedb"`` and ``"/var/run/edgedb"``,
        - ``"localhost"``.

    :param number|number[] options.port:
        Port number to connect to at the server host
        (or Unix-domain socket file extension).  If multiple host
        addresses are specified, this parameter may specify an
        array of port numbers of the same length as the host array,
        or it may specify a single port number to be used for all host
        addresses.

        If not specified, the value parsed from the *dsn* argument is used,
        or the value of the ``EDGEDB_PORT`` environment variable, or ``5656``
        if neither is specified.

    :param boolean options.admin:
        If ``true``, try to connect to the special administration socket.

    :param string options.user:
        The name of the database role used for authentication.

        If not specified, the value parsed from the *dsn* argument is used,
        or the value of the ``EDGEDB_USER`` environment variable, or the
        operating system name of the user running the application.

    :param string options.database:
        The name of the database to connect to.

        If not specified, the value parsed from the *dsn* argument is used,
        or the value of the ``EDGEDB_DATABASE`` environment variable, or the
        operating system name of the user running the application.

    :param string options.password:
        Password to be used for authentication, if the server requires
        one.  If not specified, the value parsed from the *dsn* argument
        is used, or the value of the ``EDGEDB_PASSWORD`` environment variable.
        Note that the use of the environment variable is discouraged as
        other users and applications may be able to read it without needing
        specific privileges.

    :param number options.timeout:
        Connection timeout in seconds.

    :param callback:
        A callback function that will be invoked when the connection is ready.
        The callback function should be of the form ``function(error,
        connection)``. The *connection* is an instance of
        :js:class:`Connection`.

    :returns:
        There are two ways of creating an EdgeDB connection: a Promise-based
        approach and a callback-based. When a *callback* argument is provided,
        the function does not return anything and instead uses the *callback*.
        Otherwise, a ``Promise`` of an :js:class:`AwaitConnection` is returned.

    Example:

    .. code-block:: js

        // Use the Node.js assert library to test results.
        const assert = require("assert");
        const edgedb = require("edgedb");

        async function main() {
          const conn = await edgedb.connect({
            dsn: "edgedb://edgedb@localhost/"
          });

          try{
            let data = await conn.fetchOne("SELECT 1 + 1");

            // The result is a number 2.
            assert(typeof data === "number");
            assert(data === 2);
          } finally {
            conn.close();
          }
        }

        main();

.. js:class:: AwaitConnection

    A representation of a database session.

    :js:class:`AwaitConnection` is not meant to be instantiated by directly,
    :js:func:`connect` should be used instead.


    .. _edgedb-js-api-async-optargs:

    .. note::

        Some methods take query arguments as optional *args*:

        * single values of any of the :ref:`basic types
          recognized<edgedb-js-datatypes>` by EdgeDB
        * an ``Array`` of values of any of the basic types
        * an ``object`` with property names and values corresponding to
          argument names and values of any of the basic types

    .. js:method:: execute(query: string)

        Execute an EdgeQL command (or commands).

        :param query: Query text.

        The commands must take no arguments.

        Example:

        .. code-block:: js

            await con.execute(`
                CREATE TYPE MyType {
                    CREATE PROPERTY a -> int64
                };
                FOR x IN {100, 200, 300}
                UNION INSERT MyType { a := x };
            `)

    .. js:method:: fetchAll(query: string, args)

        Run a query and return the results as a
        :js:class:`Set` instance.

        This method takes :ref:`optional query arguments
        <edgedb-js-api-async-optargs>`.

    .. js:method:: fetchOne(query: string, args)

        Run a singleton-returning query and return its element.

        This method takes :ref:`optional query arguments
        <edgedb-js-api-async-optargs>`.

        The *query* must return exactly one element.  If the query returns
        more than one element or an empty set, an ``Error`` is thrown.

    .. js:method:: fetchAllJSON(query: string, args)

        Run a query and return the results as JSON.

        This method takes :ref:`optional query arguments
        <edgedb-js-api-async-optargs>`.

        .. note::

            Caution is advised when reading ``decimal`` or ``bigint``
            values using this method. The JSON specification does not
            have a limit on significant digits, so a ``decimal`` or a
            ``bigint`` number can be losslessly represented in JSON.
            However, JSON decoders in JavaScript will often read all
            such numbers as ``number`` values, which may result in
            precision loss. If such loss is unacceptable, then
            consider casting the value into ``str`` and decoding it on
            the client side into a more appropriate type, such as
            BigInt_.

    .. js:method:: fetchOneJSON(query: string, args)

        Run a singleton-returning query and return its element in JSON.

        This method takes :ref:`optional query arguments
        <edgedb-js-api-async-optargs>`.

        The *query* must return exactly one element.  If the query returns
        more than one element or an empty set, an ``Error`` is thrown.

        .. note::

            Caution is advised when reading ``decimal`` or ``bigint``
            values using this method. The JSON specification does not
            have a limit on significant digits, so a ``decimal`` or a
            ``bigint`` number can be losslessly represented in JSON.
            However, JSON decoders in JavaScript will often read all
            such numbers as ``number`` values, which may result in
            precision loss. If such loss is unacceptable, then
            consider casting the value into ``str`` and decoding it on
            the client side into a more appropriate type, such as
            BigInt_.

    .. js:method:: close()

        Close the connection gracefully.

.. js:class:: Connection

    A representation of a database session.

    :js:class:`Connection` is not meant to be instantiated by directly,
    :js:func:`connect` should be used instead.

    Every method of this class takes a *callback* of the form
    ``function(err, data)``.

    .. _edgedb-js-api-sync-optargs:

    .. note::

        Some methods take query arguments as optional *args*:

        * single values of any of the :ref:`basic types
          recognized<edgedb-js-datatypes>` by EdgeDB
        * an ``Array`` of values of any of the basic types
        * an ``object`` with property names and values corresponding to
          argument names and values of any of the basic types

    .. js:method:: execute(query: string, callback)

        Execute an EdgeQL command (or commands).

        The commands must take no arguments.

        Example:

        .. code-block:: js

            con.execute(`
                CREATE TYPE MyType {
                    CREATE PROPERTY a -> int64
                };
                FOR x IN {100, 200, 300}
                UNION INSERT MyType { a := x };
            `, (err, data) => {
                if (err) {
                    console.log('migration failed: ', err)
                } else {
                    console.log('migration complete');
                }
            })

    .. js:method:: fetchAll(query: string, args)

        Run a query and return the results as a
        :js:class:`Set` instance.

        This method takes :ref:`optional query arguments
        <edgedb-js-api-sync-optargs>`.

    .. js:method:: fetchOne(query: string, args, callback)

        Run a singleton-returning query and return its element.

        This method takes :ref:`optional query arguments
        <edgedb-js-api-sync-optargs>`.

        The *query* must return exactly one element.  If the query returns
        more than one element or an empty set, an ``Error`` is thrown.

    .. js:method:: fetchAllJSON(query: string, args, callback)

        Run a query and return the results as JSON.

        This method takes :ref:`optional query arguments
        <edgedb-js-api-sync-optargs>`.

        .. note::

            Caution is advised when reading ``decimal`` or ``bigint``
            values using this method. The JSON specification does not
            have a limit on significant digits, so a ``decimal`` or a
            ``bigint`` number can be losslessly represented in JSON.
            However, JSON decoders in JavaScript will often read all
            such numbers as ``number`` values, which may result in
            precision loss. If such loss is unacceptable, then
            consider casting the value into ``str`` and decoding it on
            the client side into a more appropriate type, such as
            BigInt_.

    .. js:method:: fetchOneJSON(query: string, args, callback)

        Run a singleton-returning query and return its element in JSON.

        This method takes :ref:`optional query arguments
        <edgedb-js-api-sync-optargs>`.

        The *query* must return exactly one element.  If the query returns
        more than one element or an empty set, an ``Error`` is thrown.

        .. note::

            Caution is advised when reading ``decimal`` or ``bigint``
            values using this method. The JSON specification does not
            have a limit on significant digits, so a ``decimal`` or a
            ``bigint`` number can be losslessly represented in JSON.
            However, JSON decoders in JavaScript will often read all
            such numbers as ``number`` values, which may result in
            precision loss. If such loss is unacceptable, then
            consider casting the value into ``str`` and decoding it on
            the client side into a more appropriate type, such as
            BigInt_.

    .. js:method:: close(callback)

        Close the connection gracefully and invoke the *callback*.

        :param callback:
            The *callback* to be invoked after closing the connection.


.. _BigInt:
    https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt


.. _edgedb-js-api-pool:

Pool
==========

.. js:function:: createPool(options)
                 createPool(options, callback)

    Create a connection pool to an EdgeDB server.

    :param options: Connection pool parameters object.

    :param ConnectConfig options.connectOptions:
        Connection parameters object, used when establishing new connections.
        Refer to the documentation at :ref:`edgedb-js-api-connection`.

    :param number options.minSize:
        The minimum number of connections initialized by the connection pool.
        If not specified, this value is by default 0: the first connection is
        created when required.

    :param number options.maxSize:
        The maximum number of connections created by the connection pool.
        If not specified, this value is by default 100.

    :param func options.onAcquire:
        Optional callback, called when a connection is acquired.
        *(proxy: PoolConnectionProxy) => Promise<void>*

    :param func options.onRelease:
        Optional callback, called when a connection is released.
        *(proxy: PoolConnectionProxy) => Promise<void>*

    :param func options.onConnect:
        Optional callback, called when a new connection is created.
        *(connection: AwaitConnection) => Promise<void>*

    :param func options.connectionFactory:
        Optional function, used to obtain a new connection. By default, the
        function is :js:func:`connect` *(options?: ConnectConfig) =>
        Promise<AwaitConnection>*

    :param callback:
        A callback function that will be invoked when the connection pool is
        ready. The callback function should be of the form ``function(error,
        pool)``. The *pool* is an instance of :js:class:`CallbackPool`.

    :returns:
        There are two ways of creating an EdgeDB connection pool: a
        Promise-based approach and a callback-based. When a *callback*
        argument is provided, the function does not return anything and instead
        uses the *callback* with an instance of :js:class:`CallbackPool`.
        Otherwise, a ``Promise`` of an :js:class:`Pool` is returned.

.. js:class:: Pool

    A connection pool is used to manage a set of connections to a database.
    Since opening connections is an expensive operation, connection pools are
    used to maintain and reuse connections, enhancing the performance of
    database interactions.

    Pools can be created using the method ``createPool``:

    .. code-block:: js

        const edgedb = require("edgedb");

        async function main() {
            const pool = await edgedb.createPool({
                connectOptions: {
                    user: "edgedb",
                    host: "127.0.0.1",
                },
            });

            try {
                let data = await pool.fetchOne("SELECT [1, 2, 3]");

                console.log(data);
            } finally {
                // in this example, the pool is closed after a single
                // operation; in real scenarios a pool is initialized
                // at application startup, and closed at application shutdown
                await pool.close();
            }
        }

        main();

    The pool accepts the following parameters:

    .. js:method:: execute(query: string)

        Acquire a connection, then execute an EdgeQL command (or commands).
        The commands must take no arguments.

        :param query: Query text.

        .. code-block:: js

            await pool.execute(`
                CREATE TYPE MyType {
                    CREATE PROPERTY a -> int64
                };
                FOR x IN {100, 200, 300}
                UNION INSERT MyType { a := x };
            `)

    .. js:method:: fetchAll(query: string, args)

        Acquire a connection, then run a query and return the results as a
        :js:class:`Set` instance.

        This method takes :ref:`optional query arguments
        <edgedb-js-api-sync-optargs>`.

        .. code-block:: js

            const items = await pool.fetchAll(
                `SELECT Movie {
                    title,
                    year,
                    director: {
                        first_name,
                        last_name
                    },
                    actors: {
                        first_name,
                        last_name
                    }
                }
                FILTER .id = <uuid>$id;`,
                {
                    id: movieId,
                }
            );

    .. js:method:: fetchOne(query: string, args)

        Acquire a connection, then run a query that returns a single item
        and return its result.

        This method takes :ref:`optional query arguments
        <edgedb-js-api-async-optargs>`.

        The *query* must return exactly one element.  If the query returns
        more than one element or an empty set, an ``Error`` is thrown.

        .. code-block:: js

            await pool.fetchOne("SELECT 1");

    .. js:method:: fetchAllJSON(query: string, args)

        Acquire a connection, then run a query and return the results as JSON.

        This method takes :ref:`optional query arguments
        <edgedb-js-api-async-optargs>`.

    .. js:method:: fetchOneJSON(query: string, args)

        Acquire a connection, then run a singleton-returning query and return
        its element in JSON.

        This method takes :ref:`optional query arguments
        <edgedb-js-api-async-optargs>`.

        The *query* must return exactly one element.  If the query returns
        more than one element or an empty set, an ``Error`` is thrown.

    .. js:method:: acquire()

        Acquire a connection proxy, which provides access to an open database
        connection. The proxy must be released to return the connection to the
        pool.

        Example:

        .. code-block:: js

            const connection = await pool.acquire();
            let value: number;

            try {
                value = await connection.fetchOne("select 1");
            } finally {
                await pool.release(connection);
            }

    .. js:method:: release(connectionProxy: PoolConnectionProxy)

        Release a previously acquired connection proxy, to return it to the
        pool.

    .. js:method:: run<T>(action: func)

        Acquire a connection and use it to run the given action that accepts
        a connection, and return *T*, which is any type returned by the user's
        defined function argument. The connection is automatically returned
        to the pool.

        Example:

        .. code-block:: js

            const result = await pool.run(async (connection) => {
                return await connection.fetchOne("SELECT 1");
            });
            expect(result).toBe(1);

    .. js:method:: getStats()

        Return information about the current state of the pool. Information
        include the number of currently open connections, and the number of
        pending consumers, awaiting for a connection to become available.

        Example:

        .. code-block:: js

            const stats = pool.getStats();
            const queueLength = stats.queueLength;
            const openConnections = stats.openConnections;

    .. js:method:: expireConnections()

        Expire all currently open connections.
        Cause all currently open connections to be replaced when they are
        acquired by the next *.acquire()* call.

    .. js:method:: close()

        Close the connection pool gracefully. When a connection pool is closed,
        all its underlying connections are awaited to complete their pending
        operations, then closed. A warning is produced if the pool takes more
        than 60 seconds to close.

    .. js:method:: terminate()

        Terminate all connections in the pool, closing all connections non
        gracefully. If the pool is already closed, return without doing
        anything.

.. _edgedb-js-api-callbackpool:

CallbackPool
============

.. js:class:: CallbackPool

    A :js:class:`CallbackPool` exposes a callback-based API, and can be created
    using the function :js:func:`createPool`, specifying a callback as second
    argument.

    Every method of this class takes a *callback* of the form
    ``function(err, data)``.

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

    .. js:method:: execute(query: string, callback)

        Acquire a connection and execute an EdgeQL command (or commands).

        The commands must take no arguments.

        Example:

        .. code-block:: js

            pool.execute(`
                CREATE TYPE MyType {
                    CREATE PROPERTY a -> int64
                };
                FOR x IN {100, 200, 300}
                UNION INSERT MyType { a := x };
            `, (err, data) => {
                if (err) {
                    console.log('migration failed: ', err)
                } else {
                    console.log('migration complete');
                }
            })

    .. js:method:: fetchAll(query: string, args)

        Acquire a connection and run a query and return the results as a
        :js:class:`Set` instance.

        This method takes :ref:`optional query arguments
        <edgedb-js-api-sync-optargs>`.

    .. js:method:: fetchOne(query: string, args, callback)

        Acquire a connection and run a singleton-returning query and return
        its element.

        This method takes :ref:`optional query arguments
        <edgedb-js-api-sync-optargs>`.

        The *query* must return exactly one element.  If the query returns
        more than one element or an empty set, an ``Error`` is thrown.

    .. js:method:: fetchAllJSON(query: string, args, callback)

        Acquire a connection and run a query and return the results as JSON.

        This method takes :ref:`optional query arguments
        <edgedb-js-api-sync-optargs>`.

    .. js:method:: fetchOneJSON(query: string, args, callback)

        Acquire a connection and run a singleton-returning query and return
        its element in JSON.

        This method takes :ref:`optional query arguments
        <edgedb-js-api-sync-optargs>`.

        The *query* must return exactly one element.  If the query returns
        more than one element or an empty set, an ``Error`` is thrown.

    .. js:method:: close(callback)

        Close the connection pool gracefully and invoke the *callback*.

        :param callback:
            The *callback* to be invoked after closing the connection.

    .. js:method:: acquire(callback)

        Acquire a connection proxy, which provides access to an open database
        connection. The proxy must be released to return the connection to the
        pool. Then invoke the *callback*.

        :param callback:
            The *callback* to be invoked after closing the connection.

    .. js:method:: release(proxy: CallbackPoolConnectionProxy, callback)

        Release a previously acquired connection proxy, to return it to the
        pool, and invoke the *callback*.

        :param callback:
            The *callback* to be invoked after closing the connection.

    .. js:method:: expireConnections()

        Expire all currently open connections.
        Cause all currently open connections to be replaced when they are
        acquired by the next *.acquire()* call.
