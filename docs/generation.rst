.. _edgedb-js-generators:

Generators
==========

The ``@edgedb/generate`` package provides a set of code generation tools that
are useful when developing an EdgeDB-backed applications with
TypeScript/JavaScript.

**Official generators**

- ``queries``: Scans your project for ``*.edgeql`` files and generates a file
  containing a strongly-typed function alongside each. Alternatively you can use
  ``--file`` mode to generate a single file containing all the query functions.
- ``edgeql-js``: Introspects your database schema and generates a query builder.
- ``interfaces``: Introspects your database schema and generates a set of
  equivalent TypeScript interfaces.

**Third party generators**

If you implement a code generator, submit a PR and we'll list it here! The
``edgedb`` package exports a ``$`` namespace containing some utilities for
introspecting the schema and analyzing queries. We use these same tools to
implement the official generators.

To get started with generators, first initialize an :ref:`EdgeDB project
<ref_guide_using_projects>` in the root of your application. Generators will
look for an ``edgedb.toml`` file to determine the root of your application. See
the :ref:`Overview <edgedb-js-installation>` page for details on installing

Run a generator with the following command.

.. tabs::

  .. code-tab:: bash
    :caption: npm

    $ npx @edgedb/generate <generator> [options]

  .. code-tab:: bash
    :caption: yarn

    $ yarn run -B generate <generator> [options]

  .. code-tab:: bash
    :caption: pnpm

    $ pnpm exec generate <generator> [options]

  .. code-tab:: bash
    :caption: Deno

    $ deno run \
      --allow-all \
      --unstable \
      https://deno.land/x/edgedb/generate.ts <generator> [options]

Connection
^^^^^^^^^^

Generating the query builder requires a connection to an active EdgeDB database.
It does **not** simply read your local ``.esdl`` schema files. Generators rely
on the database to introspect the schema and analyze queries. Doing so without a
database connection would require implementing a full EdgeQL parser and static
analyzer in JavaScript—which we don't intend to do anytime soon.

.. note::

  Make sure your development database is up-to-date with your latest schema
  before running a generator!

If you're using ``edgedb project init``, this is automatically handled for you.
Otherwise, you'll need to explicitly pass connection information via environment
variables or CLI flags, just like any other CLI command. See :ref:`Client
Libraries > Connection <edgedb_client_connection>` for guidance.

.. _edgedb_qb_target:

Targets
^^^^^^^

All generators look at your environment and guess what kind of files to generate
(``.ts`` vs ``.js + .d.ts``) and what module system to use (CommonJS vs ES
modules). You can override this with the ``--target`` flag.

.. list-table::

  * - ``--target ts``
    - Generate TypeScript files (``.ts``)
  * - ``--target mts``
    - Generate TypeScript files (``.mts``) with extensioned ESM imports
  * - ``--target esm``
    - Generate ``.js`` with ESM syntax and ``.d.ts`` declaration files
  * - ``--target cjs``
    - Generate JavaScript with CommonJS syntax and and ``.d.ts`` declaration
      files
  * - ``--target deno``
    - Generate TypeScript files with Deno-style ESM imports

Help
^^^^

To see helptext for the ``@edgedb/generate`` command, run the following.

.. code-block:: bash

  $ npx @edgedb/generate --help
