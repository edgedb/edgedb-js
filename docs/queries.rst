.. _edgedb-js-queries:

=================
Queries Generator
=================

The ``queries`` generator scans your project for ``*.edgeql`` files and generates functions that allow you to execute these queries in a typesafe way.

Installation
------------

To get started, install the following packages.

.. note::

  If you're using Deno, you can skip this step.

Install the ``edgedb`` package.

.. code-block:: bash

  $ npm install edgedb       # npm users
  $ yarn add edgedb          # yarn users

Then install ``@edgedb/generate`` as a dev dependency.

.. code-block:: bash

  $ npm install @edgedb/generate --save-dev      # npm users
  $ yarn add @edgedb/generate --dev              # yarn users


Generation
----------

Consider the following file tree.

.. code-block:: text

  .
  ├── package.json
  ├── edgedb.toml
  ├── index.ts
  ├── dbschema
  └── queries
      └── getUser.edgeql


The following command will run the ``queries`` generator.

.. tabs::

  .. code-tab:: bash
    :caption: Node.js

    $ npx @edgedb/generate queries

  .. code-tab:: bash
    :caption: Deno

    $ deno run --allow-all --unstable https://deno.land/x/edgedb/generate.ts queries

The generator will detect the project root by looking for an ``edgedb.toml``,
then scan the directory for ``*.edgeql`` files. In this case, there's only one:
``queries/getUser.edgeql``.

.. code-block:: text

  select User { name, email } filter .id = <uuid>$user_id;

For each ``.edgeql`` file, the generator will read the contents and send the
query to the database, which returns type information about its parameters and
return type. The generator uses this information to create a new file
``getUser.query.ts`` alongside the original ``getUser.edgeql`` file.

.. code-block:: text

  .
  ├── package.json
  ├── edgedb.toml
  ├── index.ts
  ├── dbschema
  └── queries
      └── getUser.edgeql
      └── getUser.query.ts    <-- generated file


.. note::

  This example assumes you are using TypeScript. The generator tries to
  auto-detect the language you're using; you can also specify the language with
  the ``--target`` flag. See the :ref:`Targets <edgedb_qb_target>` section for
  more information.

The generated file will look something like this:

.. code-block:: typescript

  import type {Client} from "edgedb";

  export async function getUser(
    client: Client,
    params: { user_id: string }
  ): Promise<{ name: string, email: string } | null> {
    return await client.querySingle(
      `select User { name, email } filter .id = <uuid>$user_id;`,
      params
    );
  }

Some things to note:

- The first argument is a ``Client`` instance. This is the same client you would use to execute a query manually. You can use the same client for both manual and generated queries.
- The second argument is a parameter object. The keys of this object are the names of the parameters in the query.
- The code uses the ``querySingle`` method, since the query is only expected to return a single result.

We can now use this function in our code.

.. code-block:: typescript

  import {getUser} from "./queries/getUser.query";
  import {createClient} from "edgedb";

  const client = await createClient();

  const user = await getUser(client, {
    user_id: "00000000-0000-0000-0000-000000000000"
  });


  user.name; // string
  user.email; // string


Single-file mode
----------------

Pass the ``--file`` flag to generate a single file that contains functions for all detected ``.edgeql`` files. This lets you import all your queries from a single file.

Let's say we start with the following file tree.

.. code-block:: text

  .
  ├── package.json
  ├── edgedb.toml
  ├── index.ts
  ├── dbschema
  └── queries
      └── getUser.edgeql
      └── getMovies.edgeql

The following command will run the generator in ``--file`` mode.

.. code-block:: bash

  $ npx @edgedb/generate queries --file

A single file will be generated that exports two functions, ``getUser`` and ``getMovies``. By default this file is generated into the ``dbschema`` directory.

.. code-block:: text

  .
  ├── package.json
  ├── edgedb.toml
  ├── index.ts
  ├── dbschema
  │   └── queries.ts  <-- generated file
  └── queries
      └── getUser.edgeql
      └── getMovies.edgeql


We can now use these functions in our code.

.. code-block:: typescript

  import * as queries from "./dbschema/queries";
  import {createClient} from "edgedb";

  const client = await createClient();

  const movies = await queries.getMovies(client);
  const user = await queries.getUser(client, {
    user_id: "00000000-0000-0000-0000-000000000000"
  });

To override the file path and name, you can optionally pass a value to the ``--file`` flag. Note that you should *exclude the extension*.

.. code-block:: bash

  $ npx @edgedb/generate queries --file path/to/myqueries

The file extension is determined by the generator ``--target`` and will be automatically appended to the provided path. Extensionless "absolute" paths will work; relative paths will be resolved relative to the current working directory.

This will result in the following file tree.

.. code-block:: text

  .
  ├── package.json
  ├── edgedb.toml
  ├── path
  │   └── to
  │       └── myqueries.ts
  ├── queries
  │   └── getUser.edgeql
  │   └── getMovies.edgeql
  └── index.ts

Version control
---------------

To exclude the generated files, add the following lines to your ``.gitignore`` file.

.. code-block:: text

  **/*.edgeql.ts
  dbschema/queries.*
