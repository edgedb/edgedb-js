.. _edgedb-js-api-reference:

===
API
===

.. _edgedb-js-api-client:


Client
======

.. js:function:: createClient( \
        options: string | ConnectOptions | null \
    ): Client

    Creates a new :js:class:`Client` instance.

    :param options:
        This is an optional parameter. When it is not specified the client
        will connect to the current EdgeDB Project instance.

        If this parameter is a string it can represent either a
        DSN or an instance name:

        * when the string does not start with ``edgedb://`` it is a
          :ref:`name of an instance <ref_reference_connection_instance_name>`;

        * otherwise it specifies a single string in the connection URI format:
          ``edgedb://user:password@host:port/database?option=value``.

          See the :ref:`Connection Parameters <ref_reference_connection>`
          docs for full details.

        Alternatively the parameter can be a ``ConnectOptions`` config;
        see the documentation of valid options below.

    :param string options.dsn:
        Specifies the DSN of the instance.

    :param string options.credentialsFile:
        Path to a file containing credentials.

    :param string options.host:
        Database host address as either an IP address or a domain name.

    :param number options.port:
        Port number to connect to at the server host.

    :param string options.user:
        The name of the database role used for authentication.

    :param string options.database:
        The name of the database to connect to.

    :param string options.password:
        Password to be used for authentication, if the server requires one.

    :param string options.tlsCAFile:
        Path to a file containing the root certificate of the server.

    :param boolean options.tlsSecurity:
        Determines whether certificate and hostname verification is enabled.
        Valid values are ``'strict'`` (certificate will be fully validated),
        ``'no_host_verification'`` (certificate will be validated, but
        hostname may not match), ``'insecure'`` (certificate not validated,
        self-signed certificates will be trusted), or ``'default'`` (acts as
        ``strict`` by default, or ``no_host_verification`` if ``tlsCAFile``
        is set).

    The above connection options can also be specified by their corresponding
    environment variable. If none of ``dsn``, ``credentialsFile``, ``host`` or
    ``port`` are explicitly specified, the client will connect to your
    linked project instance, if it exists. For full details, see the
    :ref:`Connection Parameters <ref_reference_connection>` docs.


    :param number options.timeout:
        Connection timeout in milliseconds.

    :param number options.waitUntilAvailable:
        If first connection fails, the number of milliseconds to keep retrying
        to connect (Defaults to 30 seconds). Useful if your development
        instance and app are started together, to allow the server time to
        be ready.

    :param number options.concurrency:
        The maximum number of connection the ``Client`` will create in it's
        connection pool. If not specified the concurrency will be controlled
        by the server. This is recommended as it allows the server to better
        manage the number of client connections based on it's own available
        resources.

    :returns:
        Returns an instance of :js:class:`Client`.

    Example:

    .. code-block:: js

        // Use the Node.js assert library to test results.
        const assert = require("assert");
        const edgedb = require("edgedb");

        async function main() {
          const client = edgedb.createClient();

          const data = await client.querySingle("select 1 + 1");

          // The result is a number 2.
          assert(typeof data === "number");
          assert(data === 2);
        }

        main();


.. js:class:: Client

    A ``Client`` allows you to run queries on an EdgeDB instance.

    Since opening connections is an expensive operation, ``Client`` also
    maintains a internal pool of connections to the instance, allowing
    connections to be automatically reused, and you to run multiple queries
    on the client simultaneously, enhancing the performance of
    database interactions.

    :js:class:`Client` is not meant to be instantiated directly;
    :js:func:`createClient` should be used instead.


    .. _edgedb-js-api-async-optargs:

    .. note::

        Some methods take query arguments as an *args* parameter. The type of
        the *args* parameter depends on the query:

        * If the query uses positional query arguments, the *args* parameter
          must be an ``array`` of values of the types specified by each query
          argument's type cast.
        * If the query uses named query arguments, the *args* parameter must
          be an ``object`` with property names and values corresponding to
          the query argument names and type casts.

        If a query argument is defined as ``optional``, the key/value can be
        either omitted from the *args* object or be a ``null`` value.

    .. js:method:: execute(query: string): Promise<void>

        Execute an EdgeQL command (or commands).

        :param query: Query text.

        This commands takes no arguments.

        Example:

        .. code-block:: js

            await client.execute(`
                CREATE TYPE MyType {
                    CREATE PROPERTY a -> int64
                };

                for x in {100, 200, 300}
                union (insert MyType { a := x });
            `)

    .. js:method:: query<T>(query: string, args?: QueryArgs): Promise<T[]>

        Run a query and return the results as an array. This method **always**
        returns an array.

        This method takes :ref:`optional query arguments
        <edgedb-js-api-async-optargs>`.

    .. js:method:: querySingle<T>( \
            query: string, \
            args?: QueryArgs \
        ): Promise<T | null>

        Run an optional singleton-returning query and return the result.

        This method takes :ref:`optional query arguments
        <edgedb-js-api-async-optargs>`.

        The *query* must return no more than one element. If the query returns
        more than one element, a ``ResultCardinalityMismatchError`` error is
        thrown.

    .. js:method:: queryRequiredSingle<T>( \
            query: string, \
            args?: QueryArgs \
        ): Promise<T>

        Run a singleton-returning query and return the result.

        This method takes :ref:`optional query arguments
        <edgedb-js-api-async-optargs>`.

        The *query* must return exactly one element. If the query returns
        more than one element, a ``ResultCardinalityMismatchError`` error is
        thrown. If the query returns an empty set, a ``NoDataError`` error is
        thrown.

    .. js:method:: queryJSON(query: string, args?: QueryArgs): Promise<string>

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

    .. js:method:: querySingleJSON( \
            query: string, \
            args?: QueryArgs \
        ): Promise<string>

        Run an optional singleton-returning query and return its element
        in JSON.

        This method takes :ref:`optional query arguments
        <edgedb-js-api-async-optargs>`.

        The *query* must return at most one element.  If the query returns
        more than one element, an ``ResultCardinalityMismatchError`` error
        is thrown.

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

    .. js:method:: queryRequiredSingleJSON( \
            query: string, \
            args?: QueryArgs \
        ): Promise<string>

        Run a singleton-returning query and return its element in JSON.

        This method takes :ref:`optional query arguments
        <edgedb-js-api-async-optargs>`.

        The *query* must return exactly one element.  If the query returns
        more than one element, a ``ResultCardinalityMismatchError`` error
        is thrown. If the query returns an empty set, a ``NoDataError`` error
        is thrown.

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

    .. js:method:: transaction<T>( \
            action: (tx: Transaction) => Promise<T> \
        ): Promise<T>

        Execute a retryable transaction. The ``Transaction`` object passed to
        the action function has the same ``execute`` and ``query*`` methods
        as ``Client``.

        This is the preferred method of initiating and running a database
        transaction in a robust fashion.  The ``transaction()`` method
        will attempt to re-execute the transaction body if a transient error
        occurs, such as a network error or a transaction serialization error.
        The number of times ``transaction()`` will attempt to execute the
        transaction, and the backoff timeout between retries can be
        configured with :js:meth:`Client.withRetryOptions`.

        See :ref:`edgedb-js-api-transaction` for more details.

        Example:

        .. code-block:: js

            await client.transaction(async tx => {
              const value = await tx.querySingle("select Counter.value")
              await tx.execute(
                `update Counter set { value := <int64>$value }`,
                {value: value + 1},
              )
            });

        Note that we are executing queries on the ``tx`` object rather
        than on the original ``client``.

    .. js:method:: ensureConnected(): Promise<Client>

        If the client does not yet have any open connections in its pool,
        attempts to open a connection, else returns immediately.

        Since the client lazily creates new connections as needed (up to the
        configured ``concurrency`` limit), the first connection attempt will
        only occur when the first query is run a client. ``ensureConnected``
        can be useful to catch any errors resulting from connection
        mis-configuration by triggering the first connection attempt
        explicitly.

        Example:

        .. code-block:: js

            import {createClient} from 'edgedb';

            async function getClient() {
              try {
                return await createClient('custom_instance').ensureConnected();
              } catch (err) {
                // handle connection error
              }
            }

            function main() {
              const client = await getClient();

              await client.query('select ...');
            }

    .. js:method:: withRetryOptions(opts: { \
            attempts?: number \
            backoff?: (attempt: number) => number \
        }): Client

        Returns a new ``Client`` instance with the specified retry attempts
        number and backoff time function (the time that retrying methods will
        wait between retry attempts, in milliseconds), where options not given
        are inherited from the current client instance.

        The default number of attempts is ``3``. The default backoff
        function returns a random time between 100 and 200ms multiplied by
        ``2 ^ attempt number``.

        .. note::

            The new client instance will share the same connection pool as the
            client it's created from, so calling the ``ensureConnected``,
            ``close`` and ``terminate`` methods will affect all clients
            sharing the pool.

        Example:

        .. code-block:: js

            import {createClient} from 'edgedb';

            function main() {
              const client = createClient();

              // By default transactions will retry if they fail
              await client.transaction(async tx => {
                // ...
              });

              const nonRetryingClient = client.withRetryOptions({
                attempts: 1
              });

              // This transaction will not retry
              await nonRetryingClient.transaction(async tx => {
                // ...
              });
            }

    .. js:method:: close(): Promise<void>

        Close the client's open connections gracefully. When a client is
        closed, all its underlying connections are awaited to complete their
        pending operations, then closed. A warning is produced if the pool
        takes more than 60 seconds to close.

        .. note::

            Clients will not prevent Node.js from exiting once all of it's
            open connections are idle and Node.js has no further tasks it is
            awaiting on, so it is not necessary to explicitly call ``close()``
            if it is more convenient for your application.

            (This does not apply to Deno, since Deno is missing the
            required API's to ``unref`` idle connections)

    .. js:method:: isClosed(): boolean

        Returns true if ``close()`` has been called on the client.

    .. js:method:: terminate(): void

        Terminate all connections in the client, closing all connections non
        gracefully. If the client is already closed, return without doing
        anything.


.. _BigInt:
    https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt
