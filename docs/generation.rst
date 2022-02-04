.. _edgedb-js-generation:

Generation
==========

The query builder is *auto-generated* from your database schema.

Minimum requirements
^^^^^^^^^^^^^^^^^^^^

It's possible to use the query builder with or without TypeScript. Some requirements apply to TypeScript users only.

- Node.js 10+. Run ``node --version`` to see your current version. TypeScript users should also install Node.js typing: ``npm install @types/node``
- TypeScript 4.4+
- Make sure the following ``compilerOptions`` exist in your ``tsconfig.json``:

  .. code-block:: javascript

    // tsconfig.json
    {
      // ...
      "compilerOptions": {
        // ...
        "strict": true,
        "downlevelIteration": true,
      }
    }

Initialize a project
^^^^^^^^^^^^^^^^^^^^

Set up an :ref:`EdgeDB project <ref_guide_using_projects>` for your application. Follow the :ref:`Quickstart <ref_quickstart>` for detailed instructions on installing the CLI, initializing a project, writing a basic schema, and executing your first migration.

Install the JavaScript client library
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Install the ``edgedb`` package from NPM.

.. code-block:: bash

  $ npm install edgedb       # npm users
  $ yarn add edgedb          # yarn users

Generate the query builder
^^^^^^^^^^^^^^^^^^^^^^^^^^

Generate the query builder with the following command.

.. code-block:: bash

  $ npx edgeql-js           # npm users
  $ yarn edgeql-js          # yarn users

You'll see something like this.

.. code-block:: bash

  $ npx edgeql-js
  Detected tsconfig.json, generating TypeScript files.
    To override this, use the --target flag.
    Run `npx edgeql-js --help` for details.
  Generating query builder into ./dbschema/edgeql-js
  Connecting to EdgeDB instance...
  Introspecting database schema...
  Generation successful!

The ``npx edgeql-js`` establishes a connection to your database, introspects the current schema, and generates a bunch of files. By default, these files are written to the ``./dbschema/edgeql-js`` directory, as
defined relative to your project root. The project root is identified by
scanning up the file system for a ``package.json``.


.. note::

  **Connection issue?**

  This command must be able to connect to a running EdgeDB instance. If you're using ``edgedb project init``, this is automatically handled for you. Otherwise, you'll need to explicitly pass connection information, just like any other CLI command. See :ref:`Client Libraries > Connection <edgedb_client_connection>` for guidance.

Version control
^^^^^^^^^^^^^^^

The first time you run the command, you'll be prompted to add the generated files to your ``.gitignore``. Confirm this prompt, and a line will be automatically added to your ``.gitignore`` to exclude the generated files from Git.

.. code-block:: bash

  $ npx edgeql-js
  ...
  Checking the generated query builder into version control
  is NOT RECOMMENDED. Would you like to update .gitignore to ignore
  the query builder directory? The following line will be added:

    dbschema/edgeql-js

  [y/n] (leave blank for "y")


Importing
^^^^^^^^^

Once the query builder is generated, it's ready to use! Just import it and start building queries. Below is a full "Hello world" example.

.. code-block:: typescript

  import * as edgedb from "edgedb";
  import e from "./dbschema/edgeql-js";

  const client = edgedb.createClient();

  async function run(){
    // declare a simple query
    const myQuery = e.str("Hello world!");

    // execute the expression
    const result = await myQuery.run(client);

    // print the result
    console.log(result); // "Hello world!"
  }

Configuring ``npx edgeql-js``
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

The generation command is configurable in a number of ways.

``--output-dir <path>``
  Sets the output directory for the generated files.

``--target <ts|cjs|esm>``
  What type of files to generate.

  .. list-table::

    * - ``ts``
      - Generate TypeScript
    * - ``cjs``
      - Generate JavaScript with CommonJS (``require/module.exports``) syntax
    * - ``esm``
      - Generate JavaScript with ES Module (``import/export``) syntax

  The default is determined according the the following simple algorithm:

  1. Check for a ``tsconfig.json`` in the project root. If it exists, use ``--target ts``.
  2. Otherwise. check if ``package.json`` includes ``"type": "module"``. If so, use ``--target esm``.
  3. Otherwise, use ``--target cjs``.


``--force-overwrite``
  To avoid accidental changes, you'll be prompted to confirm whenever the
  ``--target`` has changed from the previous run. To avoid this prompt, pass
  ``--force-overwrite``.

``-h/--help``
  Prints full documentation.

The generator also supports all the :ref:`connection flags
<ref_cli_edgedb_connopts>` supported by the EdgeDB CLI. These aren't
necessary when using a project or environment variables to configure a
connection.
