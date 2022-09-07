.. _edgedb-js-qb:

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

*Why use the query builder?*

*Type inference!* If you're using TypeScript, the result type of *all
queries* is automatically inferred for you. For the first time, you don't
need an ORM to write strongly typed queries.

*Auto-completion!* You can write queries full autocompletion on EdgeQL
keywords, standard library functions, and link/property names.

*Type checking!* In the vast majority of cases, the query builder won't let
you construct invalid queries. This eliminates an entire class of bugs and
helps you write valid queries the first time.

Requirements
------------

The query builder works for both JavaScript and TypeScript users, and supports both Node.js and Deno. It's possible to use the query builder with or without TypeScript. Some
requirements apply to TypeScript users only.

- Node: ``v14+``. Run ``node --version`` to see your current version.
- Deno: ``v0.20+``.
- TypeScript: ``v4.4+``.

  - Node users: install Node.js types with ``npm install @types/node``.
  - Make sure the following ``compilerOptions`` exist in your ``tsconfig.json``

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


Quickstart
----------

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

With Node.js, use ``npx`` to generate the query builder.

.. code-block:: bash

  $ npx edgeql-js

With Deno, use ``deno run``. *Deno user must also create an import map, see "Deno usage" below.*

.. code-block:: bash

  $ deno run https://deno.land/x/edgedb/generate.ts

This detects whether you're using TypeScript or JavaScript and generates the
appropriate files into the ``dbschema/edgeql-js`` directory. Refer to the
:ref:`Targets <edgedb_qb_target>` section to learn how to customize this.

.. note::

  If you're seeing a connection error or another issue, refer to the
  :ref:`Generation <edgedb-js-generation>` docs for more complete
  documentation, then return to this tutorial.

The first time you generate the query builder you'll be prompted to add the
generated files to your ``.gitignore``. Confirm this prompt to
add the the line automatically.

.. code-block:: bash

  $ npx edgeql-js
  ...
  Checking the generated query builder into version control
  is NOT RECOMMENDED. Would you like to update .gitignore to ignore
  the query builder directory? The following line will be added:

  dbschema/edgeql-js

  [y/n] (leave blank for "y")

**Deno usage**

The query builder generates code that depends on the ``edgedb`` module. The generated code imports using a plain module name (``import {createClient} from "edgedb"``). You must configure an import map to tell Deno how to resolve this import.

In your ``deno.json``

.. code-block:: json

  {
    // ...
    "importMap": "./import_map.json"
  }

Then create ``import_map.json`` with the following contents. Both lines must be present.

.. code-block:: json

  {
    "imports": {
      "edgedb": "https://deno.land/x/edgedb/mod.ts",
      "edgedb/": "https://deno.land/x/edgedb/"
    }
  }

Optionally, you can specify a version:

.. code-block:: json

  {
    "imports": {
      "edgedb": "https://deno.land/x/edgedb@v0.22.0/mod.ts",
      "edgedb/": "https://deno.land/x/edgedb@v0.22.0/"
    }
  }


Import the query builder
^^^^^^^^^^^^^^^^^^^^^^^^

Create a TypeScript file called ``script.ts`` (the name doesn't matter) and import the query builder. We recommend importing the query builder as a single default import called ``e``.

.. code-block:: typescript

  // script.ts
  import e from "./dbschema/edgeql-js";


Create a client
^^^^^^^^^^^^^^^

The query builder is only used to *write* queries, not execute them. To
execute queries, we still need a *client* that manages the actual connection
to our EdgeDB instance. See the :ref:`Client API <edgedb-js-driver>` docs for
full details.

.. code-block:: typescript-diff

    // script.ts
  + import {createClient} from "edgedb";
    import e from "./dbschema/edgeql-js";

  + const client = createClient();


If you've initialized a project, there's no need to provide connection
information to ``createClient``; it will connect to your project-linked
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
  +   const query = e.select(e.datetime_current());
  +   const result = await query.run(client);
  +   console.log(result);
  + }
  + run();

We use the ``e`` object to construct queries. The goal of the query builder is
to provide an API that is as close as possible to EdgeQL itself. So
``select datetime_current()`` becomes ``e.select(e.datetime_current()``. This
query is then executed with the ``.run()`` method which accepts a *client* as
its first input.

Run that script with the ``tsx`` like so. It should print the
current timestamp (as computed by the database).

.. code-block:: bash

  $ npx tsx script.ts
  2022-05-10T03:11:27.205Z

.. _edgedb-js-execution:


Executing expressions
---------------------

Throughout the documentation, we use the term "expression" a lot. This is a
catch-all term that refers to *any query or query fragment* you define with
the query builder. They all conform to an interface called ``Expression`` with
some common functionality.

Most importantly, any expression can be executed with the ``.run()`` method,
which accepts a ``Client`` instead as the first argument. The result is
``Promise<T>``, where ``T`` is the inferred type of the query.

.. code-block:: typescript

  import * as edgedb from "edgedb";

  const client = edgedb.createClient();

  await e.str("hello world").run(client);
  // => "hello world"

  e.set(e.int64(1), e.int64(2), e.int64(3));
  // => [1, 2, 3]

  e.select(e.Movie, ()=>({
    title: true,
    actors: { name: true }
  }));
  // => [{ title: "The Avengers", actors: [...]}]

Note that the ``.run`` method accepts an instance of :js:class:`Client` (or
``Transaction``) as it's first argument. See :ref:`Creating a Client
<edgedb-js-create-client>` for details on creating clients. The second
argument is for passing :ref:`$parameters <edgedb-js-parameters>`, more on
that later.

.. code-block:: typescript

  .run(client: Client | Transaction, params: Params): Promise<T>


Converting to EdgeQL
--------------------

You can extract an EdgeQL representation of any expression calling the
``.toEdgeQL()`` method. Below is a number of expressions and the EdgeQL they
produce. (The actual EdgeQL the create may look slightly different, but it's
equivalent.)

.. code-block:: typescript

  e.str("hello world");
  // => select "hello world"

  e.set(e.int64(1), e.int64(2), e.int64(3));
  // => select {1, 2, 3}

  e.select(e.Movie, ()=>({
    title: true,
    actors: { name: true }
  }));
  // => select Movie { title, actors: { name }}

Extracting the inferred type
----------------------------

The query builder *automatically infers* the TypeScript type that best
represents the result of a given expression. This inferred type can be
extracted with the ``$infer`` helper.

.. code-block:: typescript

  import e, {$infer} from "./dbschema/edgeql-js";

  const query = e.select(e.Movie, () => ({ id: true, title: true }));
  type result = $infer<typeof query>;
  // {id: string; title: string}[]

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

Operators
^^^^^^^^^

Note that the filter expression above uses ``e.op`` function, which is how to use *operators* like ``=``, ``>=``, ``++``, and ``and``.

.. code-block:: typescript

  // prefix (unary) operators
  e.op('not', e.bool(true));      // not true
  e.op('exists', e.set('hi'));    // exists {'hi'}

  // infix (binary) operators
  e.op(e.int64(2), '+', e.int64(2)); // 2 + 2
  e.op(e.str('Hello '), '++', e.str('World!')); // 'Hello ' ++ 'World!'

  // ternary operator (if/else)
  e.op(e.str('😄'), 'if', e.bool(true), 'else', e.str('😢'));
  // '😄' if true else '😢'

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

Compose queries
^^^^^^^^^^^^^^^

All query expressions are fully composable; this is one of the major
differentiators between this query builder and a typical ORM. For instance, we
can ``select`` an ``insert`` query in order to fetch properties of the object
we just inserted.

.. code-block:: typescript

  const newMovie = e.insert(e.Movie, {
    title: "Iron Man",
    release_year: 2008
  });

  const query = e.select(newMovie, ()=>({
    title: true,
    release_year: true,
    num_actors: e.count(newMovie.actors)
  }));

  const result = await query.run(client);
  // {title: string; release_year: number; num_actors: number}

Or we can use subqueries inside mutations.

.. code-block:: typescript

  // select Doctor Strange
  const drStrange = e.select(e.Movie, movie => ({
    filter: e.op(movie.title, '=', "Doctor Strange")
  }));

  // select actors
  const actors = e.select(e.Person, person => ({
    filter: e.op(person.name, 'in', e.set('Benedict Cumberbatch', 'Rachel McAdams'))
  }));

  // add actors to cast of drStrange
  const query = e.update(drStrange, ()=>({
    actors: { "+=": actors }
  }));



Query parameters
^^^^^^^^^^^^^^^^

.. code-block:: typescript

  const query = e.params({
    title: e.str,
    release_year: e.int64,
  },
  ($) => {
    return e.insert(e.Movie, {
      title: $.title,
      release_year: $.release_year,
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


.. _ref_edgedbjs_globals:

Globals
^^^^^^^

Reference global variables.

.. code-block:: typescript

  e.global.user_id;
  e.default.global.user_id;  // same as above
  e.my_module.global.some_value;

