
.. _edgedb-js-generation:

Generation
==========

The query builder is *auto-generated* by introspecting the schema of your database.

Minimum requirements
^^^^^^^^^^^^^^^^^^^^

It's possible to use the query builder with or without TypeScript. Some
requirements apply to TypeScript users only.

- Node.js 12+. Run ``node --version`` to see your current version. TypeScript
  users should also install Node.js typing: ``npm install @types/node``.
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

When developing locally, we recommend initializing an :ref:`EdgeDB project
<ref_guide_using_projects>` for your application. Follow the :ref:`Quickstart
<ref_quickstart>` for detailed instructions on installing the CLI,
initializing a project, writing a basic schema, and executing your first
migration.

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

You'll see something similar to this. (The first line will differ depending on
whether you are using TypeScript or plain JavaScript.)

.. code-block:: bash

  $ npx edgeql-js
  Detected tsconfig.json, generating TypeScript files.
    To override this, use the --target flag.
    Run `npx edgeql-js --help` for details.
  Generating query builder into ./dbschema/edgeql-js
  Connecting to EdgeDB instance...
  Introspecting database schema...
  Generation successful!

**Important**. The ``npx edgeql-js`` establishes a connection to your database, introspects the current schema, and generates a bunch of files. It does **not** simply read your local ``.esdl`` files. You must create and apply migrations to your development database before running ``npx edgeql-js``.

.. note::

  Generating the query builder requires establishing a
  connection to an active EdgeDB instance. Remember that object types can
  contain computed fields that correspond to arbitrary EdgeQL queries. It
  isn't possible to determine the type and cardinality of these queries
  without implementing a full EdgeQL parser and static analyzer in JavaScript,
  which is not on our roadmap (to put it lightly!). As such, we rely on the
  existence of an active EdgeDB instance containing the target schema.

By default, ``npx edgeql-js`` generated files into the
``./dbschema/edgeql-js`` directory, as defined relative to your project root.
The project root is identified by scanning up the file system for a
``package.json``.

.. note::

  **Connection issue?**

  This command must be able to connect to a running EdgeDB instance. If you're
  using ``edgedb project init``, this is automatically handled for you.
  Otherwise, you'll need to explicitly pass connection information, just like
  any other CLI command. See :ref:`Client Libraries > Connection
  <edgedb_client_connection>` for guidance.


.. _edgedb_qb_target:

Targets
^^^^^^^

The generation command looks at your environment and guesses what kind of
files to generate (``.ts`` vs ``.js + .d.ts``) and what module system to use
(CommonJS vs ES modules). You can override this with the ``--target`` flag.

.. list-table::

  * - ``--target ts``
    - Generate TypeScript files (.ts)
  * - ``--target mts``
    - Generate TypeScript files (.mts) with extensioned ESM imports
  * - ``--target esm``
    - Generate ``.js`` with ESM syntax and ``.d.ts`` declaration files
  * - ``--target cjs``
    - Generate JavaScript with CommonJS syntax and and ``.d.ts`` declaration
      files

Version control
^^^^^^^^^^^^^^^

The first time you run the command, you'll be prompted to add the generated
files to your ``.gitignore``. Confirm this prompt, and a line will be
automatically added to your ``.gitignore`` to exclude the generated files from
Git.

.. code-block:: bash

  $ npx edgeql-js
  ...
  Checking the generated query builder into version control
  is NOT RECOMMENDED. Would you like to update .gitignore to ignore
  the query builder directory? The following line will be added:

  dbschema/edgeql-js

  [y/n] (leave blank for "y")

For consistency, we recommend omitting the generated files from version
control and re-generating them as part of your deployment process. However,
there may be circumstances where checking the generated files into version
control is desirable, e.g. if you are building Docker images that must contain
the full source code of your application.

Importing
^^^^^^^^^

Once the query builder is generated, it's ready to use! Just import it and
start building queries.

.. code-block:: typescript

  // TypeScript
  import e from "./dbschema/edgeql-js";

  // TypeScript with ESM


  // JavaScript (CommonJS)
  const e = require("./dbschema/edgeql-js");

  // JavaScript (ES modules)
  import e from "./dbschema/edgeql-js/index.mjs";

.. note::

  If you're using ES modules, remember that imports require a file extension.
  The rest of the documentation assumes you are using TypeScript-style
  (extensionless) ``import`` syntax.

Here's a full "Hello world" example.

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

``--target <ts|cjs|esm|mts>``
  What type of files to generate. Documented above.

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


Naming conflicts
^^^^^^^^^^^^^^^^

Certain link/property names will create conflicts with parts of the query
builder API. Avoid using the following names in your schema.

- ``filter``
- ``order_by``
- ``limit``
- ``offset``
- ``run``
- ``is``
- ``index``
- ``slice``
- ``destructure``


Generated interfaces
^^^^^^^^^^^^^^^^^^^^

While the ``e`` object is all that's required to build queries,
``npx edgeql-js`` also generates TypeScript ``interfaces`` representing your
current schema. These are not needed to construct queries, but are generated
as a convenience.

.. code-block:: typescript

  import e, {Person, Movie} from "./dbschema/edgeql-js";


Given this EdgeDB schema:

.. code-block:: sdl

  module default {
    scalar type Genre extending enum<Horror, Comedy, Drama>;
    type Person {
      required property name -> str;
    }
    type Movie {
      required property title -> str;
      property genre -> Genre;
      multi link actors -> Person;
    }
  }

The following interfaces will be generated (simplified for clarify):

.. code-block:: typescript

  enum Genre {
    Horror = "Horror",
    Comedy = "Comedy",
    Drama = "Drama"
  }

  interface Person {
    id: string;
    name: string;
  }

  interface Movie {
    id: string;
    title: string;
    genre?: Genre | null;
    actors: Person[];
  }

Any types declared in a non-``default`` module  will be generated into an
accordingly named ``namespace``.
