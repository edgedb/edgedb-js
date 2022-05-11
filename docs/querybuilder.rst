=============
Query Builder
=============

The EdgeDB query builder provides a **code-first** way to write
**fully-typed** EdgeQL queries with TypeScript. We recommend it for TypeScript
users, or anyone who prefers writing queries with code.

.. code-block:: typescript

  const query = e.select(e.Movie, ()=>({
    id: true,
    title: true,
    actors: { name: true }
  }));

  const result = await query.run(client)
  // { id: string; title: string; actors: {name: string}[] }[]

Why use the query builder?
--------------------------

*Type inference!* If you're using TypeScript, the result type of *all
queries* is automatically inferred for you. For the first time, you don't
need an ORM to write strongly typed queries.

*Auto-completion!* You can write queries full autocompletion on EdgeQL
keywords, standard library functions, and link/property names.

*Type checking!* In the vast majority of cases, the query builder won't let
you construct invalid queries. This eliminates an entire class of bugs and
helps you write valid queries the first time.


Getting started
---------------

Initialize a project
^^^^^^^^^^^^^^^^^^^^

If you haven't already, initialize a project, write your schema, and create/
apply a migration. Follow the :ref:`Quickstart <ref_quickstart>` for a guided
walkthrough of this process.

The rest of this walkthrough uses the following simple Movie schema:

.. code-block:: sdl

  type Movie {
    required property title -> str { constraint exclusive; };
    property release_year -> int64;
    multi link actors -> Person;
  }

  type Person {
    required property name -> str;
  }


Generate the query builder
^^^^^^^^^^^^^^^^^^^^^^^^^^

Use ``npx`` to generate the query builder.

.. code-block:: bash

  $ npx edgeql-js

This detects whether you're using JavaScript or TypeScript and generates the
appropriate files into the ``dbschema/edgeql-js`` directory. For this
tutorial, we'll assume you're using TypeScript.

.. note::

  The first time you generate the query builder you'll be prompted to add the
  generated files to your ``.gitignore``. If you confirm this prompt, we'll
  add the the line automatically.

If you're having trouble with this step, refer to the :ref:`Generation
<edgedb-js-generation>` docs for more information, then return to this
tutorial.


Import the query builder
^^^^^^^^^^^^^^^^^^^^^^^^
Create a TypeScript file called ``script.ts`` (the name doesn't matter) and
import the query builder like so:

.. code-block:: typescript

  // script.ts
  import e from "./dbschema/edgeql-js";

Create a client
^^^^^^^^^^^^^^^

The query builder is only used to *write* queries, not execute them. To
execute queries, we still need a *client* that manages the actual connection
to our EdgeDB instance.

.. code-block:: typescript-diff

    // script.ts
  + import {createClient} from "edgedb";
    import e from "./dbschema/edgeql-js";

  + const client = createClient();


If you've initialized a project, there's no need to provide connection
information to ``createClient``—it will connect to your project-linked
instance by default. You can override this by setting the value of the
``EDGEDB_DSN`` environment variable; refer to the :ref:`Connection docs
<edgedb_client_connection>` for more information.

Write a query
^^^^^^^^^^^^^

Now we have everything we need to write our first query!

.. code-block:: typescript-diff

    // script.ts
    import {createClient} from "edgedb";
    import e from "./dbschema/edgeql-js";

    const client = createClient();

  + async function run() {
  +   // select datetime_current();
  +   const query = e.select(e.datetime_current());
  +   const result = await query.run(client);
  +   console.log(result);
  + }
  + run();

We use the ``e`` object to construct queries. The goal of the query builder is
to provide an API that is as close as possible to EdgeQL itself. So
``select datetime_current()`` becomes ``e.select(e.datetime_current()``. This
query is then executed with the ``.run()`` method which accepts a *client* as
it's first input.

Run that script with the ``esbuild-runner`` like so. It should print the
current timestamp (as computed by the database).

.. code-block:: bash

  $ npx esbuild-runner script.ts
  2022-05-10T03:11:27.205Z

Cheatsheet
----------

Below is a set of examples to get you started with the query builder. It is
not intended to be comprehensive, but it should provide a good starting point.

.. note::

  Modify the examples below to fit your schema, paste them into ``script.ts``,
  and execute them with the ``npx`` command from the previous section! Note
  how the signature of ``result`` changes as you modify the query.

Insert an object
^^^^^^^^^^^^^^^^

.. code-block:: typescript

  const query = e.insert(e.Movie, {
    title: 'Doctor Strange 2',
    release_year: 2022
  });

  const result = await query.run(client);
  // {id: string}
  // by default INSERT only returns
  // the id of the new object


Select objects
^^^^^^^^^^^^^^

.. code-block:: typescript

  const query = e.select(e.Movie, () => ({
    id: true,
    title: true,
  }));

  const result = await query.run(client);
  // Array<{id: string; title: string}>

To select all properties of an object, use the spread operator with the
special ``*`` property:

.. code-block:: typescript

  const query = e.select(e.Movie, () => ({
    ...e.Movie['*']
  }));

  const result = await query.run(client);
  /* Array{
    id: string;
    title: string;
    release_year: number | null;  # optional property
  }> */

Nested shapes
^^^^^^^^^^^^^

.. code-block:: typescript

  const query = e.select(e.Movie, () => ({
    id: true,
    title: true,
    actors: {
      name: true,
    }
  }));

  const result = await query.run(client);
  // Array<{id: string; title: string, actors: Array<{name: string}>}>

Filtering, ordering, and pagination
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

The special keys ``filter``, ``order_by``, ``limit``, and ``offset``
correspond to equivalent EdgeQL clauses.

.. code-block:: typescript

  const query = e.select(e.Movie, (movie) => ({
    id: true,
    title: true,
    filter: e.op(movie.release_year, ">", 1999),
    order_by: movie.title,
    limit: 10,
    offset: 10
  }));

  const result = await query.run(client);
  // Array<{id: string; title: number}>

.. note::

  The filter expression above uses ``e.op`` function, which is how to use
  *operators* like ``=``, ``>=``, ``++``, and ``and``.


Select a single object
^^^^^^^^^^^^^^^^^^^^^^

Filter by a property with an *exclusive constraint* to fetch a particular
object.

.. code-block:: typescript

  const query = e.select(e.Movie, (movie) => ({
    id: true,
    title: true,
    release_year: true,

    // filter .id = '2053a8b4-49b1-437a-84c8-e1b0291ccd9f'
    filter: e.op(movie.id, '=', '2053a8b4-49b1-437a-84c8-e1b0291ccd9f'),
  }));

  const result = await query.run(client);
  // {id: string; title: string; release_year: number | null}

Note that ``result`` is now a single object, not a list of objects. The query
builder detects when you are filtering on a property with an exclusive
constraint.

Update objects
^^^^^^^^^^^^^^

.. code-block:: typescript

  const query = e.update(e.Movie, (movie) => ({
    filter: e.op(movie.title, '=', 'Doctor Strange 2'),
    set: {
      title: 'Doctor Strange in the Multiverse of Madness',
    },
  }));

  const result = await query.run(client);

Delete objects
^^^^^^^^^^^^^^

.. code-block:: typescript

  const query = e.delete(e.Movie, (movie) => ({
    filter: e.op(movie.title, 'ilike', "the avengers%"),
  }));

  const result = await query.run(client);
  // Array<{id: string}>

Query parameters
^^^^^^^^^^^^^^^^

.. code-block:: typescript

  const query = e.params({
    title: e.str,
    release_year: e.int64,
  },
  (params) => {
    return e.insert(e.Movie, {
      title: params.title,
      release_year: params.release_year,
    }))
  };

  const result = await query.run(client, {
    title: 'Thor: Love and Thunder',
    release_year: 2022,
  });
  // {id: string}

.. note::

  Continue reading for more complete documentation on how to express any
  EdgeQL query with the query builder.
